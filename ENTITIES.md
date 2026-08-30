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
- Has one Driver profile (if role = driver)

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
- `base_street` (string, required) - Base operation street address
  - **Validation:** Min 3 chars, max 200 chars
- `base_postal_code` (string, required) - Base operation postal code
  - **Validation:** Exactly 4 digits
- `base_city` (string, required) - Base operation city
  - **Validation:** Min 2 chars, max 100 chars
  - **MVP Constraint:** Must be 'Bergen' or 'Oslo'
- `base_country` (string, required) - Base operation country
  - **Default:** `'Norway'`
  - **Validation:** Max 100 chars
- `base_special_instructions` (text, nullable) - Permanent access instructions for base location
  - **Validation:** Max 500 chars
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
- Has many Orders (assigned orders)

**Indexes:**

- Unique: user_id, tax_id
- Index: verification_status, base_city

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

**Note (MVP):** The application does not read or write this table — admin access is `users.role = 'admin'`, and admin accounts are managed from the admin dashboard (Administratorer section). `permissions` remains a future hook.

---

### Driver

**Description:** Minimal profile for driver users. One driver serves exactly one city; the optional start point seeds the daily route. Rows are created by admins from the admin dashboard (Sjåfører section — no self-service onboarding).

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, unique, required) - Reference to User
  - **On Delete:** CASCADE
- `city` (string, required) - The one city this driver serves
  - **MVP Constraint:** Must be 'Bergen' or 'Oslo' (app-level, like Cleaner.base_city)
- `start_latitude` (double, nullable) - Stored route start point
- `start_longitude` (double, nullable) - Stored route start point
- `start_label` (string, nullable) - Display label for the start point (e.g. "Hjemme")
  - **Note:** Ignored unless both coordinates are set; the dashboard falls back to the city centre
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to User

**Indexes:**

- Unique: user_id

---


### PaymentAgreement

**Description:** Vipps recurring agreement records, decoupled from subscriptions. Every checkout (both recurring and one-time) creates a payment agreement. Subscriptions optionally link to a payment agreement.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
  - **On Delete:** CASCADE
- `provider` (text, required) - Payment provider name
  - **Default:** `'vipps'`
- `provider_agreement_id` (text, unique, required) - Vipps recurring agreement ID
  - **Format:** `agr_*` (Vipps format)
- `status` (text, required) - Agreement status
  - **Values:** `'pending'`, `'active'`, `'stopped'`, `'expired'`
  - **Default:** `'pending'`
- `provider_metadata` (jsonb, nullable) - Provider-specific metadata
  - **Note:** For one-time orders, stores `order_defaults` (address, preferences, pickup date) since there's no subscription to hold them.
- `created_at` (timestamp) - Creation timestamp
- `activated_at` (timestamp, nullable) - When agreement was activated by user
- `stopped_at` (timestamp, nullable) - When agreement was stopped
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to Customer
- Has zero or one Subscription (via `subscriptions.payment_agreement_id`)
- Has many Orders (via `orders.payment_agreement_id`)

**Indexes:**

- Foreign: customer_id
- Unique: provider_agreement_id
- Index: status

---

### Subscription

**Description:** Active customer subscriptions with FLEXIBLE pricing model. Only created for recurring orders (not one-time).

