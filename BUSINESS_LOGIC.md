# NooraCare Business Logic & Workflows

**Related Documentation:** See [ENTITIES.md](./ENTITIES.md) for complete database schema, entity definitions, and relationships.

---

## Business Logic & Workflows

### Subscription Creation & Order Generation (Payment-Triggered)

**Core Principle:** Orders are generated in batches when subscription payments succeed.

**Workflow:**

1. **Customer Subscribes:**
   - Customer selects plan (e.g., monthly billing, weekly pickups, one time order)
   - Selects preferences (extra_kg, needs_ironing, delicate_items_count)
   - System creates Subscription with:
     - `status = 'pending_payment'`
     - `started_at = null` (set on payment success)
     - `next_billing_date = null` (set on payment success)
   - Initial payment is processed

2. **Payment Success Triggers Order Generation:**
   - When payment status changes to `captured`:
     - If subscription is `pending_payment` (initial payment):
       - Set `started_at = now()`
       - Set `next_billing_date = started_at + 1 month`
       - Update status to `active`
     - Calculate how many orders needed for billing period
     - **Monthly billing:** Generate first 4 occurrences of `recurring_weekday` after billing_date
     - **Weekly frequency:** 4 orders per monthly billing period
     - **Biweekly frequency:** 2 orders per monthly billing period
     - Generate ALL orders for the period at once
     - All orders assigned to same cleaner (`Subscription.assigned_cleaner_id`)
     - Each order inherits subscription defaults (extra_kg, needs_ironing, etc.)
     - Pickup dates calculated from `recurring_weekday` and billing period

3. **Next Billing Cycle:**
   - On `next_billing_date`, charge customer
   - If payment succeeds, generate next batch of orders
   - Update `next_billing_date` to next period

**Example (Monthly Billing, Weekly Pickups):**
```
Customer subscribes Nov 15, 2025:
- Plan: Monthly billing (399 NOK), weekly pickups, recurring_weekday = Wednesday
- Payment succeeds Nov 15
- System creates 4 orders (first 4 Wednesdays after billing date):
  - Order 1: Pickup Nov 20 (Wed)
  - Order 2: Pickup Nov 27 (Wed)
  - Order 3: Pickup Dec 4 (Wed)
  - Order 4: Pickup Dec 11 (Wed)
- All assigned to same cleaner (e.g., cleaner_id = abc-123)
- Next billing date: Dec 15, 2025
- On Dec 15, if payment succeeds, generate next 4 orders: Dec 18, 25, Jan 1, 8
```

**Example (5-Week Month Handling):**
```
Customer billing cycle: Jan 1 to Feb 1
Recurring weekday: Wednesday
Jan Wednesdays: 1, 8, 15, 22, 29 (5 total)
System generates: First 5 orders in this case
Result: Customer get more value this time.
```

### Subscription Billing Cost Calculation

**Formula:**
```
billing_cost_ore = SubscriptionPlan.price_ore
                 + (default_needs_ironing ? PRICING.ironing_price_ore : 0)
                 + (default_delicate_items_count * PRICING.delicate_item_price_ore)
```

**Note:** `PRICING` constants are defined in `src/lib/config/pricing.ts`

**Calculation Rules:**

- `billing_cost_ore` is calculated when subscription is created based on plan price and permanent add-ons
- When customer updates permanent preferences (`default_needs_ironing`, `default_delicate_items_count`, `default_extra_kg`):
  - Changes take effect at **next billing cycle** (not immediately)
  - `billing_cost_ore` is recalculated on next billing date
  - Already-generated orders keep their original preferences and costs
  - No prorated charges or refunds for mid-cycle changes in MVP
- Preferences are permanent until customer explicitly changes them
- These preferences apply to ALL auto-generated orders in the subscription

**Auto-Generated Order Details:**

- Auto-generated orders inherit subscription's default preferences:
  - `Order.extra_kg = Subscription.default_extra_kg`
  - `Order.needs_ironing = Subscription.default_needs_ironing`
  - `Order.delicate_items_count = Subscription.default_delicate_items_count`
- All orders assigned to same cleaner (`Subscription.assigned_cleaner_id`) for consistency

