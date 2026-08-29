# NooraCare Business Logic & Workflows

**Related Documentation:** See [ENTITIES.md](./ENTITIES.md) for database schema and [DASHBOARDS.md](./DASHBOARDS.md) for UI specifications.

---

## Business Logic & Workflows

### Checkout & Order Generation (FLEXIBLE Pricing)

**Core Principle:** FLEXIBLE pricing model. Orders created with NULL price, cleaner calculates after weighing. PaymentAgreement is created for every checkout; Subscription is only created for recurring orders.

**Workflow:**

1. **Customer Checkout:**
   - Customer selects frequency (weekly, biweekly, monthly for recurring; on_demand for one-time)
   - Selects preferences (needs_ironing)
   - Provides service address and first pickup date
   - **Optionally enters a promo code** (validated inline, then re-validated server-side at checkout). On success the locked discount snapshot is stored in `payment_agreements.provider_metadata.promo`. See [Promo Codes & Discounts](#promo-codes--discounts).
   - System creates:
     - **PaymentAgreement** (always): `status = 'pending'`, linked to Vipps agreement
     - **Subscription** (recurring only): `status = 'pending_payment'`, `payment_agreement_id` set, `order_defaults` populated
     - For one-time orders: `order_defaults` stored in `payment_agreements.provider_metadata`
   - Vipps recurring agreement created (no initial charge)

2. **Agreement Activation Triggers First Order** (via `agreement-activated` webhook):
   - When customer approves Vipps agreement:
     - Activate PaymentAgreement: `status = 'active'`, `activated_at = now()`
     - **If subscription exists (recurring):**
       - Set subscription `status = 'active'`, `started_at = now()`
       - Read `order_defaults` from subscription
     - **If no subscription (one-time):**
       - Read `order_defaults` from `payment_agreements.provider_metadata`
     - Generate **first order** with:
       - Pickup date from `order_defaults.first_pickup_date`
       - Delivery date = pickup + 2 days
       - `total_cost_ore = NULL` (cleaner sets later)
       - Address from `order_defaults.initial_address`
       - `needs_ironing` from `order_defaults.default_needs_ironing`
       - `payment_agreement_id` set on order
       - `subscription_id` set if recurring, null if one-time
       - Status: 'pickup_scheduled' if cleaner assigned, else 'pending_assignment'
       - **If a promo was captured:** stamp the locked snapshot onto this (first) order's `promo` and insert a `promo_code_redemptions` row (idempotent). Recurring orders #2+ never receive it → **first order only**.

3. **Rolling Window Order Generation** (recurring only, triggered when order completes):
   - System maintains **1 upcoming order** at all times
   - When order transitions to 'completed' or 'cancelled':
     - Check if upcoming order count < 1
     - If needed, generate next order with pickup date:
       - **Weekly:** Last order date + 7 days
       - **Biweekly:** Last order date + 14 days
       - **Monthly:** Last order date + 30 days, then find next occurrence of original weekday
   - Each order created with `total_cost_ore = NULL`
   - No automatic payment charges (cleaner creates charge after weighing)

**Example (Weekly Subscription):**
```
Customer subscribes Dec 26, 2025:
- Frequency: weekly, needs_ironing: true, first_pickup_date: Jan 2, 2026 (Thu)
- Customer approves Vipps agreement → subscription activated
- System creates Order #1: Pickup Jan 2 (Thu), delivery Jan 5
- When Order #1 completes → System auto-generates Order #2: Pickup Jan 9 (Thu), delivery Jan 12
- When Order #2 completes → System auto-generates Order #3: Pickup Jan 16 (Thu), delivery Jan 19
- Pattern continues indefinitely until subscription paused/cancelled
```

**Example (Monthly Subscription):**
```
Customer subscribes Dec 26, 2025:
- Frequency: monthly, first_pickup_date: Jan 10, 2026 (Fri)
- Agreement activated → Order #1 created: Pickup Jan 10 (Fri)
- When Order #1 completes → Order #2 created: Pickup Feb 7 (Fri - first Fri after +30 days)
- When Order #2 completes → Order #3 created: Pickup Mar 7 (Fri)
```

### Order Pricing (FLEXIBLE Model)

**Core Principle:** No upfront pricing. Cleaner calculates price after weighing laundry.

**Workflow:**

1. **Order Created:** `total_cost_ore = NULL`
2. **Pickup:** Driver delivers laundry to cleaner
3. **Cleaner Weighs & Prices:**
   - Cleaner weighs laundry, records `actual_weight_kg`
   - Calculates price based on weight, ironing preference, and other factors
   - Sets `total_cost_ore` and optional `pricing_notes`
   - Records `price_calculated_at` timestamp
4. **Payment Creation:** Cleaner creates Vipps charge for the calculated amount
5. **Customer Payment:** Customer pays via Vipps for actual service provided

**Pricing Factors:**
- Actual weight (primary factor)
- Ironing service (boolean)
- Special handling requirements
- Cleaner's individual pricing model

**Note:** No fixed plan prices - fully flexible based on actual laundry volume and services.

### Promo Codes & Discounts

**Core Principle:** Codes are **shared** (one code, many customers) but redeemable **once per customer**. A discount applies to the **first order** of an agreement only, and is **platform-absorbed** (the cleaner is paid 70% of the full service price; only the customer's charge is reduced).

**Discount types:** `percentage` (with optional `max_discount_ore` cap) or `fixed` (øre). See [PromoCode](./ENTITIES.md#promocode).

**Why "capture → lock → apply":** With FLEXIBLE pricing there is no price at checkout, so a code cannot reduce a cart total. Instead:

1. **Capture (checkout):** Customer enters a code; it is validated (exists → active → within validity window → global cap not reached → not already redeemed by this customer) and a snapshot of the discount terms is **locked** into `payment_agreements.provider_metadata.promo`. Locking means the deal is honored even if the code is later changed or deactivated.
2. **Stamp + redeem (agreement activated):** The snapshot is copied onto the first order's `promo`, and a `promo_code_redemptions` row is inserted. Recording here (not at checkout) means abandoned checkouts don't consume a customer's single use; the `UNIQUE(promo_code_id, customer_id)` constraint makes it idempotent on webhook retries.
3. **Apply (cleaner prices the order):** The cleaner calculates the full service price as usual. The discount is then computed against that total and written back: `total_cost_ore = full_total − discount_ore`, with `discount_ore` saved into `orders.promo`.

**Interaction with the order minimum:** The 500 kr minimum is the floor on the **service price** the cleaner calculates. The promo discount comes off **after** the minimum, so the **amount charged can fall below 500 kr**.

**Edge cases:**
- Discount is clamped to `[0, total]` — the charge is never negative.
- A fully-discounted order (`total_cost_ore = 0`) is completed **without** a Vipps charge (Vipps cannot charge 0).
- A code deactivated/expired *after* checkout is still honored (terms are locked at checkout).

**Known MVP limitation:** Two simultaneous in-flight checkouts with the same code could both get it stamped before either activates; only one redemption row survives the unique constraint. No reservation logic is built for this (low risk).

**Enforcement summary:**
- *Once per customer* → `UNIQUE(promo_code_id, customer_id)` on the ledger + a checkout lookup
- *Global cap* (`max_redemptions`) → count of ledger rows for the code, checked at validation

### Cleaner Assignment & Matching

**City-Based Matching (MVP):**

Assignment happens at subscription creation.

1. When subscription is created, system assigns a cleaner to `order_defaults.default_cleaner_id`
2. System uses `order_defaults.location_city` (must be 'Bergen' or 'Oslo')
3. Find available cleaners:
   - `Cleaner.base_city` matches location_city
   - `Cleaner.verification_status = 'approved'`
   - `Cleaner.is_accepting_orders = true`
   - `Cleaner.weekly_schedule` includes the pickup weekday
   - Not in `Order.declined_by_cleaner_ids` (for reassignments)

4. Once matched, all orders generated from this subscription inherit the default cleaner
5. Orders are created with `status = 'pickup_scheduled'` (cleaner already assigned)

**Edge Case - No Available Cleaners:** If no cleaner matches the criteria, orders are created with `status = 'pending_assignment'` for manual admin resolution via admin dashboard.

**Reassignment Flow:** If a cleaner declines or becomes unavailable:
1. Add cleaner to `Order.declined_by_cleaner_ids`
2. Find next available cleaner using matching criteria
3. Update `Order.cleaner_id` and `Order.assigned_at`
4. Status changes to `pickup_scheduled`

### Order Number Format

**Format:** `XXXXXX` (6-character random alphanumeric)

**Character Set:** `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (32 characters)
- Excludes confusing characters: 0/O, 1/I/L

**Examples:** `A7K2X9`, `P3M8NV`, `K2X9HJ`

**Generation Rules:**
- Randomly generated on order creation
- Collision checking required before saving
- Total combinations: 32^6 = 1+ billion (sufficient for platform scale)

**Benefits:**
- Easy to communicate verbally
- Doesn't reveal business volume or creation date
- Professional appearance

### Pickup/Delivery Operations (MVP)

**Complete Order Workflow:**

1. `pickup_scheduled` → `picked_up`
   - **Who:** Admin/Driver
   - **Action:** Picks up laundry from customer
   - **Timestamp:** `picked_up_at`

2. `picked_up` → `in_cleaning`
   - **Who:** Admin/Driver
   - **Action:** Delivers laundry to cleaner
   - **Timestamp:** `in_cleaning_at`

3. `in_cleaning` → `ready_for_delivery`
   - **Who:** Cleaner
   - **Action:** Marks laundry as cleaned and ready
   - **Timestamp:** `ready_for_delivery_at`
   - **Guard + charge:** rejected until wash details are registered (`wash_loads > 0`) and the price is set (`total_cost_ore`). Confirming this step **creates the Vipps charge** — the customer pays when the laundry is finished, not at delivery.

4. `ready_for_delivery` → `out_for_delivery`
   - **Who:** Admin/Driver
   - **Action:** Collects clean laundry from cleaner
   - **Timestamp:** `out_for_delivery_at`

5. `out_for_delivery` → `completed`
   - **Who:** Admin/Driver
   - **Action:** Delivers clean laundry to customer
   - **Timestamp:** `completed_at`

Drivers work from the driver dashboard (`/dashboard/driver`, one fixed city per driver profile; admins can cover any city), which builds an optimized route of these legs; steps 1–2 and 4–5 are the driver's, step 3 is the cleaner's. An order enters the driver's collection route the moment the cleaner marks it ready — `delivery_date` is an estimate shown to the customer, never a gate or deadline; finishing earlier than the estimate is desirable. Completing step 5 stamps `delivery_date` to the actual delivery date.

**Dashboard Specifications:** See [DASHBOARDS.md](./DASHBOARDS.md) for Admin Driver Dashboard, Cleaner Dashboard, and other role-based UI specifications.

### Cancellation

**Core Principle:** Whether something can be cancelled is decided by pickup status, not by a fixed calendar cutoff (except one explicit exception below): once a cleaner physically holds the laundry, that order always completes and is charged normally — cancellation can never orphan laundry mid-service or leave a cleaner unable to be paid for work already started.

There are two independent, customer-initiated cancellation actions, plus a Vipps-initiated one:

**1. Order Cancellation (single order):**
- Entry: order details page → `/orders/[orderId]/cancel`. Action: `cancelOrderAction` (`app/orders/actions.ts`).
- Allowed only for orders not yet picked up (`pending_assignment`, `pickup_scheduled`) **and** only when the scheduled pickup is more than 24 hours away. `CancelOrderButton` hides the option and shows a notice once inside that window; the action re-validates both conditions server-side.
- If the order belongs to a subscription, the customer picks one of two options at confirmation:
  - **Cancel this order only** — the order is cancelled; if the subscription is still `active`, the rolling window immediately generates a replacement upcoming order (`checkAndGenerateNextOrders`), so the subscription keeps going.
  - **Cancel the subscription** — hands off to subscription cancellation (below) instead.
- A one-time order (no subscription) just cancels, with nothing further to reconcile.

**2. Subscription Cancellation:**
- Entry: dashboard subscription strip → `/dashboard/subscription` (details) → `/dashboard/subscription/cancel` (confirmation) → success page. Action: `cancelSubscriptionAction` (`app/dashboard/subscription/actions.ts`).
- Allowed for `pending_payment` or `active` subscriptions.
- **No 24-hour exception here** — unlike single-order cancellation, whether an order is cancelled is decided purely by its status:

  | Order status at cancel time | Outcome |
  |---|---|
  | `pending_assignment` / `pickup_scheduled` (not yet picked up) | Cancelled immediately, regardless of how close the pickup is |
  | `picked_up` … `out_for_delivery` (in-flight) | Survives — completes and is charged normally, becoming the customer's **last** order |
  | `completed` / `cancelled` (already terminal) | Untouched either way |

- The subscription itself flips to `status = 'cancelled'` immediately in every case, which stops the rolling window from generating any further orders (`checkAndGenerateNextOrders` exits early once `status !== 'active'`).
- **Deferred Vipps agreement stop:** if an in-flight order remains after the above, the Vipps agreement is deliberately **not** stopped yet — stopping it would cause the charge for that order (created when the cleaner marks it ready) to fail. Instead the agreement stays `active` until the order settles, then `stopVippsAgreementForCancelledSubscription` (`lib/payments/vipps/service.ts`) stops it. That function is a safe no-op unless the subscription is cancelled, its agreement is still active, no active orders remain, and **no Vipps charge for the subscription's orders is still pending/authorized** — stopping the agreement would cancel a pending charge — so it's called unconditionally from two places once either can be true: the `charge-captured` webhook handler and `completeDeliveredOrder` (`lib/services/complete-order.ts`), which runs it unconditionally on every delivery completion. Between them every ordering is covered: capture-before-delivery (webhook no-ops on the active order, completion stops), same-day delivery with the charge still pending (completion defers, the webhook stops after capture), and 0-total promo orders with no charge event (completion stops).
- If there's no in-flight order (nothing generated yet, or the last one already completed before cancellation), the Vipps agreement is stopped immediately as part of the same action — no deferral needed.
- Cleaner/admin side: no explicit notification is sent. A cancelled pre-pickup order simply drops out of the cleaner's mission list (`getOrdersByCleanerId` excludes `cancelled`/`completed` orders), so it disappears on its own.
- Already-completed, already-charged orders are never touched or refunded by subscription cancellation — the service was rendered, the charge stands.
- Out of MVP scope: pausing a subscription (only cancel exists), and any customer-facing cancellation reason field.

**3. Vipps-Initiated Cancellation (webhook-driven):**
- Vipps can reject, stop, or expire an agreement from its side (`recurring.agreement-rejected/stopped/expired.v1`) — e.g. the customer cancels directly in the Vipps app. The webhook handler (`app/api/webhooks/vipps/recurring/route.ts`) calls the same `cancelSubscription`/`expireSubscription` functions subscription cancellation uses, so it inherits the same order-status split above (only not-yet-picked-up orders are cancelled). It does **not** get the deferred-stop treatment, since Vipps already stopped the agreement on its own — there is nothing left to defer.
- A `stopped` event with `actor = 'MERCHANT'` is a no-op: it's the echo of a stop *we* just triggered (either branch of subscription cancellation above), not a new external cancellation.

### Date Consistency Rules

**Database Constraints:**

- `Order.delivery_date >= Order.scheduled_date` (for laundry orders)
- `Order.scheduled_date >= CURRENT_DATE`
- `Subscription.expires_at >= Subscription.started_at` (if set)
- `Subscription.next_billing_date > Subscription.started_at` (if set)

**Note:** `scheduled_date` serves as the pickup date for laundry orders. Simplified from previous two-field approach.

### Audit Trail (MVP)

**Simplified Approach:**

Instead of separate audit tables, rely on entity timestamps:

- **Orders:** `created_at`, `assigned_at`, `picked_up_at`, `in_cleaning_at`, `ready_for_delivery_at`, `out_for_delivery_at`, `completed_at`, `cancelled_at`
- **Subscriptions:** `started_at`, `paused_at`, `cancelled_at`, `expires_at`
- **Payments:** `created_at`, `authorized_at`, `captured_at`, `failed_at`, `refunded_at`

These timestamps provide sufficient audit trail for MVP compliance.

**Future:** Add dedicated audit tables (OrderStatusHistory, SubscriptionChangeHistory) if regulatory compliance requires full change tracking.

---

## Payment Processing

### Vipps FLEXIBLE Pricing Integration

**Payment Provider:** Vipps with FLEXIBLE pricing model

**API Used:**
- **Recurring API:** For creating agreements (no initial charge) and for all per-order charges. Both recurring subscriptions and one-time orders use this API — a one-time order creates an agreement with a placeholder monthly interval but no subscription.

**Core Principle:** No upfront subscription charges. Each order is priced and charged individually by cleaner.

**Checkout Flow:**

1. Customer completes checkout form
2. System creates:
   - `PaymentAgreement` with `status = 'pending'`
   - `Subscription` with `status = 'pending_payment'` and `payment_agreement_id` (recurring only)
   - For one-time: `order_defaults` stored in `payment_agreements.provider_metadata`
3. Server action creates Vipps recurring agreement **WITHOUT initial charge**
4. User redirected to Vipps app, approves agreement
5. **Webhook:** `POST /api/webhooks/vipps/recurring` receives `agreement-activated` event:
   - PaymentAgreement activated: `status = 'active'`, `activated_at = now()`
   - If subscription: activated with `status = 'active'`, `started_at = now()`
   - Cleaner assigned via matching algorithm
   - **First order generated** with `total_cost_ore = NULL`, `payment_agreement_id` set
6. Customer can track order in dashboard

**Per-Order Payment Flow (FLEXIBLE):**

1. **Order Created:** `total_cost_ore = NULL`, no payment yet
2. **Driver Picks Up:** Delivers laundry to cleaner
3. **Cleaner Weighs & Prices:**
   - Records `actual_weight_kg`
   - Calculates price based on weight, ironing, etc.
   - Sets `total_cost_ore` and `pricing_notes`
   - When the cleaner marks the order ready for delivery, a Vipps charge is created against the agreement for the calculated amount (`createChargeForCompletedOrder` — name is historical, DIRECT_CAPTURE)
4. **Webhook:** `POST /api/webhooks/vipps/recurring` receives the charge events:
   - `recurring.charge-captured.v1` → Payment status = 'captured'
   - DIRECT_CAPTURE means no separate authorize/capture step
5. **Cleaner Processes:** Cleaner completes laundry service
6. **Next Order Generated:** When the driver completes the delivery, the rolling window generates the next order (recurring only)

Charge creation on completion runs for both recurring and one-time orders. `createChargeForCompletedOrder` resolves the Vipps agreement from the subscription (recurring) or directly from `order.payment_agreement_id` (one-time).

**Agreement Lifecycle:**

- **PENDING:** User hasn't approved agreement yet
- **ACTIVE:** User approved, subscription active (can create per-order charges)
- **STOPPED:** User cancelled subscription or agreement stopped by Vipps
- **EXPIRED:** Agreement reached expiration date (if set)

**Payment States (RESERVE_CAPTURE):**

- **PENDING:** Payment created, awaiting customer action
- **AUTHORIZED:** Funds reserved (authorization successful), awaiting capture
- **CAPTURED:** Funds captured (final success state)
- **FAILED:** Payment failed (insufficient funds, card declined, etc.)
- **CANCELLED:** Payment cancelled before completion
- **REFUNDED:** Full refund issued after capture

**Webhook Endpoint:**

1. **Recurring API Webhook:** `/api/webhooks/vipps/recurring`
   - Agreement events: activated, rejected, stopped, expired
   - Charge events: captured, canceled, refunded, failed, creation-failed

**Webhook Authentication:**
- HMAC-SHA256 signature verification
- Secret: `VIPPS_WEBHOOK_SECRET` (shared) or `VIPPS_WEBHOOK_SECRET_RECURRING` override

**Key Implementation Details:**

- Vipps agreements stored in `payment_agreements.provider_agreement_id` (decoupled from subscriptions)
- Subscriptions link to payment agreements via `subscriptions.payment_agreement_id`
- Orders link to payment agreements via `orders.payment_agreement_id` (for charge resolution)
- Payment metadata stored in `payments.provider_metadata` (JSONB)
- Payment references stored in `payments.provider_reference` for webhook lookups
- Automatic capture recommended for MVP (capture immediately when authorized)
- Idempotency keys used for charge creation and capture to prevent duplicates

**Manual Payment Fallback:**

- `payment_provider = 'manual'` supported for testing and development
- Manual payments skip Vipps integration

### Payment Failure Handling

**Agreement Activation Failure:**
- Subscription remains `status = 'pending_payment'`
- No orders generated
- Customer must re-approve agreement to activate

**Per-Order Payment Failures:**
- Order remains in current status
- Payment status = `failed`
- Cleaner or admin follows up with customer
- Can retry payment or cancel order

**Agreement Stopped/Cancelled:**
- See [Cancellation](#cancellation) for the full mechanics (order-status split, deferred Vipps stop, webhook-driven vs. customer-initiated paths)
- Customer must create a new subscription to resume service — there's no "reactivate" path