**Note:**
- A customer can only have ONE active or paused subscription at a time
- Uses Vipps FLEXIBLE pricing: orders generated with NULL price, cleaner calculates after weighing laundry
- No upfront billing - each order is charged individually by cleaner
- One-time orders do NOT create a subscription - they use PaymentAgreement directly

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `frequency` (enum → [SubscriptionFrequency](#subscriptionfrequency), required) - Pickup frequency (weekly, biweekly, monthly)
  - **Default:** `'weekly'`
- `status` (enum → [SubscriptionStatus](#subscriptionstatus), required) - Subscription status
  - **Default:** `pending_payment`
  - **Note:** Transitions to `active` when Vipps agreement is approved
- `payment_agreement_id` (uuid, FK → PaymentAgreement.id, nullable) - Link to the Vipps payment agreement
  - **Note:** Used to resolve provider_agreement_id for Vipps API calls
- `order_defaults` (jsonb, nullable) - Order generation defaults (single source of truth)
  - **Default:** `null`
  - **Structure:**
    - `initial_address` (object) - Service address for orders:
      - `street`, `postal_code`, `city`, `country`, `special_instructions`
    - `special_instructions` (string, nullable) - Recurring pickup instructions
    - `location_city` (string) - Service area city ('Bergen' or 'Oslo') - used for cleaner matching
    - `default_needs_ironing` (boolean) - Default ironing preference for orders
    - `default_cleaner_id` (uuid, nullable) - Default cleaner assignment (orders can be reassigned)
    - `first_pickup_date` (string) - ISO date (YYYY-MM-DD) for first order pickup
  - **Note:** All order generation settings stored here. Individual orders can have different cleaner, address, or preferences.
- `started_at` (timestamp, nullable) - Subscription activation timestamp
  - **Note:** Set when Vipps agreement is activated. Null while `status = 'pending_payment'`.
- `paused_at` (timestamp, nullable) - Pause timestamp
- `cancelled_at` (timestamp, nullable) - Cancellation timestamp
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to Customer
- Belongs to PaymentAgreement (nullable)
- Has many Orders (generated from subscription)
- Has many Payments (per-order billing, no recurring charges)
- Default cleaner stored in order_defaults.default_cleaner_id (not a foreign key - orders can be reassigned)

**Notes:**

- **FLEXIBLE Pricing Model:** No upfront subscription charges. Orders created with `total_cost_ore = NULL`, cleaner sets price after pickup.
- **Rolling Window:** System maintains 1 upcoming order at all times. When order completes, next order is auto-generated.
- Order generation defaults stored in `order_defaults` JSONB (address, cleaner, preferences).
- See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md#subscription-creation--order-generation-flexible-pricing) for order generation workflow.

**Indexes:**

- Foreign: customer_id, payment_agreement_id
- Index: status
- Unique: (customer_id) WHERE status IN ('pending_payment', 'active', 'paused') - enforces one active/pending subscription per customer

---

### Order

**Description:** Laundry pickup and delivery orders with FLEXIBLE pricing. Customers submit laundry, cleaners weigh and calculate price, process laundry, and it's delivered back.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `order_number` (string, unique, required) - Human-readable order number
  - **Format:** `XXXXXX` (6-character random alphanumeric)
  - **Examples:** `'A7K2X9'`, `'P3M8NV'`
- `customer_id` (uuid, FK → [Customer](#customer).id, required) - Customer reference
  - **On Delete:** CASCADE
- `subscription_id` (uuid, FK → [Subscription](#subscription).id, nullable) - Subscription reference
  - **Note:** Set if order is part of subscription, null for one-time orders
- `payment_agreement_id` (uuid, FK → [PaymentAgreement](#paymentagreement).id, nullable) - Payment agreement reference
  - **Note:** Set for all orders (both subscription and one-time). Used to resolve Vipps agreement for charging.
- `cleaner_id` (uuid, FK → [Cleaner](#cleaner).id, nullable) - Assigned cleaner
- `status` (enum → [OrderStatus](#orderstatus), required) - Order status
  - **Default:** `pending_assignment`
- **Address (Single address - pickup = delivery):**
  - `street` (string, required) - Service address street
    - **Validation:** Min 3 chars, max 200 chars
  - `postal_code` (string, required) - Service address postal code
    - **Validation:** Exactly 4 digits
  - `city` (string, required) - Service address city
    - **Validation:** Min 2 chars, max 100 chars
  - `country` (string, required) - Service address country
    - **Default:** `'Norway'`
    - **Validation:** Max 100 chars
  - `special_instructions_address` (text, nullable) - Address-specific instructions (e.g., gate code, entrance)
    - **Validation:** Max 500 chars
- **Scheduling:**
  - `scheduled_date` (date, required) - Scheduled pickup date
    - **Validation:** Must be >= today
  - `delivery_date` (date, required) - **Estimated** delivery date shown to the customer ("Estimert levering") while the order is active. An estimate only — never a commitment and never a gate for any logic; finishing and delivering earlier is desirable. On delivery completion the column is overwritten with the **actual** delivery date (`completed_at` holds the precise timestamp).
    - **Validation:** Must be >= scheduled_date
- **Pickup Details:**
  - `special_instructions` (text, nullable) - One-time order notes
    - **Validation:** Max 1000 chars
    - **Examples:** "Call when arriving", "Extra dirty items", "Handle with care"
- **Service Preferences:**
  - `needs_ironing` (boolean) - Ironing needed for this order
    - **Default:** `false`
- **Pricing (Calculated by cleaner after pickup):**
  - `actual_weight_kg` (decimal, nullable) - Actual weight after pickup
  - `pricing_notes` (text, nullable) - Cleaner's pricing explanation/notes
  - `price_calculated_at` (timestamp, nullable) - When cleaner calculated the price
  - `total_cost_ore` (integer, nullable) - Total order cost in øre
    - **Default:** `NULL` (cleaner sets after weighing)
    - **Note:** Cleaner calculates based on weight, ironing, and other factors
    - **Note:** When a promo is applied, this stores the **discounted** amount actually charged (can be below the order minimum, or `0` for a fully-discounted order)
  - `promo` (jsonb, nullable) - Locked promo-code snapshot, set on the **first** order of an agreement only
    - **Default:** `NULL` (no promo)
    - **Shape:** `{ promo_code_id, code, discount_type, discount_value, max_discount_ore, discount_ore? }`
    - **Note:** Discount terms are captured at checkout (so the deal survives if the code is later changed/deactivated); `discount_ore` is filled in when the cleaner prices the order
    - **Note:** Discount is **platform-absorbed** — it reduces `total_cost_ore` but not the cleaner payout
- **Other:**
  - `declined_by_cleaner_ids` (uuid[], nullable) - Array of cleaner IDs who declined this order
    - **Note:** Used during reassignment to prevent offering order to same cleaner again
  - `assigned_at` (timestamp, nullable) - Cleaner assignment timestamp
  - `picked_up_at` (timestamp, nullable) - Actual pickup timestamp
  - `in_cleaning_at` (timestamp, nullable) - When driver delivered to cleaner
  - `ready_for_delivery_at` (timestamp, nullable) - When cleaner marked laundry as ready
  - `out_for_delivery_at` (timestamp, nullable) - When driver collected from cleaner
  - `completed_at` (timestamp, nullable) - Order completion timestamp
  - `cancelled_at` (timestamp, nullable) - Cancellation timestamp
  - `cancellation_reason` (text, nullable) - Reason for cancellation
    - **Validation:** Required if status = `cancelled`, max 500 chars
  - `mission_accepted_at` (timestamp, nullable) - When cleaner accepted the order
  - `created_at` (timestamp) - Order creation timestamp
  - `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to Customer
- Belongs to Subscription (nullable)
- Belongs to PaymentAgreement (nullable)
- Assigned to Cleaner
- Has many Payments (one-time payment per order)

**Notes:**

- **FLEXIBLE Pricing:** Orders created with `total_cost_ore = NULL`. Cleaner weighs laundry after pickup and calculates price.
- **Single Address Model:** Pickup and delivery use same address (simplified from previous two-address model).
- **No Plan Reference:** Removed subscription_plans table - pricing is fully flexible.

**Indexes:**

- Unique: order_number
- Foreign: customer_id, subscription_id, payment_agreement_id, cleaner_id
- Index: status, scheduled_date
- Composite: (customer_id, created_at DESC), (cleaner_id, status)

---

### Payment

**Description:** Payment transaction records. FLEXIBLE pricing model: each order has individual payment created by cleaner after calculating price.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `order_id` (uuid, FK → Order.id, nullable) - Order reference (for per-order payments)
- `subscription_id` (uuid, FK → Subscription.id, nullable) - Subscription reference (for tracking, not billing)
- `payment_type` (enum, required) - Type: `recurring`, `one_time`, `refund`
  - **Note:** In FLEXIBLE model, most payments are `one_time` per order
- `amount_ore` (integer, required) - Amount in øre
  - **Constraints:** >= 0
- `status` (enum, required) - Status: `pending`, `authorized`, `captured`, `failed`, `refunded`, `cancelled`
  - **Flow (RESERVE_CAPTURE):** pending → authorized → captured/failed
  - **Note:** `authorized` status indicates funds are reserved but not yet captured (Vipps RESERVE_CAPTURE)
- `payment_provider` (enum, required) - Provider: `vipps`, `stripe`, `manual`
- `provider_reference` (string, nullable) - Merchant reference for webhook lookups
  - **Recurring API:** Vipps charge ID (chr_Xyz789)
  - **Indexed:** For fast webhook processing
- `provider_metadata` (jsonb, nullable) - Complete provider response data (single source of truth)
  - **Recurring:** `{"vipps_agreement_id": "agr_Abc123", "vipps_charge_id": "chr_Xyz789", "vipps_transaction_id": "txn_Def456", "vipps_status": "CHARGED"}`
  - **Note:** Stores all provider-specific details for debugging, reconciliation, and audit trail.
- `authorized_at` (timestamp, nullable) - Authorization timestamp (when funds reserved via RESERVE_CAPTURE)
- `captured_at` (timestamp, nullable) - Capture timestamp (when funds actually captured)
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
- Belongs to Order (nullable, for per-order payments)
- Belongs to Subscription (nullable, for association only)

**Notes:**

- **FLEXIBLE Pricing Model:** No upfront subscription billing. Cleaner creates individual charge per order after calculating price.
- **Vipps API:** Platform uses the Recurring API for both agreements and per-order charges.
- See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md#payment-processing) for payment workflows.

**Indexes:**

- Index: provider_reference (for webhook lookups)
- Foreign: customer_id, order_id, subscription_id
- Index: status, payment_provider, payment_type, created_at
- Composite: (customer_id, created_at DESC), (subscription_id, created_at DESC)

---

### PromoCode

**Description:** Discount codes a customer can apply at checkout. Codes are **shared** (one code, many customers) but each customer may redeem a given code only **once**. The discount applies to the **first order** of an agreement and is **platform-absorbed** (cleaner payout is unaffected).

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `code` (string, unique, required) - The code customers type
  - **Note:** Stored uppercase; matched case-insensitively
- `discount_type` (enum → [PromoDiscountType](#promodiscounttype), required) - `percentage` or `fixed`
- `discount_value` (integer, required) - Percentage (1–100) for `percentage`, or amount in øre for `fixed`
  - **Constraints:** > 0
- `max_discount_ore` (integer, nullable) - Optional cap for percentage codes (in øre)
  - **Constraints:** >= 0; `NULL` = no cap
- `active` (boolean, required) - Whether the code can be redeemed
  - **Default:** `true`
- `valid_from` (timestamp, nullable) - Start of validity window (`NULL` = no start bound)
- `valid_until` (timestamp, nullable) - End of validity window (`NULL` = no expiry)
- `max_redemptions` (integer, nullable) - Optional global cap on total redemptions
  - **Constraints:** >= 0; `NULL` = unlimited
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Has many PromoCodeRedemptions

**Notes:**

- **Validation** (at checkout): exists → active → within validity window → global cap not reached → not already redeemed by this customer.
- **MVP:** No admin UI yet — codes are seeded via SQL.

**Indexes:**

- Unique: code
- Index: code

---

### PromoCodeRedemption

**Description:** Ledger of promo-code usage. One row per `(promo_code_id, customer_id)` enforces "once per customer"; the row count for a code enforces `max_redemptions`.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `promo_code_id` (uuid, FK → [PromoCode](#promocode).id, required) - Redeemed code
  - **On Delete:** CASCADE
- `customer_id` (uuid, FK → [Customer](#customer).id, required) - Redeeming customer
  - **On Delete:** CASCADE
- `payment_agreement_id` (uuid, FK → [PaymentAgreement](#paymentagreement).id, nullable) - Agreement the redemption belongs to
  - **On Delete:** SET NULL
- `order_id` (uuid, FK → [Order](#order).id, nullable) - First order the discount was stamped onto
  - **On Delete:** SET NULL
- `redeemed_at` (timestamp) - Redemption timestamp

**Relationships:**

- Belongs to PromoCode
- Belongs to Customer

**Notes:**

- **Recorded at first-order generation** (agreement activated), not at checkout — so abandoned checkouts don't consume a customer's single use.
- **Idempotent:** the `UNIQUE(promo_code_id, customer_id)` constraint makes webhook retries safe.

**Indexes:**

- Unique: (promo_code_id, customer_id)
- Foreign/Index: promo_code_id, customer_id

---

**Note:** For MVP, email/SMS notifications are tracked via provider audit logs (SendGrid, Twilio, etc.) - no database storage needed.

---

## Enums

### UserRole

- `customer`
- `cleaner`
- `driver` - Picks up and delivers laundry. Minimal profile in `drivers` (one city + optional route start); accounts and profiles are created by admins from the admin dashboard (never self-service).
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

### OrderStatus

- `pending_assignment` - Waiting for cleaner assignment (edge case: no available cleaners)
- `pickup_scheduled` - Cleaner assigned and pickup scheduled
- `picked_up` - Laundry picked up from customer, in transit to cleaner
- `in_cleaning` - Laundry delivered to cleaner, being washed
- `ready_for_delivery` - Laundry cleaned, ready for driver to collect from cleaner
- `out_for_delivery` - Driver collected from cleaner, en route to customer
- `completed` - Clean laundry delivered to customer (final state)
- `cancelled` - Order cancelled (final state)

### PromoDiscountType

- `percentage` - `discount_value` is a percentage (1–100), optionally capped by `max_discount_ore`
- `fixed` - `discount_value` is a fixed amount in øre

---

## Database Constraints & Validation

### Database-Level Constraints (Enforced by PostgreSQL)

**CHECK Constraints:**
- `Order`: `delivery_date >= scheduled_date` - Delivery cannot be before pickup
- `PromoCode`: `discount_type IN ('percentage','fixed')`, `discount_value > 0`, `max_discount_ore >= 0` (or NULL), `max_redemptions >= 0` (or NULL)

**Unique Partial Indexes:**
- `Subscription`: `(customer_id) WHERE status IN ('pending_payment', 'active', 'paused')` - Only one active/pending subscription per customer

**Unique Constraints:**
- `PromoCode`: `code`
- `PromoCodeRedemption`: `(promo_code_id, customer_id)` - One redemption per customer per code

**Foreign Key Cascades:**
- `Customer.user_id` → `User.id` (ON DELETE CASCADE)
- `Cleaner.user_id` → `User.id` (ON DELETE CASCADE)
- `Order.customer_id` → `Customer.id` (ON DELETE CASCADE)

### Application-Level Validation (Enforced by Code)

**Business Rules:**
- Orders cannot be assigned to cleaner with `weekly_schedule` that doesn't include the pickup weekday
- Orders cannot be assigned to cleaner with `verification_status != 'approved'`
- Cleaner cannot receive assignments if `is_accepting_orders = false`
- `business_name` and `business_address` required if `Cleaner.business_type = 'business'`
- Order number must be unique and follow format `XXXXXX` (6-character random alphanumeric)
- **FLEXIBLE Pricing:** Orders created with `total_cost_ore = NULL`, cleaner calculates price after pickup

---

## Security & Privacy

- **RLS Policies:** Customers see own data only; cleaners see assigned orders only; admins have full access
- **Driver Role (MVP):** Dedicated `driver` users run the driver dashboard (`/dashboard/driver`); admins have access to it too. Privileged roles (`admin`, `driver`) cannot be self-selected at signup — `handle_new_user` only honors `customer`/`cleaner` from metadata.

---

## Related Documentation

See [BUSINESS_LOGIC.md](./BUSINESS_LOGIC.md) for workflows and [DASHBOARDS.md](./DASHBOARDS.md) for UI specifications.