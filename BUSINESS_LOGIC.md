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
   - **Chooses what happens at delivery when nobody is home** (required, step 2): «Sett tøyet utenfor døra» (`leave_at_door`) or «Annet» (`other`) — the delivery note text box appears only for «Annet» and is required there; `leave_at_door` stores no note. Stored in `order_defaults.delivery_if_absent` / `delivery_instructions` and copied onto every generated order by `buildOrderData`. The server action rejects a checkout without a valid choice
   - **Optionally enters a promo code** (validated inline, then re-validated server-side at checkout). The price summary then shows the discount as its own row and the estimate after the discount. On success the locked discount snapshot is stored in `payment_agreements.provider_metadata.promo`. See [Promo Codes & Discounts](#promo-codes--discounts).
   - **Ticks the required consent checkbox** on the confirm step: accepts `/salgsvilkar` and `/personvern`, and expressly requests that the service start within the 14-day withdrawal period, acknowledging that the right lapses once the wash is completed (angrerettloven § 22 c). The server action rejects checkouts without it (never trusts the client) and stores `{ terms_version, accepted_at, early_start_requested: true }` in `payment_agreements.provider_metadata.terms_consent`. `terms_version` is the ISO-date constant `TERMS_VERSION` (`src/lib/config/terms.ts`), which also renders the "Sist oppdatert" date on `/salgsvilkar` — bump it whenever the terms text changes.
   - System creates:
     - **PaymentAgreement** (always): `status = 'pending'`, linked to Vipps agreement
     - **Subscription** (recurring only): `status = 'pending_payment'`, `payment_agreement_id` set, `order_defaults` populated
     - For one-time orders: `order_defaults` stored in `payment_agreements.provider_metadata`
   - Vipps recurring agreement created (no initial charge)

2. **Agreement Activation Triggers First Order** (via `agreement-activated` webhook):
   - When customer approves Vipps agreement:
     - Activate PaymentAgreement: `status = 'active'`, `activated_at = now()`
     - **Idempotent:** both activations are status-guarded (`pending → active`, `pending_payment → active`) and the first order is only inserted when no order with this `payment_agreement_id` exists yet. Vipps delivers at-least-once; a duplicate delivery changes nothing (and never moves `started_at`). An activation for an agreement that is already `stopped`/`expired` in our DB (cancelled while pending) is ignored.
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
     - **Order confirmation e-mail** to the customer right after the first order is inserted (never on the duplicate-delivery branch) — see [Customer E-mails](#customer-e-mails)
     - **Staff e-mails** at the same point: «Nytt oppdrag» to the assigned cleaner (none when the order has no cleaner) and «Ny ordre» to every admin — see [Staff E-mails](#staff-e-mails)

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

### Subscription Address Changes

- Entry: dashboard header gear icon → `/dashboard/settings` ("Min konto"), or "Endre adresse" on `/dashboard/subscription`. Action: `updateSubscriptionAddressAction` (`app/dashboard/settings/actions.ts`). Only for `active` subscriptions.
- The customer edits street, postal code and pickup instructions. The city is derived from the postal code and **must equal the subscription's `order_defaults.location_city`** — a move to the other service city is rejected (the default cleaner and the current order's cleaner are city-bound); the customer cancels and reorders instead. `default_cleaner_id` is never changed here.
- The address is validated with `validateAddress` (fails open without a Maps key) and written, with its coordinates, into `order_defaults.initial_address`. Every future order inherits it through `buildOrderData` — no other code path changes.
- By default the change is also copied onto the subscription's not-yet-picked-up orders (`pending_assignment`, `pickup_scheduled`) via `updateUpcomingOrdersAddressBySubscriptionId`; the customer can opt out with a checkbox. Orders already picked up are never touched.
- Name and phone are edited on the same page (`updateContactAction` → `updateUserContact`); the password is changed from the browser with `supabase.auth.updateUser({ password })`. E-mail is read-only. Cleaners have the same two forms under «Konto» on `/dashboard/cleaner/settings`.

### Order Pricing (FLEXIBLE Model)

**Core Principle:** No upfront pricing. Cleaner calculates price after weighing laundry.

**Workflow:**

1. **Order Created:** `total_cost_ore = NULL`
2. **Pickup:** Cleaner picks up the laundry at the customer's door
3. **Cleaner Weighs & Prices:**
   - Cleaner weighs laundry, records `actual_weight_kg`
   - Calculates price based on weight, ironing preference, and other factors
   - Sets `total_cost_ore` (after any promo discount) and `cleaner_payout_ore` (the cleaner's share of the full price, before the discount) and optional `pricing_notes`
   - Records `price_calculated_at` timestamp
4. **Payment Creation:** Cleaner marks the order ready → Vipps charge for the calculated amount → "price set + receipt" e-mail to the customer (see [Customer E-mails](#customer-e-mails))
5. **Customer Payment:** Customer pays via Vipps for actual service provided

**Pricing Factors:**
- Actual weight (primary factor)
- Ironing service (boolean)
- Special handling requirements
- Cleaner's individual pricing model

**Note:** No fixed plan prices - fully flexible based on actual laundry volume and services.

**Admin price override:** on `/admin/orders/[orderId]` an admin can set or correct the price while the order is `in_cleaning` or `ready_for_delivery` — or `completed` with a price above 0 (a held or failed charge that outlived the delivery) — **and** no payment is live (`hasLivePayment` false — nothing captured, reserved or pending at Vipps). `overrideOrderPriceAction` takes the wash count and runs the cleaner's exact formula (`calculateOrderPrice` → `applyPromoDiscount` with the order's locked promo snapshot → `cleaner_payout_ore` from the full price), so the three pricing fields never diverge from a cleaner-set price. In `ready_for_delivery` and `completed` the admin then charges the corrected amount with «Belast på nytt» — saving a price never charges. Once a payment is live the price is frozen for everyone.

### Cleaner Payout

**What is owed:** `orders.cleaner_payout_ore` — stamped when the cleaner prices the order (`updateOrderLaundryDetails`), equal to `calculateOrderPrice().cleaner_payout_ore` (`PRICING.cleaner_payout_percent` of the full service price, before any platform-absorbed promo discount). It is frozen with the price when the order is marked ready, so a later change to `PRICING` never rewrites what a cleaner was promised. A payout is owed only for orders that reach `completed`. Orders can only be cancelled before pickup, so a priced order is never cancelled.

**When and how (the contract shown to cleaners):** all orders a cleaner completed (`completed_at`, Norwegian calendar month) in one month are paid together by bank transfer to `cleaners.bank_account`, on the account by the **15th of the following month**. No minimum amount. Payout is a manual bank transfer for now; the admin report that lists what to pay is a separate issue. The sentence cleaners see is `CLEANER_PAYOUT_TERMS_TEXT` in `src/lib/config/pricing.ts` (day of month in `CLEANER_PAYOUT_TERMS`), rendered unchanged on the cleaner FAQ (`payment`), the onboarding bank-account step, and the settings page. The cleaner dashboard's "Inntekt" section (`CleanerEarnings`) states the same deadline per month from `CLEANER_PAYOUT_TERMS`: the cleaner steps through months, and for each one sees the summed `cleaner_payout_ore`, the number of orders and washes, and the orders finished that month with "Din andel" (`summarizeCleanerMonth` and friends in `lib/utils/payout.ts`). Nothing records that a transfer was made, so the payout status is derived from dates only (`payoutPhase`: month running → ended, deadline ahead → deadline reached) and never says "utbetalt". The "Mva-grensen" card (`CleanerVatCard`) holds the last 12 months' payout against `VAT_REGISTRATION_THRESHOLD_ORE`; it only knows NooraCare income and says so.

### Ironing (not in the first version)

Ironing (stryking) is **not offered at launch**. The pricing model, `calculateOrderPrice`, `orders.customer_estimate` and the cleaner dashboard still carry the three ironing groups so the feature can be switched on later without a schema change, but no customer-facing surface shows it: the landing pages, the cleaner FAQ, the price calculator, the order flow (`/orders/wash`) and the customer's order edit all go through `SelectionEditor`, whose ironing section follows the `IRONING_OFFERED` flag in `lib/config/pricing.ts` (false). The same flag drives `withoutUnofferedIroning`, which zeroes ironing counts in the checkout/order-edit server actions, in the persisted order-flow store (v2 migration — browsers that saved a selection before ironing was hidden) and when an existing order's estimate is loaded for editing, so stale counts never show up in a customer's estimate. Ironing counts therefore stay 0, `needs_ironing` is always false, and the cleaner never sees ironing to register. The contact page, sales terms and privacy policy don't mention ironing either. Before ironing goes live: flip `IRONING_OFFERED`, add it back to the cleaner payout box, FAQ and the legal/contact copy, and confirm cleaners are vetted for it in onboarding.

### Subscriptions (not in the first version)

Recurring pickups (abonnement / "fast henting") are **not offered at launch** — customers place one-time orders only. The subscription model, the rolling-window order generation, the Vipps webhook handling and the `/dashboard/subscription` pages are all kept so the feature can be switched on later without a schema change. The switch is `SUBSCRIPTIONS_OFFERED` in `lib/config/subscriptions.ts` (false):

- **Server:** `createSubscriptionAction` forces the frequency to `on_demand` while the flag is false, whatever the client sends, so no `Subscription` row can be created. Every checkout follows the one-time path described above.
- **Order flow:** `/orders/pickup` hides the "Hvor ofte?" section and never saves a recurring choice; `/orders/confirm` hides the "Hyppighet" row and never sends one.
- **Customer surfaces:** the dashboard empty state, "Min konto" (the subscription address section) and the order-cancel success page show no subscription wording to a customer without a subscription.
- **Legal:** `/salgsvilkar` does not render its subscription clauses (section 7 is skipped and later sections are renumbered through `sectionNumber`), and `/personvern` does not mention handling subscriptions.
- **Admin:** the "Abonnement" card on the customer page is only rendered for a customer who has a subscription.

Surfaces that only render when a subscription row exists are deliberately untouched, so an account that already has a subscription can still see and cancel it: the dashboard subscription strip, `/dashboard/subscription` and its cancel flow, the "Kanseller abonnementet" option when cancelling an order, the cleaner's frequency badge, and the admin attention rows.

Before subscriptions go live: flip `SUBSCRIPTIONS_OFFERED`, bump `TERMS_VERSION` and the `/personvern` date (the legal text changes back), and re-run the recurring checkout and cancellation paths end to end.

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

### Pre-launch Waitlist

Before launch, `/` and `/bli-renser` collected a waitlist instead of taking orders or signups. Both pages are launched now and the form, its server action and the launch-window label are deleted; the `waitlist_signups` rows remain until the launch e-mails are sent and are deleted within six months (see [ENVIRONMENTS.md](./ENVIRONMENTS.md#launch-checklist)). The rules below still bind how those rows may be used.

**What we store:** email, audience (`customer` | `cleaner`), city (`bergen` | `oslo`), the signup time and `offer_eligible` (set by a trigger, see below) — nothing else. See [WaitlistSignup](./ENTITIES.md#waitlistsignup).

**Consent model:** no checkbox. Submitting is the consent (GDPR art. 6(1)(a)); the line under the button says exactly what it covers — "Vi sender deg én e-post når vi åpner – ingen nyhetsbrev" — and `/personvern#venteliste` states the same in full. Consequences: the waitlist may be used for **one** launch e-mail per signup (for customers inside the offer cap, that e-mail also carries the promo code) and nothing else — no newsletter, no other marketing; withdrawing consent (e-mail to post@nooracare.no) deletes the row right away; the list is never shared; every row is deleted within six months of launch. Widening the scope later needs new copy on the form *and* in the privacy statement, and does not cover rows collected under the current wording.

**What we promised on the pages:**
- *Customer offer:* the first 50 customer signups get their **first wash at half price**. The pages say this arrives as a discount code by e-mail when we open — never as an automatic discount — because it is fulfilled at launch with a promo code (percentage 50, first order only, platform-absorbed — the cleaner is still paid 70 % of the full price, see above) e-mailed inside the one launch e-mail to `WHERE offer_eligible`. A BEFORE INSERT trigger stamps `waitlist_signups.offer_eligible = true` on those rows (the cap is hard-coded as `50` in the trigger).
- *Cleaner earnings:* "minst 350 kr per oppdrag" is `CLEANER_MIN_PAYOUT_PER_ORDER_ORE` (70 % of the 500 kr order minimum, which `calculateOrderPrice` applies before the split), so it moves automatically when pricing changes. A single load (299 kr + fees = 421,30 kr) lands under the minimum, so this is also what one wash pays.
- *Cleaner FAQ:* one source, `src/app/bli-renser/faq.ts`, shown on `/bli-renser`.

### Cleaner Verification

A cleaner profile is created `pending` by onboarding (`createCleanerProfileAction`). Admins review it on `/admin/cleaners/[cleanerId]`, which shows every onboarding field (tax id and bank account masked behind a reveal), the base address with a map link, the washing machine, pickup weekdays, the application/approval/rejection dates, and the cleaner's orders with their stamped payout. The list at `/admin/cleaners` only links there — there is no approve button without the data in view.

Transitions (`src/app/admin/cleaners/actions.ts`):

- **Godkjenn** (`pending`/`rejected`/`suspended` → `approved`): sets `approved_at`, clears `suspended_at`, `rejected_at` and `rejection_reason`. Only approved cleaners are matched.
- **Avvis søknaden** (`pending` → `rejected`): requires a reason (max 500 chars) which is stored in `rejection_reason` and shown verbatim on the cleaner dashboard together with NooraCare's e-mail and phone. Offered only for pending applications.
- **Deaktiver** (`approved` → `suspended`): sets `suspended_at`; the cleaner keeps already-assigned orders but is excluded from matching, and their dashboard shows the contact details.
- **Sett på pause / Gjenoppta oppdrag**: toggles `is_accepting_orders` without changing the status (see below).

No e-mail is sent on any transition; the cleaner sees the outcome on `/dashboard/cleaner`.

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

**Edge Case - No Available Cleaners:** If no cleaner matches the criteria, orders are created with `status = 'pending_assignment'` for manual admin resolution via admin dashboard. Checkout already rejects a pickup weekday without an available cleaner, so this only happens when the last matching cleaner disappears between that check and the match (or the match query fails). The pickup date the customer chose still stands, so the order confirmation is the normal one (pickup confirmed) and only adds that we are assigning a cleaner, with no deadline. The other source of `pending_assignment` orders is a cleaner declining when no other cleaner is available (see Reassignment Flow): that sends the customer nothing and alerts every admin by e-mail. Whenever an admin assigns a cleaner to a `pending_assignment` order, the customer gets the "cleaner confirmed" e-mail with the order's current pickup date — the assignment does not check the cleaner's weekdays and never moves the date, so change the date first («Rediger») when needed; an order whose pickup date is already past gets no e-mail (see [Customer E-mails](#customer-e-mails)).

**Availability is a matching-time filter only.** `is_accepting_orders` and `weekly_schedule` are read when a cleaner is chosen — first order of a new agreement, rolling-window next order, and customer reschedule (`updateOrderPickupDateAction` keeps the current cleaner if they work on the new weekday, otherwise runs matching again and refuses the change when no cleaner is available; the cleaner side is e-mailed, see [Staff E-mails](#staff-e-mails)). A cleaner who pauses ("Tar imot nye oppdrag" off in settings, or the admin's «Sett på pause» button) or removes a weekday keeps every order already assigned to them; nothing is cancelled or reassigned. Cleaners set their weekdays in onboarding step 4 (default Mon–Fri) and change both fields on `/dashboard/cleaner/settings`.

**Reassignment Flow:** When a cleaner declines an order (only possible while it is `pickup_scheduled`):
1. The cleaner is added to `Order.declined_by_cleaner_ids` and the order drops to `pending_assignment` (one guarded write: only while that cleaner holds the order and it is not picked up)
2. Right away the system looks for the next available cleaner with the matching criteria above, excluding everyone in `declined_by_cleaner_ids`. A pickup date that is already past is never matched — an admin must set a new date first
3. **Found:** `Order.cleaner_id` and `Order.assigned_at` are set and the status returns to `pickup_scheduled` (guarded: only while the order is still `pending_assignment` without a cleaner). The new cleaner gets the «Nytt oppdrag» e-mail
4. **Not found:** the order stays `pending_assignment` and every admin immediately gets the «Ordre venter på tildeling» e-mail; an admin assigns a cleaner by hand on the order page

The customer is told nothing in either case. Only an admin assigning a `pending_assignment` order sends the customer the "cleaner confirmed" e-mail. An admin re-assignment between cleaners e-mails the new cleaner («Nytt oppdrag») and nobody else. See [Staff E-mails](#staff-e-mails).

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

**Who does the logistics:** In the first version the assigned cleaner picks up and delivers. **Pickup and delivery share one time window** (`PICKUP_TIME_RANGE` in `lib/config/pickup-times.ts`, 15:00–18:00), so the cleaner can do both in the same afternoon round («Dagens runde»). The customer is told both («Du får beskjed når tøyet er klart for levering» — channel-neutral on purpose, SMS may come): the pickup hours and «Antatt levering: <pickup date + `DAYS_PICKUP_TO_DELIVERY`>, mellom kl. 15:00 og 18:00» on order step 2, and the window next to «Estimert levering» on the order page and the dashboard card. The delivery date stays an estimate; the window is not. The cleaner sees the window on the delivery step, on delivery stops in the order list, in the FAQ and on /bli-renser. Dedicated drivers are built but dormant: `/dashboard/driver` only admits the `driver` role (admins are kept out so they can't move orders into driver-only statuses), and no UI links to it or to `/admin/drivers`. To bring drivers back: add `admin` back to the driver dashboard guards, restore the admin entry points (AdminNav pill, overview tile, «Kjøreplan» link), the onboarding «Beskjed til sjåføren» field and the driver progress steps, and rewrite the cleaner copy.

**Complete Order Workflow (cleaner-run):**

1. `pickup_scheduled` → `in_cleaning`
   - **Who:** Cleaner («Jeg har hentet tøyet»); admin fallback «Marker som hentet»
   - **Action:** Picks up laundry at the customer's door; one guarded write stamps `picked_up_at` and `in_cleaning_at`. Before the pickup date the cleaner sees a warning, but an early pickup agreed with the customer is allowed.
   - **E-mail:** the customer gets the "laundry picked up" e-mail (see [Customer E-mails](#customer-e-mails)) — non-blocking, once per order
2. `in_cleaning` → `ready_for_delivery`
   - **Who:** Cleaner («Tøyet er klart til levering» — the same confirm saves the wash count and price, then marks ready); admin fallback «Marker som klar» on the order page (exit for an order stuck in `in_cleaning` — the admin sets the price with the override first if the cleaner never did). Both go through `markOrderReadyAndCharge` in `lib/services/ready-order.ts`.
   - **Guard + charge:** rejected until wash details are registered (`wash_loads > 0`) and the price is set (`total_cost_ore`). Confirming this step **creates the Vipps charge** — the customer pays when the laundry is finished, not at delivery.
   - **Price guard:** when the order has a customer estimate and the full price before promo is more than 2 × the estimate (`PRICE_REVIEW_ESTIMATE_FACTOR`, `orderPriceNeedsReview` in `lib/config/pricing.ts`), the order still becomes `ready_for_delivery` but **no payment row, no Vipps charge and no price e-mail** are created. Every admin is e-mailed at once (`price-review/<order id>`). An admin approves the price with «Belast på nytt» (creates the charge, sends the price e-mail) or corrects it with the price override and then presses «Belast på nytt». The cleaner is told NooraCare reviews the price before the customer is charged, delivers as normal, and is paid at the usual time. Orders without an estimate and 0 kr orders are never held. The held state is derived, not stored (`isChargeHeldForPriceReview`). A held order delivered before the admin acts keeps its Vipps agreement (`stopVippsAgreementForOneTimeOrder` does not stop an unpaid completed order).
3. `ready_for_delivery` → `completed`
   - **Who:** Cleaner («Levert til kunden»); admin fallback «Marker som levert»
   - **Action:** `completeDeliveredOrder(orderId, 'ready_for_delivery')` stamps `delivery_date` to the actual date (Norwegian time), generates the next order (recurring), runs the agreement stop (the cancelled-subscription stop for a subscription order; for a one-time order `stopVippsAgreementForOneTimeOrder`, which stops the agreement when nothing is left to charge — a 0 kr total, or a charge that is already captured) and, last, sends the customer the "laundry delivered" e-mail (see [Customer E-mails](#customer-e-mails); a failed e-mail never fails the completion).

**Customer not home:** the cleaner calls the customer (phone shown on the order). On the pickup day the customer can no longer move the date in the app, so they contact us and an admin moves it (the edit form on the admin order page), which e-mails both the customer and the cleaner. Declining is only for "can't take this order" — it blacklists the cleaner for that order.

**Customer not home at delivery:** every order carries the customer's own answer (`orders.delivery_if_absent`, texts in `lib/config/delivery.ts`). The cleaner's delivery step shows it in its own box: `leave_at_door` → «Sett tøyet utenfor døra.», `other` → «Følg kundens beskjed om levering.» plus the customer's delivery note. An order without a choice (`NULL` — from before the question existed, or one that had the removed «Ring meg» choice) shows a warning to call the customer first. The customer can change the choice and the note on the order page until the order is `completed` or `cancelled` — later than every other customer edit, which locks at pickup. The pickup note is still shown on the delivery step, labelled «Kundens beskjed ved henting».

`picked_up` and `out_for_delivery` stay in the status enum for the dormant driver flow (driver: `pickup_scheduled → picked_up → in_cleaning`, `ready_for_delivery → out_for_delivery → completed`) and are never entered in the cleaner-run flow; the customer progress bar does not show them. `delivery_date` is an estimate shown to the customer, never a gate or deadline; finishing earlier than the estimate is desirable.

**Customer reschedule:** the customer can move the pickup date of a not-yet-picked-up order on `/orders/[orderId]/reschedule` until midnight (Norwegian time) at the start of the pickup day (`canReschedulePickupSelf` in `lib/config/order-timing.ts`). From the pickup day on the «Endre dato» link is hidden, the page shows a "contact us" note and `updateOrderPickupDateAction` refuses. The new date must be bookable now (`earliestPickupDate`) and at most `MAX_DAYS_AHEAD` (60) days ahead, the same limit as checkout. Admin edits are not bound by these rules.

### Cancellation

**Core Principle:** Whether something can be cancelled is decided by pickup status, not by a fixed calendar cutoff (except one explicit exception below): once a cleaner physically holds the laundry, that order always completes and is charged normally — cancellation can never orphan laundry mid-service or leave a cleaner unable to be paid for work already started.

There are two independent, customer-initiated cancellation actions, plus a Vipps-initiated one:

**1. Order Cancellation (single order):**
- Entry: order details page → `/orders/[orderId]/cancel`. Action: `cancelOrderAction` (`app/orders/actions.ts`).
- Allowed only for orders not yet picked up (`pending_assignment`, `pickup_scheduled`) **and** only until midnight (Norwegian time) at the start of the day before the pickup day — pickup on a Wednesday can be cancelled through Monday (`canCancelOrderSelf` in `lib/config/order-timing.ts`; this is the «inntil 24 timer før hentedagen» of the sales terms). While open, `CancelOrderButton` shows the last day under the link; once closed it shows when it closed and a `mailto:` link to us instead of the link. The action re-validates both conditions server-side with the same function.
- If the order belongs to a subscription, the customer picks one of two options at confirmation:
  - **Cancel this order only** — the order is cancelled; if the subscription is still `active`, the rolling window immediately generates a replacement upcoming order (`checkAndGenerateNextOrders`), so the subscription keeps going.
  - **Cancel the subscription** — hands off to subscription cancellation (below) instead.
- A one-time order (no subscription) is cancelled and its Vipps agreement is stopped right after the cancel write (`stopVippsAgreementForOneTimeOrder` in `lib/payments/vipps/service.ts`): nothing will ever be charged on it, so it should not stay in the customer's Vipps app. A failed stop is logged and never fails or undoes the cancellation; the agreement then stays `active` until someone stops it by hand in the Vipps app.
- The customer gets the "order cancelled" e-mail after the order is cancelled (see [Customer E-mails](#customer-e-mails)). It states that nothing has been charged; it does not mention the Vipps agreement (a one-time order's agreement is stopped silently, see the bullet above).

**1b. Admin Order Cancellation:**
- Entry: `/admin/orders/[orderId]` → «Kanseller ordre». Action: `cancelOrderAdminAction` (`app/admin/orders/actions.ts`).
- Same status split as the customer (only `pending_assignment` / `pickup_scheduled`), but **no 24-hour rule** — admins override for no-shows, fraud and duplicates. The write is status-guarded, so an order the cleaner picks up meanwhile is not cancelled.
- A reason is required and stored in `orders.cancellation_reason`; the customer's order page shows it ("Bestillingen ble kansellert … <reason>"), so the admin UI labels it "vises til kunden". Internal remarks go in `orders.admin_notes` instead.
- Never touches the subscription: an `active` subscription gets its replacement order immediately (`checkAndGenerateNextOrders`), exactly like "Kanseller kun denne bestillingen".
- A one-time order's Vipps agreement is stopped right after the cancel write, exactly as in the customer's cancellation (same function, same never-fail rule).
- The customer gets the same "order cancelled" e-mail, with the reason printed as «Årsak».

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
- **Deferred Vipps agreement stop:** if an in-flight order remains after the above, the Vipps agreement is deliberately **not** stopped yet — stopping it would cause the charge for that order (created when the cleaner marks it ready) to fail. Instead the agreement stays `active` until the order settles, then `stopVippsAgreementForCancelledSubscription` (`lib/payments/vipps/service.ts`) stops it. That function is a safe no-op unless the subscription is cancelled, its agreement is still active, no active orders remain, and **no Vipps charge for the subscription's orders is still pending/authorized** (orphan `pending` rows — no `provider_reference`, older than 15 min — don't count; see ENTITIES.md Payment) — stopping the agreement would cancel a pending charge — so it's called unconditionally from two places once either can be true: the `charge-captured` webhook handler and `completeDeliveredOrder` (`lib/services/complete-order.ts`), which runs it unconditionally on every delivery completion. Between them every ordering is covered: capture-before-delivery (webhook no-ops on the active order, completion stops), same-day delivery with the charge still pending (completion defers, the webhook stops after capture), and 0-total promo orders with no charge event (completion stops).
- If there's no in-flight order (nothing generated yet, or the last one already completed before cancellation), the Vipps agreement is stopped immediately as part of the same action — no deferral needed.
- Cleaner/admin side: no explicit notification is sent. A cancelled pre-pickup order simply drops out of the cleaner's mission list (`getOrdersByCleanerId` excludes `cancelled`/`completed` orders), so it disappears on its own.
- Customer side: orders cancelled by subscription cancellation (or by a Vipps-initiated stop) get no per-order cancellation e-mail; only the single-order cancel actions send one.
- Already-completed, already-charged orders are never touched or refunded by subscription cancellation — the service was rendered, the charge stands.
- Out of MVP scope: pausing a subscription (only cancel exists), and any customer-facing cancellation reason field.

**3. Vipps-Initiated Cancellation (webhook-driven):**
- Vipps can reject, stop, or expire an agreement from its side (`recurring.agreement-rejected/stopped/expired.v1`) — e.g. the customer cancels directly in the Vipps app. The webhook handler (`app/api/webhooks/vipps/recurring/route.ts`) calls the same `cancelSubscription`/`expireSubscription` functions subscription cancellation uses, so it inherits the same order-status split above (only not-yet-picked-up orders are cancelled). It does **not** get the deferred-stop treatment, since Vipps already stopped the agreement on its own — there is nothing left to defer.
- A `stopped` event with `actor = 'MERCHANT'` is a no-op: it's the echo of a stop *we* just triggered (either branch of subscription cancellation above, or the one-time agreement stop), not a new external cancellation.

### Date Consistency Rules

**Database Constraints:**

- `Order.delivery_date >= Order.scheduled_date` while the order is not `completed` (the estimate); a completed order's actual delivery date may be earlier after an early pickup
- `Order.scheduled_date >= CURRENT_DATE`
- `Subscription.expires_at >= Subscription.started_at` (if set)
- `Subscription.next_billing_date > Subscription.started_at` (if set)

**Note:** `scheduled_date` serves as the pickup date for laundry orders. Simplified from previous two-field approach.

### Audit Trail (MVP)

**Simplified Approach:**

Instead of separate audit tables, rely on entity timestamps:

- **Orders:** `created_at`, `assigned_at`, `picked_up_at`, `in_cleaning_at`, `ready_for_delivery_at`, `out_for_delivery_at`, `completed_at`, `cancelled_at`
- **Subscriptions:** `started_at`, `paused_at`, `cancelled_at`, `expires_at`
- **Payments:** `created_at`, `authorized_at`, `captured_at`, `failed_at`, `cancelled_at`, `refunded_at`

These timestamps provide sufficient audit trail for MVP compliance.

**Future:** Add dedicated audit tables (OrderStatusHistory, SubscriptionChangeHistory) if regulatory compliance requires full change tracking.

---

### Customer E-mails

Transactional only (no consent needed), Norwegian, from NooraCare (`no-reply@nooracare.no`, reply-to `post@nooracare.no`). The e-mails carry no explanatory text about estimate vs. binding price (removed on purpose): the order confirmation shows the checkout figure as an «Estimat» row, and the receipt and picked-up e-mails do not mention the estimate.

| E-mail | When | Must say |
|---|---|---|
| Order confirmation | Vipps agreement activated and the first order exists (subscription or one-time) | pickup date + address; bags / bedding sets; estimate row «Estimat: ca. X kr» (no explanation) — with a promo code: «Estimat før rabatt», «Rabatt (KODE)» and «Estimat» after the discount; subscriptions only (not in the first version): frequency, next pickup is automatic, how to cancel (`/dashboard/subscription`). If the order has no cleaner yet (`pending_assignment`): the pickup is still confirmed for the chosen date (same subject and «Dato» row); the intro adds that we are assigning a local cleaner, the customer does not need to do anything, and gets an e-mail when the cleaner is in place — never a deadline, never "the date is not confirmed" |
| Price set + receipt | Cleaner (or admin fallback) marks the order ready and the Vipps charge is created (not while the charge is held by the price guard — then the admin's «Belast på nytt» sends it); again on every admin «Belast på nytt»; also for a 0-total promo order | price lines (machines × 299 kr, pickup/delivery, service fee, minimum if applied), promo deduction, total; `pricing_notes`; "trekkes automatisk via Vipps-avtalen din i løpet av et par dager" + Vipps reference; while the order is `ready_for_delivery`/`out_for_delivery` and has a delivery choice: a «Levering» section with the customer's choice for "nobody home", their delivery note, and that it can be changed on the order page until delivery |
| Payment failed | Vipps reports `charge-failed` or `charge-creation-failed` (the payment row is marked `failed` first) | which order and amount; retry policy: delivery is unaffected, check the card/agreement in Vipps, we re-charge within a few days (admin «Belast på nytt»), we get in touch if that fails too |
| Laundry delivered | The order becomes `completed` (cleaner «Levert til kunden», admin «Marker som levert»); never on `out_for_delivery` | delivered date + address; payment line that matches the payment state — nothing charged (0 total), "er trukket" (captured) or "trekkes automatisk … i løpet av et par dager" (charge in flight), and no payment line at all when the charge failed or was never created; subscriptions only (dormant): next pickup is set up automatically, date on Min side; link to the order. No review request, no marketing |
| Laundry picked up | Cleaner taps «Jeg har hentet tøyet» (with the pickup time) or admin uses «Marker som hentet» (no time — the click is not the pickup time) | who picked it up (cleaner's display name); next: an e-mail when the price is set and one when the laundry is delivered. Never a delivery date or deadline |
| Pickup reminder | Daily at 16:00 UTC (17:00/18:00 in Oslo), for orders in `pickup_scheduled` with pickup tomorrow. Not for `pending_assignment` | "sett posen klar" before the pickup window; pickup date, window and address; the customer's own pickup and wash instructions (or that none were given); the cleaner's display name; that address, instructions and date can still be changed on the order page. Never offers cancellation (refused less than 24 hours before pickup) |
| Order cancelled | The customer cancels an order (`cancelOrderAction`) or an admin does (`cancelOrderAdminAction`), after the order is `cancelled` | which order, the cancelled pickup date and address; the admin's reason when an admin cancelled; "ingenting er trukket, og du blir ikke belastet" (a charge is only created when an order is marked ready, and only pre-pickup orders can be cancelled); nothing about the Vipps agreement (a one-time order's agreement is stopped silently); subscriptions only: the next pickup date, or that the subscription is cancelled too |
| New pickup date | The pickup date of a not-yet-picked-up order changes — by the customer (`updateOrderPickupDateAction`) or by an admin (`updateOrderDetailsAction`) | new date, previous date, address, pickup instructions; when an admin moved it: "Vi har endret hentedatoen" + reply if it does not suit |
| Cleaner confirmed | An admin assigns a cleaner to an order that is `pending_assignment` (created without a match, or left without a cleaner after a decline because no other cleaner was available) | «Renseren din er på plass»: the cleaner's display name, the pickup date (the order's date at assignment — set the date first if it must change; the pickup itself was already confirmed at ordering), address, link to the order page |

Delivery and idempotency are Resend's (idempotency key per order/payment, 24 h); nothing about e-mails is stored in the database. A failed send is logged and never fails the triggering webhook or action. No e-mail is sent for `charge-captured`, for other status changes (assignment, ready for delivery), or when charge creation fails synchronously (the admin's retry sends the price e-mail instead).


### Staff E-mails

Sent with the same transport and rules as the customer e-mails (a failed send is logged and never fails the webhook or action; nothing stored in the database).

| E-mail | To | When | Must say |
|---|---|---|---|
| «Nytt oppdrag» | The cleaner who now holds the order (`users.email`) | The first order is created with a cleaner; an admin assigns or re-assigns the order; the order is handed over automatically after another cleaner declined; a customer reschedule moved the order to this cleaner | pickup date, time window and address; the customer's pickup instructions; what the customer says they send (bags / bedding sets); button to the cleaner's order page. Never the customer's name, phone or e-mail |
| «Ny hentedato» | The cleaner who holds the order | The pickup date of their order changes — by the customer or by an admin — and they keep the order | new date, previous date, time window and address; the customer's pickup instructions; how to decline if the new date does not suit; button to the cleaner's order page. Never the customer's name, phone or e-mail |
| «Oppdraget er flyttet» | The cleaner who held the order before | The customer moved the pickup to a weekday that cleaner does not work, so the order went to another cleaner | the order number and the pickup date that no longer applies; that there is nothing to do. No address and no customer details |
| «Ny ordre» | Every admin (same recipients as the daily digest), plain text | Each new first order | order number, city, pickup date, the assigned cleaner or «ingen renser ennå», link to the admin order page |
| «Ordre venter på tildeling» | Every admin, plain text | A cleaner declined and the order could not be handed to another cleaner automatically | who declined, city, pickup date, how many cleaners have declined, link to the admin order page |

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
2. **Cleaner Picks Up:** Collects the laundry at the customer's door
3. **Cleaner Weighs & Prices:**
   - Records `actual_weight_kg`
   - Calculates price based on weight, ironing, etc.
   - Sets `total_cost_ore` and `pricing_notes`
   - When the cleaner marks the order ready for delivery, a Vipps charge is created against the agreement for the calculated amount (`createChargeForCompletedOrder` — name is historical; DIRECT_CAPTURE, `due` = the day after, `retryDays: 3`). The payment row is `pending` from here — no money has moved yet
4. **Webhook:** `POST /api/webhooks/vipps/recurring` receives the charge events:
   - `recurring.charge-captured.v1` → Payment status = 'captured'
   - DIRECT_CAPTURE means no separate capture call from our side — it does not mean instant. Vipps draws the charge on its due date (the day after creation at the earliest) and retries for 3 days; `charge-captured` arrives then, which can be before or after the laundry is delivered (delivery is not gated on capture)
5. **Cleaner Processes:** Cleaner completes laundry service
6. **Next Order Generated:** When the cleaner (or an admin) marks the order delivered, the rolling window generates the next order (recurring only)

Charge creation on completion runs for both recurring and one-time orders. `createChargeForCompletedOrder` resolves the Vipps agreement from the subscription (recurring) or directly from `order.payment_agreement_id` (one-time).

**One-time agreement stop:** a one-time order's agreement is stopped once nothing more will be charged on it — by the `charge-captured` webhook for a paid order, at delivery (`completeDeliveredOrder`) for a 0 kr order (100 % promo: no charge, so no capture webhook) or when the webhook's own stop failed, and right after the cancel write when the customer or an admin cancels the order. `stopVippsAgreementForOneTimeOrder` never stops while a charge is still pending/authorized (that would cancel the charge) and never for a delivered order whose charge failed (the admin's «Belast på nytt» needs the agreement active).

**Agreement Lifecycle:**

- **PENDING:** User hasn't approved agreement yet
- **ACTIVE:** User approved, subscription active (can create per-order charges)
- **STOPPED:** User cancelled subscription or agreement stopped by Vipps
- **EXPIRED:** Agreement reached expiration date (if set)

**Payment States:**

- **PENDING:** Payment created, awaiting customer action
- **AUTHORIZED:** Funds reserved (authorization successful), awaiting capture
- **CAPTURED:** Funds captured (final success state)
- **FAILED:** Payment failed (insufficient funds, card declined, etc.)
- **CANCELLED:** Payment cancelled before completion
- **REFUNDED:** Full refund issued after capture (a partial refund keeps CAPTURED and records `refund_amount_ore`)

**Webhook Endpoint:**

1. **Recurring API Webhook:** `/api/webhooks/vipps/recurring`
   - Agreement events: activated, rejected, stopped, expired
   - Charge events: captured, canceled, refunded, failed, creation-failed
   - Response codes: 401 bad signature; 200 for permanent conditions (unknown agreement/charge, malformed body); 500 only for transient failures (a DB write returned null, lost activation race) so Vipps retries with backoff for up to 7 days. Vipps holds back later webhooks until it gets a 200, so permanent errors must never return 5xx.

**Webhook Authentication:**
- HMAC-SHA256 signature verification
- Secret: `VIPPS_WEBHOOK_SECRET` (shared) or `VIPPS_WEBHOOK_SECRET_RECURRING` override

**Key Implementation Details:**

- Vipps agreements stored in `payment_agreements.provider_agreement_id` (decoupled from subscriptions)
- Subscriptions link to payment agreements via `subscriptions.payment_agreement_id`
- Orders link to payment agreements via `orders.payment_agreement_id` (for charge resolution)
- Payment metadata stored in `payments.provider_metadata` (JSONB)
- Payment references stored in `payments.provider_reference` for webhook lookups
- DIRECT_CAPTURE: no separate capture call. The charge is drawn on its due date (the day after creation at the earliest, retried for 3 days), not when it is created
- Idempotency keys used for charge creation and capture to prevent duplicates

**Manual Payment Fallback:**

- `payment_provider = 'manual'` supported for testing and development
- Manual payments skip Vipps integration

### Payment Failure Handling

**Agreement Activation Failure (abandoned checkout):**
- Subscription remains `status = 'pending_payment'`, no orders generated
- The dashboard shows a "betalingen ble ikke fullført" warning instead of the subscription strip
- The next recurring checkout (`createSubscriptionAction`) automatically cancels the stale `pending_payment` subscription via `cancelSubscriptionAction` (stops the old Vipps agreement best-effort) before creating the new one — required because `idx_subscriptions_one_active_per_customer` also counts `pending_payment` rows. Only an `active` subscription blocks a new recurring checkout.

**Per-Order Payment Failures:**
- If Vipps rejects the charge creation itself (when the cleaner marks the order ready), the payment row is marked `failed` with the Vipps error in `failure_reason`; the order transition still succeeds
- Order remains in current status (a charge that fails when the cleaner marks the order ready still leaves the order `ready_for_delivery`; the cleaner delivers as normal)
- Payment status = `failed` (set by `createChargeForCompletedOrder` on a Vipps error, or by the `charge-failed` / `charge-creation-failed` webhooks later). The two webhooks also send the customer the "payment failed" e-mail (see [Customer E-mails](#customer-e-mails)); the synchronous creation failure does not — the customer never saw a price for that row
- The cleaner's order page shows "Belastningen av kunden feilet. Admin følger opp betalingen" instead of "Betalingen på X kr er sendt til Vipps" (`markOrderReadyForDelivery` returns `chargeFailed: true`; the page re-derives it from the payment rows)
- Admin re-charges from `/admin/orders/[orderId]` («Belast på nytt», `retryChargeAction`): allowed when the order is `ready_for_delivery`/`out_for_delivery`/`completed`, has a price > 0, has no live payment (`hasLivePayment`: no `authorized`/`captured`/`refunded` row and no non-orphan `pending` row), and the Vipps agreement is still `active`. Each retry is a new `payments` row; the failed rows stay as history. Each successful retry sends the customer the "price set + receipt" e-mail again for the new charge.

**Agreement Stopped/Cancelled:**
- See [Cancellation](#cancellation) for the full mechanics (order-status split, deferred Vipps stop, webhook-driven vs. customer-initiated paths)
- Customer must create a new subscription to resume service — there's no "reactivate" path