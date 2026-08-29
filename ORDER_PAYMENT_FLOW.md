# Order Execution & Payment Flow

End-to-end reference for how an order is created, paid for, executed by a cleaner, and charged. Covers both **recurring subscriptions** and **one-time orders**, the **Vipps** integration, **webhooks**, and the **rolling-window** order generator.

> Companion docs: `ENTITIES.md` (schema), `BUSINESS_LOGIC.md` (rules), `DASHBOARDS.md` (UI), `ENVIRONMENTS.md` (env setup). This doc is the operational "how it runs" view.

---

## 1. Core concepts

- **PaymentAgreement** — A Vipps agreement (FLEXIBLE pricing). Decoupled from subscriptions. Tracks the Vipps agreement lifecycle (`pending → active → stopped/expired`). For one-time orders it also carries `provider_metadata.order_defaults` (since there is no subscription to hold them).
- **Subscription** — Only exists for recurring orders. Links to a `PaymentAgreement` via `payment_agreement_id`. Holds `order_defaults` (address, cleaner, ironing, instructions, `first_pickup_date`, `location_city`).
- **Order** — A single pickup→clean→deliver job. `total_cost_ore` is **NULL until the cleaner sets the price** after pickup/weighing.
- **Payment** — One charge attempt against a Vipps agreement. `provider_reference` is the Vipps charge id / merchant ref used for webhook lookups.
- **Rolling window** — At most **1 upcoming order** is kept alive per active subscription. The next order is generated just-in-time when the current one completes. No batch generation.

### Capture mode (important)

The **active** flow uses **`DIRECT_CAPTURE`** — charges capture immediately, no separate capture step.
- Active clients: `lib/payments/vipps/recurring-client.ts`, `base-client.ts`, `service.ts`.
- The old `RESERVE_CAPTURE` client (`lib/payments/vipps/client.ts`) has been **deleted** (it was unused dead code). The active client is `recurring-client.ts`.

---

## 2. Status enums (`src/types/database.ts`)

```
PaymentAgreementStatus  pending | active | stopped | expired
SubscriptionStatus      pending_payment | active | paused | cancelled | expired
SubscriptionFrequency   weekly | biweekly | monthly | on_demand
OrderStatus             pending_assignment | pickup_scheduled | picked_up | in_cleaning
                        | ready_for_delivery | out_for_delivery | completed | cancelled
PaymentStatus           pending | authorized | captured | failed | refunded | cancelled
PaymentType             recurring | one_time | refund
```

---

## 3. Checkout — creating the agreement

Entry point: `createSubscriptionAction(input)` in `src/app/orders/actions.ts`.

Flow:
1. Resolve authenticated user → customer record.
2. Determine frequency (`on_demand` for single orders) and guard against an existing active subscription.
3. `createVippsAgreement()` (`lib/payments/vipps/service.ts`) → creates a Vipps FLEXIBLE agreement, `merchantRedirectUrl = /orders/success`. Frequency maps to Vipps interval (`weekly→WEEK:1`, `biweekly→WEEK:2`, `monthly→MONTH:1`).
4. Insert `PaymentAgreement` (status `pending`).
   - **One-time:** store `order_defaults` in `provider_metadata` (no subscription created).
   - **Recurring:** insert `Subscription` (status `pending_payment`) linked to the PaymentAgreement, with `order_defaults`.
5. Return Vipps checkout `redirectUrl` → user approves in the Vipps app.

Test helper: `forceAcceptAgreementAction(agreementId)` (`actions.ts`) force-accepts via whitelisted phone numbers (test env only) and polls for activation.

Pre-pickup edit actions (all in `app/orders/actions.ts`): `updateOrderSpecialInstructionsAction`, `updateOrderIroningAction`, `updateOrderAddressAction`, `cancelOrderAction`, `updateOrderPickupDateAction` (smart cleaner reassignment).

---

## 4. Activation — webhook turns approval into an order

Handler: `POST src/app/api/webhooks/vipps/recurring/route.ts`. HMAC-SHA256 verified (`lib/payments/vipps/webhook-auth.ts`).

### Agreement events
| Event | Handler | Effect |
|---|---|---|
| `recurring.agreement-activated.v1` | `handleAgreementActivated` | **Activates** PaymentAgreement. If linked Subscription → `handleSubscriptionActivation` (activate sub + `generateFirstOrder`). If no subscription (one-time) → `handleOneTimeOrderCreation` (order from `provider_metadata.order_defaults`). |
| `recurring.agreement-rejected.v1` | `handleAgreementRejected` | Stop PaymentAgreement, cancel linked Subscription. |
| `recurring.agreement-stopped.v1` | `handleAgreementStopped` | If actor `MERCHANT`: skip (already handled in-app). Else stop agreement + cancel subscription. RESERVED charges are **not** auto-cancelled. |
| `recurring.agreement-expired.v1` | `handleAgreementExpired` | Expire PaymentAgreement + Subscription. |