**Billing Period Computation:**

Current billing period can be computed from `started_at` and `billing_period`:
- Example: If `started_at = Nov 15` and `billing_period = monthly`, and today is Dec 20
- Current period: Dec 15 to Jan 15

### One-Time Subscriptions (Pay-Per-Order)

**Description:** Subscriptions with `billing_period = 'one_time'` (e.g., "Enkeltvask" plan) work like recurring subscriptions but generate only one order.

**How It Works:**

1. Customer selects one-time plan and subscribes
2. Subscription created with:
   - `status = 'pending_payment'`
   - `billing_period = 'one_time'`
   - `started_at = null`
   - `next_billing_date = null` (no scheduled billing)
   - `assigned_cleaner_id` set via cleaner matching
3. Initial payment is processed
4. When payment succeeds:
   - Set `started_at = now()`
   - Update subscription status to `active`
   - Auto-generate 1 order with cleaner assigned
   - Payment has `payment_type = 'one_time'`
   - Payment linked to specific order via `order_id`
   - Amount = `Order.total_cost_ore`

**Key Differences from Monthly Subscriptions:**

| Monthly Subscription | One-Time Subscription |
|---------------------|----------------------|
| Billed on schedule (monthly) | Billed once per subscription |
| Auto-generates multiple orders per billing cycle | Auto-generates 1 order |
| Payment covers all orders in period | Payment covers single order |
| `next_billing_date` set | `next_billing_date` null |

### Bag Delivery Auto-Creation

**Trigger:** New subscription creation (payment success)

**Workflow:**

1. Customer completes subscription signup and payment succeeds
2. System checks `Customer.laundry_bags_count`:
   - If `= 0`: Auto-create BagDelivery before first order
   - If `> 0`: Skip bag delivery, customer already has bags

3. BagDelivery Details:
   - `bag_quantity = 1` (default)
   - `scheduled_date` = 1 day before first order pickup
   - `status = 'pending'`
   - First Order has `prerequisite_bag_delivery_id` pointing to this BagDelivery (for UI display)

4. All orders are created and assigned cleaners immediately (not blocked by bag delivery)

5. When bag delivery completed:
   - Admin marks BagDelivery as `completed`
   - System increments `Customer.laundry_bags_count` by the `BagDelivery.bag_quantity` value

**Note:** Bag delivery is scheduled 1 day before first pickup for coordination, but does not block order assignment or progression.

### Bag Inventory Management

**Customer.laundry_bags_count** tracks how many NooraCare bags the customer has.

**Increment Triggers:**

- BagDelivery marked as `completed`: `laundry_bags_count += BagDelivery.bag_quantity`

**Validation:**

- Cannot create order if `laundry_bags_count = 0` and no `prerequisite_bag_delivery_id` is set (must have bags or order them)

**Note:** While `BagDelivery.bag_quantity` supports 1-10 bags, MVP laundry operations assume 1 bag per pickup.

### Cleaner Assignment & Matching

**City-Based Matching (MVP):**

Assignment happens at order creation for all plan types (recurring and one-time).

1. When subscription is created, system assigns a cleaner to `Subscription.assigned_cleaner_id`
2. System looks up `Address.city` from customer's default address (must be 'Bergen' or 'Oslo')
3. Find available cleaners:
   - `Cleaner.base_address_id → Address.city` matches customer city
   - `Cleaner.verification_status = 'approved'`
   - `Cleaner.is_accepting_orders = true`
   - `Cleaner.weekly_schedule` includes the pickup weekday(s)
   - Not in `Order.declined_by_cleaner_ids`

4. Once matched, all orders generated from this subscription are assigned to the same cleaner
5. Orders are created with `status = 'pickup_scheduled'` (cleaner already assigned)

**Edge Case - No Available Cleaners:** If no cleaner matches the criteria, orders are created with `status = 'pending_assignment'` for manual admin resolution.

**Reassignment Flow:** If a cleaner declines or becomes unavailable:
1. Add cleaner to `Order.declined_by_cleaner_ids`
2. Find next available cleaner using matching criteria
3. Update `Order.cleaner_id` and `Order.assigned_at`

### Order Number Format

