# NooraCare Entity Model

**Global Notes:**

- All timestamp fields (`created_at`, `updated_at`) default to `now()` unless specified otherwise
- All `updated_at` fields automatically update on every record change
- Prices are stored in øre (1/100 NOK) and include VAT

---

## Core Entities

### User

**Description:** Base authentication entity for all platform users.

**Fields:**

- `id` (uuid, PK) - Unique identifier (Supabase Auth UUID)
- `email` (string, unique, required) - User email
  - **Validation:** max 255 chars
- `phone` (string, unique, required) - Phone number
  - **Validation:** Norwegian format `+47XXXXXXXX` (8 digits after +47)
- `full_name` (string, required) - Full name
  - **Validation:** Min 2 chars, max 100 chars
- `role` (enum → [UserRole](#userrole), required) - User role
  - **Default:** `customer`
- `created_at` (timestamp) - Account creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- `last_login_at` (timestamp, nullable) - Last login timestamp
- `deleted_at` (timestamp, nullable) - Soft delete timestamp
  - **Note:** When set, user is marked as deleted but data retained for compliance
  - **Business Rule:** Anonymize PII (email → deleted_[id]@deleted.com, phone → null, full_name → "Deleted User") while preserving transactional data

**Relationships:**

- Has one Customer profile (if role = customer)
- Has one Cleaner profile (if role = cleaner)
- Has one Admin profile (if role = admin)
- Has many Addresses

**Indexes:**

- Unique: email, phone
- Index: role

---

### Customer

**Description:** Extended profile for customer users.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → [User](#1-user).id, unique, required) - Reference to User
  - **On Delete:** CASCADE
- `laundry_bags_count` (integer) - Number of laundry bags the customer has
  - **Default:** `0`
  - **Validation:** >= 0
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- `deleted_at` (timestamp, nullable) - Soft delete timestamp
  - **Note:** Set when parent User is deleted. Preserves order/payment history for accounting compliance.

**Relationships:**

- Belongs to User
- Has many Subscriptions (only one active/paused at a time)
- Has many Orders

**Indexes:**

- Unique: user_id

---

### Cleaner

**Description:** Extended profile for cleaner users.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → [User](#1-user).id, unique, required) - Reference to User
  - **On Delete:** CASCADE
- `display_name` (string, required) - Public display name
  - **Validation:** Min 2 chars, max 100 chars
- `profile_image_url` (string, nullable) - Profile/logo URL
  - **Validation:** max 500 chars
- `bio` (text, nullable) - About/bio section
  - **Validation:** Max 1000 chars
- `verification_status` (enum → [CleanerVerificationStatus](#cleanerverificationstatus), required) - Verification status
  - **Default:** `pending`
- `business_type` (enum → [CleanerBusinessType](#cleanerbusinesstype), required) - Business type
- `tax_id` (string, unique, required) - Personal number or Organization number
- `business_name` (string, nullable) - Company name
  - **Validation:** Required if `business_type = 'business'`, max 200 chars
- `business_address` (text, nullable) - Registered business address
  - **Validation:** Required if `business_type = 'business'`, max 300 chars
  - **Note:** Stored as text for MVP. Contains legal business registration address for accounting/compliance purposes.
- `bank_account` (string, required) - Norwegian bank account
  - **Validation:** 11 digits (Norwegian bank account format)
- `base_address_id` (uuid, FK → [Address](#6-address).id, required) - Base operation address
- `experience_level` (enum → [CleanerExperienceLevel](#cleanerexperiencelevel), required) - Experience level
- `languages` (string[], required) - Languages spoken
  - **Validation:** ISO 639-1 codes (e.g., `['no', 'en']`), at least 1 language
- `specializations` (enum[] → [CleanerSpecialization](#cleanerspecialization), nullable) - Clothing specializations
  - **Note:** Can select multiple specializations
- `weekly_schedule` (jsonb, required) - Weekly availability pattern
  - **Format:** `{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}`
  - **Default:** `{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}`
  - **Note:** Defines which weekdays cleaner accepts orders. Must be set before cleaner can receive order assignments.
- `is_accepting_orders` (boolean) - Whether cleaner is accepting new orders
  - **Default:** `true`
  - **Note:** Vacation mode toggle. When false, cleaner receives no new assignments.
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- `approved_at` (timestamp, nullable) - Approval timestamp
- `suspended_at` (timestamp, nullable) - Suspension timestamp
- `deleted_at` (timestamp, nullable) - Soft delete timestamp
  - **Note:** Set when parent User is deleted. Preserves order history and financial records.
  - **Business Rule:** On deletion, anonymize sensitive fields (tax_id, bank_account, business_address) while keeping operational data

**Relationships:**

- Belongs to User
- Has one base Address
- Has many Orders (assigned orders)

**Indexes:**

- Unique: user_id, tax_id
- Index: verification_status, base_address_id
- GeoIndex: base_address_id (for location-based queries)

---

### Admin

**Description:** Platform administrator profile.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, unique, required) - Reference to User
- `permissions` (string[], required) - Admin permissions
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to User

**Indexes:**

- Unique: user_id

---

### Address

**Description:** Physical addresses for pickup, delivery, and business locations.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → [User](#1-user).id, required) - Owner of address
  - **On Delete:** CASCADE
- `label` (string, nullable) - Address nickname
  - **Validation:** Max 50 chars
- `street` (string, required) - Street address
  - **Validation:** Min 3 chars, max 200 chars
- `postal_code` (string, required) - Norwegian postal code
  - **Validation:** Exactly 4 digits
- `city` (string, required) - City name
  - **Validation:** Min 2 chars, max 100 chars
  - **MVP Constraint:** Must be 'Bergen' or 'Oslo' - system only operates in these cities initially
- `country` (string) - Country
  - **Default:** `'Norway'`
  - **Validation:** Max 100 chars
- `special_instructions` (text, nullable) - Permanent access instructions
  - **Validation:** Max 500 chars
  - **Examples:** "Use side entrance", "Gate code 1234", "Ring doorbell twice"
  - **Note:** For permanent access details. One-time delivery notes go in Order.special_instructions
- `latitude` (decimal(10,8), nullable) - GPS latitude
  - **Validation:** Range -90 to 90
- `longitude` (decimal(11,8), nullable) - GPS longitude
  - **Validation:** Range -180 to 180
- `is_default` (boolean) - Default address for user
  - **Default:** `false`
  - **Rule:** Only one default address per user
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to User
- Used by many Orders (pickup/delivery)
- Used by Cleaners (base address)

**Indexes:**

- Foreign: user_id
- GeoIndex: (latitude, longitude)
- Index: postal_code, city
- Unique: (user_id) WHERE is_default = true - enforces one default address per user

---

### BagDelivery

**Description:** Delivery of NooraCare laundry bags to customers. Managed by admins via driver dashboard.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `delivery_number` (string, unique, required) - Human-readable delivery number
  - **Format:** `XXXXXX` (6-character random alphanumeric)
  - **Examples:** `'P3M8NV'`, `'K2X9HJ'`
- `customer_id` (uuid, FK → [Customer](#customer).id, required) - Customer reference
  - **On Delete:** CASCADE
- `address_id` (uuid, FK → [Address](#address).id, required) - Delivery location
- `status` (enum → [BagDeliveryStatus](#bagdeliverystatus), required) - Delivery status
  - **Default:** `pending`
- `bag_quantity` (integer, required) - Number of bags to deliver
  - **Default:** `1`
  - **Constraints:** >= 1, <= 10
- `scheduled_date` (date, required) - Scheduled delivery date
  - **Validation:** Must be >= today
- `special_instructions` (text, nullable) - One-time delivery notes
  - **Validation:** Max 500 chars
  - **Examples:** "Leave at door", "Call when arriving"
- `delivered_at` (timestamp, nullable) - Actual delivery timestamp
- `placement_photo_url` (string, nullable) - Photo of placed bags
  - **Validation:** Max 500 chars
- `cancelled_at` (timestamp, nullable) - Cancellation timestamp
- `cancellation_reason` (text, nullable) - Reason for cancellation
  - **Validation:** Required if status = `cancelled`, max 500 chars
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to Customer
- Has one Address
- Referenced by many Orders (via Order.prerequisite_bag_delivery_id)

**Indexes:**

- Unique: delivery_number
- Foreign: customer_id, address_id
- Index: status, scheduled_date
- Composite: (customer_id, created_at DESC)

---

### SubscriptionPlan

**Description:** Subscription plan templates (catalog).

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `slug` (string, unique, required) - URL-friendly identifier
  - **Validation:** Lowercase with hyphens only, max 50 chars
  - **Examples:** `'weekly-standard'`, `'monthly-premium'`, `'on-demand-basic'`
- `name` (string, required) - Norwegian name
- `description` (text, required) - Norwegian description
- `price_ore` (integer, required) - Price in øre
  - **Constraints:** >= 0
- `billing_period` (enum → [SubscriptionBillingPeriod](#subscriptionbillingperiod), required) - Billing period
- `included_kg` (integer, default: 5) - Included kg per cycle
  - **Note:** Display/marketing only - weight limits not enforced in MVP
- `features` (string[], required) - Plan features list
- `frequency` (enum → [SubscriptionFrequency](#subscriptionfrequency), required) - Pickup frequency
- `is_popular` (boolean, default: false) - Popular plan flag
- `is_active` (boolean, default: true) - Active/available flag
- `sort_order` (integer, default: 0) - Display order
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Has many Subscriptions
- Has many Orders

**Indexes:**

- Unique: slug
- Index: is_active, sort_order

---

### Subscription

**Description:** Active customer subscriptions.

**Note:** A customer can only have ONE active or paused subscription at a time.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `plan_id` (uuid, FK → SubscriptionPlan.id, required) - Plan reference
- `assigned_cleaner_id` (uuid, FK → [Cleaner](#3-cleaner).id, nullable) - Cleaner assigned to all orders in this subscription
  - **Note:** All orders generated from this subscription are assigned to the same cleaner for consistency
- `default_extra_kg` (integer, default: 0) - Permanent extra kg added to subscription
- `default_needs_ironing` (boolean, default: false) - Permanent ironing preference
- `default_delicate_items_count` (integer, default: 0) - Permanent delicate items count
- `recurring_weekday` (enum → [Weekday](#weekday), nullable) - Preferred weekday for recurring pickups based on subscription frequency
  - **Note:** For biweekly frequency, this weekday repeats every 2 weeks from `started_at`. For monthly, system generates first 4 occurrences of this weekday after billing_date.
- `status` (enum → [SubscriptionStatus](#subscriptionstatus), required) - Subscription status
  - **Default:** `pending_payment`
  - **Note:** Transitions to `active` when initial payment succeeds
- `billing_cost_ore` (integer, required) - Total billing cost in øre, calculated from plan price + permanent add-ons
  - **Constraints:** >= 0
  - **Note:** Named "billing" (not "monthly") because it applies to both monthly and one_time billing periods
- `next_billing_date` (date, nullable) - Next scheduled payment date
  - **Note:** Updated after each successful payment. For monthly billing, set to started_at + N months. Null for one_time plans (billed per order, not on schedule).
- `started_at` (timestamp, nullable) - Subscription start date
  - **Note:** Set when initial payment succeeds. Null while `status = 'pending_payment'`.
- `paused_at` (timestamp, nullable) - Pause timestamp
- `cancelled_at` (timestamp, nullable) - Cancellation timestamp
- `expires_at` (timestamp, nullable) - Expiration timestamp
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to Customer
- Belongs to SubscriptionPlan
- Assigned to Cleaner (nullable)
- Has many Orders (generated from subscription)
- Has many Payments (monthly recurring billing)

**Notes:**

- See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md#subscription-billing-cost-calculation) for `billing_cost_ore` calculation formula, recalculation rules, and billing period computation
- See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md#subscription-creation--order-generation-payment-triggered) for order generation workflow and preference inheritance rules

**Indexes:**

- Foreign: customer_id, plan_id, assigned_cleaner_id
- Index: status
- Unique: (customer_id) WHERE status IN ('pending_payment', 'active', 'paused') - enforces one active/pending subscription per customer

---

### Order

**Description:** Laundry pickup and delivery orders. Customers submit laundry, cleaners process it, and it's delivered back.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `order_number` (string, unique, required) - Human-readable order number
  - **Format:** `XXXXXX` (6-character random alphanumeric)
  - **Examples:** `'A7K2X9'`, `'P3M8NV'`
- `customer_id` (uuid, FK → [Customer](#customer).id, required) - Customer reference
  - **On Delete:** CASCADE
- `subscription_id` (uuid, FK → [Subscription](#subscription).id, nullable) - Subscription reference
  - **Note:** Set if order is part of subscription, null for one-time orders
- `plan_id` (uuid, FK → [SubscriptionPlan](#subscriptionplan).id, required) - Plan reference
- `cleaner_id` (uuid, FK → [Cleaner](#cleaner).id, nullable) - Assigned cleaner
- `status` (enum → [OrderStatus](#orderstatus), required) - Order status
  - **Default:** `pending_assignment`
- `address_id` (uuid, FK → [Address](#address).id, required) - Pickup/delivery location
- `scheduled_date` (date, required) - Scheduled pickup date
  - **Validation:** Must be >= today
  - **Note:** For MVP, Admin users handle pickup/delivery operations manually via driver dashboard
- `delivery_date` (date, required) - Scheduled/actual delivery date
  - **Validation:** Must be >= scheduled_date
- `pickup_method` (enum → [PickupMethod](#pickupmethod), required) - Pickup method
- `pickup_location_description` (text, nullable) - Detailed pickup location
  - **Validation:** Required if `pickup_method = 'other'`, max 500 chars
- `special_instructions` (text, nullable) - One-time order notes
  - **Validation:** Max 1000 chars
  - **Examples:** "Leave on porch today", "Call when arriving", "Extra dirty items"
  - **Note:** For one-time order-specific notes. Permanent access instructions are in Address.special_instructions
- `extra_kg` (integer) - Extra kg for this order
  - **Default:** `0`
  - **Constraints:** >= 0, <= 20
- `delicate_items_count` (integer) - Delicate items count
  - **Default:** `0`
  - **Constraints:** >= 0, <= 50
- `needs_ironing` (boolean) - Ironing needed
  - **Default:** `false`
- `total_cost_ore` (integer, required) - Total order cost in øre
  - **Constraints:** >= 0
  - **Calculation:** Plan price + extras (ironing, delicate items)
  - **Note:** Weight overage charges not included in MVP
- `prerequisite_bag_delivery_id` (uuid, FK → [BagDelivery](#bagdelivery).id, nullable) - Required bag delivery
  - **Note:** If customer needs bags delivered before this order can proceed
  - **Business Rule:** Order cannot move to `pickup_scheduled` status until prerequisite bag delivery is `completed`
- `declined_by_cleaner_ids` (uuid[], nullable) - Array of cleaner IDs who declined this order
  - **Note:** Used during reassignment to prevent offering order to same cleaner again
- `assigned_at` (timestamp, nullable) - Cleaner assignment timestamp
- `picked_up_at` (timestamp, nullable) - Actual pickup timestamp
- `delivered_at` (timestamp, nullable) - Actual delivery timestamp
- `completed_at` (timestamp, nullable) - Order completion timestamp
- `cancelled_at` (timestamp, nullable) - Cancellation timestamp
- `cancellation_reason` (text, nullable) - Reason for cancellation
  - **Validation:** Required if status = `cancelled`, max 500 chars
- `mission_accepted_at` (timestamp, nullable) - When cleaner accepted the order
- `mission_declined_at` (timestamp, nullable) - When cleaner declined the order
- `mission_decline_reason` (text, nullable) - Reason for declining
  - **Validation:** Required if cleaner declines, max 500 chars
- `created_at` (timestamp) - Order creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to Customer
- Belongs to SubscriptionPlan
- Belongs to Subscription (nullable)
- Assigned to Cleaner
- Has one Address
- Has many Payments
- Has one prerequisite BagDelivery (nullable)

**Indexes:**

- Unique: order_number
- Foreign: customer_id, subscription_id, plan_id, cleaner_id, address_id, prerequisite_bag_delivery_id
- Index: status, scheduled_date
- Composite: (customer_id, created_at DESC), (cleaner_id, status)

---

### Payment

**Description:** Payment transaction records. Subscriptions generate monthly recurring payments that cover all included orders. One-time plans create a single payment per order.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `order_id` (uuid, FK → Order.id, nullable) - Order reference (for one-time plan orders only)
- `subscription_id` (uuid, FK → Subscription.id, nullable) - Subscription reference (for monthly billing)
- `payment_type` (enum, required) - Type: `recurring`, `one_time`, `refund`
- `amount_ore` (integer, required) - Amount in øre
  - **Constraints:** >= 0
- `status` (enum, required) - Status: `pending`, `authorized`, `captured`, `failed`, `refunded`, `cancelled`
- `payment_provider` (enum, required) - Provider: `vipps`, `stripe`, `manual`
- `provider_payment_id` (string, nullable) - External payment ID
- `provider_metadata` (jsonb, nullable) - Provider response data
- `authorized_at` (timestamp, nullable) - Authorization timestamp
- `captured_at` (timestamp, nullable) - Capture timestamp
- `failed_at` (timestamp, nullable) - Failure timestamp
- `failure_reason` (text, nullable) - Failure reason
- `refunded_at` (timestamp, nullable) - Refund timestamp
- `refund_amount_ore` (integer, nullable) - Refund amount in øre
  - **Constraints:** >= 0
- `refund_reason` (text, nullable) - Refund reason
- `created_at` (timestamp) - Payment creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to Customer
- Belongs to Order (nullable, for one-time plan orders)
- Belongs to Subscription (nullable, for monthly subscription billing)

**Notes:**

- See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md#payment-types--amount-calculation) for payment type rules and amount calculation formulas

**Indexes:**

- Unique: provider_payment_id
- Foreign: customer_id, order_id, subscription_id
- Index: status, payment_provider, payment_type, created_at
- Composite: (customer_id, created_at DESC), (subscription_id, created_at DESC)

---

**Note:** For MVP, email/SMS notifications are tracked via provider audit logs (SendGrid, Twilio, etc.) - no database storage needed.

---

## Enums

### UserRole

- `customer`
- `cleaner`
- `admin`

### CleanerVerificationStatus

- `pending` - Application submitted, awaiting review
- `approved` - Verified and active
- `rejected` - Application rejected
- `suspended` - Temporarily suspended

### CleanerBusinessType

- `individual` - Private individual
- `business` - Registered company

### CleanerExperienceLevel

- `beginner` - New to cleaning
- `some` - 1-2 years
- `experienced` - 3-5 years
- `expert` - 5+ years
- `professional` - Professional cleaning business

### CleanerSpecialization

- `wool` - Wool clothing
- `silk` - Silk garments
- `down` - Down jackets and bedding
- `sportswear` - Athletic and performance wear
- `leather` - Leather and suede items
- `delicate` - General delicate fabrics
- `formal` - Suits and formal wear
- `outerwear` - Coats and heavy outerwear

### SubscriptionBillingPeriod

- `monthly` - Charged monthly (recurring billing on billing_date each month)
- `one_time` - Pay-per-order (customer is billed each time they place an order, e.g., "Enkeltvask" plan)

### SubscriptionStatus

- `pending_payment` - Awaiting initial payment confirmation
- `active` - Subscription is active and generating orders
- `paused` - Temporarily paused by customer
- `cancelled` - Cancelled by customer or admin
- `expired` - Subscription period has ended

### SubscriptionFrequency

- `weekly` - Every week
- `biweekly` - Every 2 weeks
- `monthly` - Every month
- `on_demand` - As requested

### Weekday

- `monday`
- `tuesday`
- `wednesday`
- `thursday`
- `friday`
- `saturday`
- `sunday`

### PickupMethod

- `home` - Customer is home (knock on door)
- `entrance` - Leave outside entrance
- `other` - Custom location (requires description)

### BagDeliveryStatus

- `pending` - Awaiting scheduling
- `scheduled` - Delivery date set
- `en_route` - Driver heading to deliver
- `delivered` - Bags delivered to customer
- `completed` - Delivery confirmed, customer bag count updated
- `cancelled` - Delivery cancelled

### OrderStatus

- `pending_assignment` - Waiting for cleaner assignment
- `assigned` - Cleaner assigned
- `pickup_scheduled` - Pickup scheduled
- `en_route_pickup` - Driver heading to pick up laundry
- `picked_up` - Laundry picked up from customer
- `en_route_delivery` - Heading to deliver clean laundry
- `delivered` - Clean laundry delivered to customer
- `completed` - Order completed (final state)
- `cancelled` - Order cancelled (final state)

---

## Database Constraints & Validation

### Database-Level Constraints (Enforced by PostgreSQL)

**CHECK Constraints:**
- `Payment`: `(order_id IS NOT NULL) != (subscription_id IS NOT NULL)` - Payment must have EITHER order_id OR subscription_id, not both, not neither (XOR)
- `Order`: `delivery_date >= scheduled_date` - Delivery cannot be before pickup
- `Subscription`: `expires_at >= started_at` - Expiration must be after start date (if set)
- `Subscription`: `next_billing_date > started_at` - Next billing must be after start date (if set)

**Unique Partial Indexes:**
- `Address`: `(user_id) WHERE is_default = true` - Only one default address per user
- `Subscription`: `(customer_id) WHERE status IN ('pending_payment', 'active', 'paused')` - Only one active/pending subscription per customer

**Foreign Key Cascades:**
- `Customer.user_id` → `User.id` (ON DELETE CASCADE)
- `Cleaner.user_id` → `User.id` (ON DELETE CASCADE)
- `Address.user_id` → `User.id` (ON DELETE CASCADE)
- `BagDelivery.customer_id` → `Customer.id` (ON DELETE CASCADE)
- `Order.customer_id` → `Customer.id` (ON DELETE CASCADE)

### Application-Level Validation (Enforced by Code)

**Business Rules:**
- Cannot create order if `Customer.laundry_bags_count = 0` and no `prerequisite_bag_delivery_id` is set (must have bags or order them)
- Order cannot move to `pickup_scheduled` status until `prerequisite_bag_delivery_id` (if set) is completed
- Orders cannot be assigned to cleaner with `weekly_schedule` that doesn't include the pickup weekday
- Orders cannot be assigned to cleaner with `verification_status != 'approved'`
- Cleaner cannot receive assignments if `is_accepting_orders = false`
- `business_name` and `business_address` required if `Cleaner.business_type = 'business'`
- `pickup_location_description` required if `Order.pickup_method = 'other'`
- Order number must be unique and follow format `XXXXXX` (6-character random alphanumeric)
- BagDelivery delivery_number must be unique and follow format `XXXXXX` (6-character random alphanumeric)

---

## Security & Privacy

- **RLS Policies:** Customers see own data only; cleaners see assigned orders only; admins have full access
- **Driver Role (MVP):** Admins access driver dashboard to perform pickup/delivery operations

---

## Related Documentation

**Business Logic & Workflows:** See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) for application workflows, operational rules, and business process definitions.