`generateFirstOrder`: validates `first_pickup_date` from `order_defaults`, creates Order (`pickup_scheduled` if a cleaner is assigned, else `pending_assignment`), sets `delivery_date = pickup_date + DAYS_PICKUP_TO_DELIVERY` (2 days).

---

## 5. Execution — driver moves the laundry, cleaner washes and prices

Driver actions: `src/app/dashboard/driver/actions.ts`. Cleaner actions: `src/app/dashboard/cleaner/actions.ts`.

1. **Driver legs** (`completeDriverStopAction`, status-guarded via `updateOrderStatusGuarded` in `lib/database/orders.ts`, each stamping its timestamp column): `pickup_scheduled → picked_up` (pickup at customer) → `picked_up → in_cleaning` (drop-off at cleaner) → `ready_for_delivery → out_for_delivery` (collect at cleaner — available the moment the cleaner marks ready; `delivery_date` is an estimate, never a gate) → `out_for_delivery → completed` (delivery at customer). All but the final leg can be reversed with `undoDriverStopAction`.
2. **Set price (cleaner):** `saveLaundryDetails(orderId, details, notes)` — cleaner enters `wash_loads`, `ironing_details`; `calculateOrderPrice()` computes the total; persisted via `updateOrderLaundryDetails` → sets `total_cost_ore`. Only allowed while the order is `in_cleaning` — marking it ready charges the customer at the saved total, so the price is locked from then on.
3. **Ready + CHARGE (cleaner):** `markOrderReadyForDelivery(orderId)` — the cleaner's only status transition (`in_cleaning → ready_for_delivery`); rejected until `wash_loads > 0` and `total_cost_ore` is set. After the guarded transition it calls `createChargeForCompletedOrder(orderId, total_cost_ore, "NooraCare vask #<order_number>")` (`service.ts` — name is historical) → creates a Vipps charge (due **+1 day**, retryDays 3, **DIRECT_CAPTURE**) and a `Payment` (status `pending`) with `provider_reference` + charge metadata. Runs for **both** recurring and one-time orders. A 0-total order (100% promo) skips the charge. The from-status guard means a double-tap can never charge twice; a charge failure is logged, not fatal (manual retry). Price edits are locked from this point (`saveLaundryDetails` requires `in_cleaning`). *(Note: the doc's current §5 says the charge is due "+2 days" — that was already wrong; `service.ts` sets due to +1 day. Correct it in this rewrite.)*
4. **Delivery completion (driver):** the `customer_delivery` branch of `completeDriverStopAction` calls `completeDeliveredOrder(orderId)` (`lib/services/complete-order.ts`) — no money involved:
   - Guarded update `out_for_delivery → completed`, stamping the **actual** `delivery_date` in the same write.
   - Triggers `checkAndGenerateNextOrders()` (rolling window).
   - Runs `stopVippsAgreementForCancelledSubscription` unconditionally (safe no-op). The function refuses while any Vipps charge for the subscription is still pending/authorized — stopping would cancel it — so on a same-day delivery it defers and the charge-captured webhook re-triggers it once the charge settles; when the charge captured before delivery (webhook no-op'd on the active order), completion performs the stop; a 0-total promo order (no charge event ever) stops here too.

`declineCleanerOrder(orderId)` (`cleaner/actions.ts`) resets the order to `pending_assignment` and appends the cleaner to `declined_by_cleaner_ids` so they aren't reassigned.

---

## 6. Charge settlement — webhooks update the payment

### Recurring charge events (`recurring/route.ts`)
| Event | Handler | Effect |
|---|---|---|
| `recurring.charge-reserved.v1` | — | **Not handled** (DIRECT_CAPTURE emits charge-captured instead). |
| `recurring.charge-captured.v1` | `handleChargeCaptured` | Payment → `captured`. No order generation here (orders are pre-generated on activation / completion). |
| `recurring.charge-canceled.v1` | `handleChargeCanceled` | Payment metadata CANCELLED. |
| `recurring.charge-refunded.v1` | `handleChargeRefunded` | Payment metadata REFUNDED. (TODO: reverse sub/order.) |
| `recurring.charge-failed.v1` | `handleChargeFailed` | Payment → `failed` + reason/code. (TODO: notify + retry.) |
| `recurring.charge-creation-failed.v1` | `handleChargeCreationFailed` | Log only. (TODO: admin notify.) |

> **Note:** All charges — for both recurring and one-time orders — flow through the Recurring API agreement and these `recurring.charge-*` events. There is no separate one-time payment API in use.

---

## 7. Rolling-window order generation

`checkAndGenerateNextOrders(subscriptionId)` — `src/lib/services/order-generation.ts`. Called when an order completes.

1. Load subscription; abort unless status `active`.
2. Count upcoming (non-completed, non-cancelled) orders. If `>= 1`, return (window already full).
3. Take the last scheduled order, compute next pickup date by frequency:
   - weekly `+7d`, biweekly `+14d`, monthly `+30d` then snap to the original weekday, `on_demand` → return.
4. Dedup against the computed date, then create the Order from `subscription.order_defaults` (address, cleaner, ironing, instructions).

---

## 8. Database layer (signatures)

**`lib/database/payment-agreements.ts`** — `createPaymentAgreement`, `getPaymentAgreementById`, `getPaymentAgreementByProviderId` (Vipps id lookup), `getPaymentAgreementsByCustomerId`, `activatePaymentAgreement`, `stopPaymentAgreement`, `expirePaymentAgreement`, `getSubscriptionByPaymentAgreementId`.

**`lib/database/subscriptions.ts`** — `createSubscription` (status `pending_payment`), `getSubscriptionById`, `getActiveSubscriptionByCustomerId`, `activateSubscriptionOnAgreementActivation`, `updateSubscription`, `cancelSubscription` (also cancels its orders), `expireSubscription`.

**`lib/database/orders.ts`** — `createOrder` (unique order_number; status from cleaner presence), `getOrderById`, `assignCleanerToOrder`, `updateOrderStatus` (stamps timestamps), `getUpcomingOrdersByCustomerId`, `getCompletedOrdersByCustomerId`, `updateOrderPricing`, `getOrdersByCleanerId`, `declineOrder`, `updateOrderLaundryDetails`, `cancelOrdersBySubscriptionId`.

**`lib/database/payments.ts`** — `createPayment`, `updatePayment`, `updatePaymentWithMetadata`, `authorizePayment`, `capturePaymentWithMetadata`, `failPaymentWithMetadata`, `getPaymentByReference`.

---

## 9. Vipps clients

- **`base-client.ts`** — `VippsBaseClient`: OAuth `authenticate()` (token cached w/ 1-min buffer), `getCommonHeaders()`, `handleVippsError()`.
- **`recurring-client.ts`** — `VippsRecurringClient`: `listAgreements`, `createAgreement` (FLEXIBLE), `getAgreement`, `stopAgreement`, `forceAcceptAgreement` (test), `createCharge` (DIRECT_CAPTURE default), `getCharge`, `getChargeById`, `captureCharge` (RESERVE_CAPTURE only — unused), `cancelCharge`.
- **`service.ts`** — orchestration: `createVippsAgreement`, `captureVippsCharge`, `cancelVippsAgreement`, `createChargeForCompletedOrder`.
- **`config.ts`** — `validateVippsConfig`, `isVippsConfigured`, `getVippsEnvironment`, `isVippsTestEnvironment`.

---

## 10. Lifecycle summaries

**Recurring**
```
createSubscriptionAction → PaymentAgreement(pending) + Subscription(pending_payment) → Vipps checkout
  → [webhook] agreement-activated → activate both + generateFirstOrder (total_cost_ore = NULL)
  → cleaner: saveLaundryDetails (sets price) + markOrderReadyForDelivery (creates charge) → driver delivers (completeDeliveredOrder)
      → order completed → checkAndGenerateNextOrders (next order)
  → [webhook] charge-captured → Payment captured
  → repeats until paused/cancelled
```

**One-time**
```
createSubscriptionAction(isRecurring=false) → PaymentAgreement(pending, order_defaults in metadata) → Vipps checkout
  → [webhook] agreement-activated → activate agreement + handleOneTimeOrderCreation (single order)
  → cleaner prices & marks ready → createChargeForCompletedOrder (via order.payment_agreement_id) → charge captured → driver delivers (completeDeliveredOrder). No further orders.
```

---

## 11. Key file map

| Concern | File |
|---|---|
| Checkout / order edits | `src/app/orders/actions.ts` |
| Vipps orchestration | `src/lib/payments/vipps/service.ts` |
| Recurring API client | `src/lib/payments/vipps/recurring-client.ts` |
| Recurring webhooks (activation, charges) | `src/app/api/webhooks/vipps/recurring/route.ts` |
| Rolling-window generation | `src/lib/services/order-generation.ts` |
| Cleaner pricing / finish | `src/app/dashboard/cleaner/actions.ts` |
| DB CRUD | `src/lib/database/*.ts` |
| Types / enums | `src/types/database.ts` |