**Format:** `XXXXXX` (6-character random alphanumeric)

**Character Set:** `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (32 characters)
- Excludes confusing characters: 0/O, 1/I/L

**Examples:** `A7K2X9`, `P3M8NV`, `K2X9HJ`

**Generation Rules:**
- Randomly generated on order creation
- Collision checking required before saving
- Same format used for both Orders and BagDeliveries
- Total combinations: 32^6 = 1+ billion (sufficient for platform scale)

**Benefits:**
- Easy to communicate verbally
- Doesn't reveal business volume or creation date
- Professional appearance

### Pickup/Delivery Operations (MVP)

**Admin-Driven Process:**

1. Admin logs into platform, accesses "Driver Dashboard"
2. See list of orders for today grouped by status:
   - **Pending Pickup:** Orders with `status = 'pickup_scheduled'`
   - **Ready for Delivery:** Orders with `status = 'en_route_delivery'` or ready from cleaner

3. Admin updates statuses manually as they perform pickups/deliveries:
   - Mark `picked_up` when laundry collected
   - Mark `completed` when laundry returned to customer
   - Add photos, notes as needed

4. System timestamps (`picked_up_at`, `delivered_at`, `completed_at`) auto-set when status changes

**Future:** When Driver role is added, replace Admin with dedicated driver assignments.

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

- **Orders:** `created_at`, `assigned_at`, `picked_up_at`, `delivered_at`, `completed_at`, `cancelled_at`
- **Subscriptions:** `started_at`, `paused_at`, `cancelled_at`, `expires_at`
- **Payments:** `created_at`, `authorized_at`, `captured_at`, `failed_at`, `refunded_at`

These timestamps provide sufficient audit trail for MVP compliance.

**Future:** Add dedicated audit tables (OrderStatusHistory, SubscriptionChangeHistory) if regulatory compliance requires full change tracking.

---

## Payment Processing

### Payment Types & Amount Calculation

**Recurring Payments** (`payment_type = 'recurring'`):
- Have `subscription_id` set, `order_id` is null
- Cover all orders in the entire billing period
- Payment amount matches `Subscription.billing_cost_ore` (base plan + permanent add-ons)
- Generated on subscription creation and each billing cycle

**One-Time Payments** (`payment_type = 'one_time'`):
- Have `order_id` set, `subscription_id` is null
- Cover the full cost of a single order
- Payment amount matches `Order.total_cost_ore` (plan price + any extras for that specific order)
- Generated when customer places a one-time order

**Amount Calculation:**
- Recurring payment amount = `Subscription.billing_cost_ore`
- One-time payment amount = `Order.total_cost_ore`

### Payment Failure Handling

**Subscription Creation with Failed Payment:**
- Subscription is created with `status = 'pending_payment'`
- Payment record created with `status = 'failed'`
- No orders are generated until payment succeeds
- Customer must retry payment to activate service
- Subscription remains `pending_payment` for retry attempts
- Once payment succeeds, status transitions to `active`

**Recurring Payment Failures:**
- On billing date, attempt to charge customer
- If payment fails:
  - Payment status = `failed`
  - No new orders generated for that billing period
  - Subscription status remains `active` (grace period)
  - Customer notified to update payment method
- After retry period (defined by business policy):
  - Subscription status → `cancelled` or `paused`
  - Customer must reactivate to resume service

---

## Pricing Management

### Pricing Configuration

**Configuration Location:** `src/lib/config/pricing.ts`

**Pricing Constants:**
- `PRICING.ironing_price_ore` - Price for ironing service (in øre)
- `PRICING.delicate_item_price_ore` - Price per delicate item (in øre)
- `PRICING.vat_rate_percent` - VAT rate (25% for Norwegian MVA)

**Price Change Workflow:**

1. Update pricing constants in `src/lib/config/pricing.ts`
2. Deploy code changes
3. New subscriptions and orders use updated pricing
4. Existing subscriptions keep their locked-in `billing_cost_ore` unless explicitly recalculated

**Notes:**
- All cost calculations reference the `PRICING` config object
- Price changes are version-controlled via git
- Existing subscriptions maintain their calculated `billing_cost_ore` to honor customer agreements
