# NooraCare Business Logic & Workflows

**Related Documentation:** See [ENTITIES.md](./ENTITIES.md) for database schema and [DASHBOARDS.md](./DASHBOARDS.md) for UI specifications.

---

## Business Logic & Workflows

### Subscription Creation & Order Generation (FLEXIBLE Pricing)

**Core Principle:** FLEXIBLE pricing model with rolling window order generation. Orders created with NULL price, cleaner calculates after weighing.

**Workflow:**

1. **Customer Subscribes:**
   - Customer selects frequency (weekly, biweekly, monthly, on_demand)
   - Selects preferences (needs_ironing)
   - Provides service address and first pickup date
   - System creates Subscription with:
     - `status = 'pending_payment'`
     - `started_at = null` (set when agreement activated)
     - `order_defaults` populated with address, preferences, first_pickup_date
   - Vipps recurring agreement created (no initial charge)

2. **Agreement Activation Triggers First Order** (via `agreement-activated` webhook):
   - When customer approves Vipps agreement:
     - Set subscription `status = 'active'`
     - Set `started_at = now()`
     - Generate **first order only** with:
       - Pickup date from `order_defaults.first_pickup_date`
       - Delivery date = pickup + 3 days
       - `total_cost_ore = NULL` (cleaner sets later)
       - Address from `order_defaults.initial_address`
       - `needs_ironing` from `order_defaults.default_needs_ironing`
       - Status: 'pickup_scheduled' if cleaner assigned, else 'pending_assignment'

3. **Rolling Window Order Generation** (triggered when order completes):
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

4. `ready_for_delivery` → `out_for_delivery`
   - **Who:** Admin/Driver
   - **Action:** Collects clean laundry from cleaner
   - **Timestamp:** `out_for_delivery_at`

5. `out_for_delivery` → `completed`
   - **Who:** Admin/Driver
   - **Action:** Delivers clean laundry to customer
   - **Timestamp:** `completed_at`

**Dashboard Specifications:** See [DASHBOARDS.md](./DASHBOARDS.md) for Admin Driver Dashboard, Cleaner Dashboard, and other role-based UI specifications.

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

**APIs Used:**
- **Recurring API:** For creating recurring agreements (no initial charge)
- **ePayment API:** For per-order payments after cleaner prices the order

**Core Principle:** No upfront subscription charges. Each order is priced and charged individually by cleaner.

**Subscription Creation Flow:**

1. Customer completes subscription form
2. System creates subscription with `status = 'pending_payment'`
3. Server action creates Vipps recurring agreement **WITHOUT initial charge**
4. User redirected to Vipps app, approves agreement
5. **Webhook:** `POST /api/webhooks/vipps/recurring` receives `agreement-activated` event:
   - Subscription activated: `status = 'active'`, `started_at = now()`
   - Cleaner assigned via matching algorithm
   - **First order generated** with `total_cost_ore = NULL`
6. Customer can track order in dashboard

**Per-Order Payment Flow (FLEXIBLE):**

1. **Order Created:** `total_cost_ore = NULL`, no payment yet
2. **Driver Picks Up:** Delivers laundry to cleaner
3. **Cleaner Weighs & Prices:**
   - Records `actual_weight_kg`
   - Calculates price based on weight, ironing, etc.
   - Sets `total_cost_ore` and `pricing_notes`
   - Creates Vipps ePayment charge for calculated amount
4. **Customer Notification:** Customer notified of price, approves payment
5. **Webhook:** `POST /api/webhooks/vipps/epayment` receives payment events:
   - `payment.authorized` → Payment status = 'authorized'
   - System auto-captures funds
   - `payment.captured` → Payment status = 'captured'
6. **Cleaner Processes:** Cleaner completes laundry service
7. **Next Order Generated:** When order completes, rolling window generates next order

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

**Webhook Endpoints:**

1. **Recurring API Webhook:** `/api/webhooks/vipps/recurring`
   - Agreement events: activated, rejected, stopped, expired
   - Charge events: captured, canceled, refunded, failed (if recurring charges used)

2. **ePayment API Webhook:** `/api/webhooks/vipps/epayment`
   - Payment events: created, authorized, captured, refunded, cancelled, aborted, expired, terminated
   - Used for per-order payments in FLEXIBLE model

**Webhook Authentication:**
- HMAC-SHA256 signature verification
- Secrets: `VIPPS_WEBHOOK_SECRET` (shared) or endpoint-specific overrides
- Both webhooks use shared authentication utility

**Key Implementation Details:**

- Vipps agreements stored in `subscriptions.provider_agreement_id`
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
- Subscription status → `cancelled`
- No new orders generated
- Existing orders can be completed
- Customer must create new subscription to resume service