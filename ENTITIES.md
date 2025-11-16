# NooraCare Entity Model

---

## Core Entities

### 1. User
**Description:** Base authentication entity for all platform users.

**Fields:**
- `id` (uuid, PK) - Unique identifier (Supabase Auth UUID)
- `email` (string, unique, required) - User email
  - **Validation:** Valid email format, max 255 chars
  - **Constraints:** UNIQUE, NOT NULL
- `phone` (string, unique, required) - Phone number (Norwegian format)
  - **Validation:** Norwegian format `+47XXXXXXXX` (8 digits after +47)
  - **Constraints:** UNIQUE, NOT NULL
- `full_name` (string, required) - Full name
  - **Validation:** Min 2 chars, max 100 chars
  - **Constraints:** NOT NULL
- `role` (enum → [UserRole](#userrole), required) - User role
  - **Values:** `customer`, `cleaner`, `driver`, `admin`
  - **Constraints:** NOT NULL
  - **Default:** `customer`
- `created_at` (timestamp) - Account creation timestamp
  - **Default:** `now()`
- `updated_at` (timestamp) - Last update timestamp
  - **Default:** `now()`
  - **Auto-update:** Updates on every record change
- `last_login_at` (timestamp, nullable) - Last login timestamp
- `deleted_at` (timestamp, nullable) - Soft delete timestamp
  - **Note:** When set, user is marked as deleted but data retained for compliance
  - **Business Rule:** Anonymize PII (email → deleted_[id]@deleted.com, phone → null, full_name → "Deleted User") while preserving transactional data

**Relationships:**
- Has one Customer profile (if role = customer)
- Has one Cleaner profile (if role = cleaner)
- Has one Driver profile (if role = driver)
- Has one Admin profile (if role = admin)
- Has many Addresses
- Has many Notifications

**Indexes:**
- Primary: id
- Unique: email, phone
- Index: role

---

### 2. Customer
**Description:** Extended profile for customer users.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → [User](#1-user).id, unique, required) - Reference to User
  - **Constraints:** UNIQUE, NOT NULL, FOREIGN KEY
  - **On Delete:** CASCADE
- `has_noora_bag` (boolean) - Whether customer has received NooraCare bag
  - **Default:** `false`
  - **Constraints:** NOT NULL
- `created_at` (timestamp) - Profile creation timestamp
  - **Default:** `now()`
- `updated_at` (timestamp) - Last update timestamp
  - **Default:** `now()`
  - **Auto-update:** Updates on every record change
- `deleted_at` (timestamp, nullable) - Soft delete timestamp
  - **Note:** Set when parent User is deleted. Preserves order/payment history for accounting compliance.

**Relationships:**
- Belongs to User
- Has many Subscriptions (only one active/paused at a time)
- Has many Orders
- Has many Reviews
- Has many PaymentMethods

**Indexes:**
- Primary: id
- Unique: user_id

---

### 3. Cleaner
**Description:** Extended profile for cleaner users.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → [User](#1-user).id, unique, required) - Reference to User
  - **Constraints:** UNIQUE, NOT NULL, FOREIGN KEY
  - **On Delete:** CASCADE
- `display_name` (string, required) - Public display name
  - **Validation:** Min 2 chars, max 100 chars
  - **Constraints:** NOT NULL
- `profile_image_url` (string, nullable) - Profile/logo URL
  - **Validation:** Valid URL format, max 500 chars
- `bio` (text, nullable) - About/bio section
  - **Validation:** Max 1000 chars
- `verification_status` (enum → [CleanerVerificationStatus](#cleanerverificationstatus), required) - Verification status
  - **Values:** `pending`, `approved`, `rejected`, `suspended`
  - **Constraints:** NOT NULL
  - **Default:** `pending`
- `business_type` (enum → [CleanerBusinessType](#cleanerbusinesstype), required) - Business type
  - **Values:** `individual`, `business`
  - **Constraints:** NOT NULL
- `tax_id` (string, required) - Personal number or Organization number
  - **Validation:**
    - Individual: 11 digits (Norwegian personal number)
    - Business: 9 digits (Norwegian org number)
  - **Constraints:** UNIQUE, NOT NULL
  - **Security:** Encrypted at rest
- `business_name` (string, nullable) - Company name
  - **Validation:** Required if `business_type = 'business'`, max 200 chars
- `business_address` (text, nullable) - Registered business address
  - **Validation:** Required if `business_type = 'business'`, max 300 chars
- `bank_account` (string, required) - Norwegian bank account
  - **Validation:** 11 digits (Norwegian bank account format)
  - **Constraints:** NOT NULL
  - **Security:** Encrypted at rest
- `base_address_id` (uuid, FK → [Address](#6-address).id, required) - Base operation address
  - **Constraints:** NOT NULL, FOREIGN KEY
- `experience_level` (enum → [CleanerExperienceLevel](#cleanerexperiencelevel), required) - Experience level
  - **Values:** `beginner`, `some`, `experienced`, `expert`, `professional`
  - **Constraints:** NOT NULL
- `languages` (string[], required) - Languages spoken
  - **Validation:** ISO 639-1 codes (e.g., `['no', 'en']`), at least 1 language
  - **Constraints:** NOT NULL
- `specializations` (string[], nullable) - Clothing specializations
  - **Examples:** `['wool', 'silk', 'down', 'sportswear']`
- `daily_capacity` (string, nullable) - Wash cycles per day
  - **Examples:** `'3-4'`, `'5-6'`
- `weekly_capacity` (string, nullable) - Orders per week
  - **Examples:** `'6-10'`, `'10-15'`
- `created_at` (timestamp) - Profile creation timestamp
  - **Default:** `now()`
- `updated_at` (timestamp) - Last update timestamp
  - **Default:** `now()`
  - **Auto-update:** Updates on every record change
- `approved_at` (timestamp, nullable) - Approval timestamp
  - **Auto-set:** When `verification_status` changes to `approved`
- `suspended_at` (timestamp, nullable) - Suspension timestamp
  - **Auto-set:** When `verification_status` changes to `suspended`
- `deleted_at` (timestamp, nullable) - Soft delete timestamp
  - **Note:** Set when parent User is deleted. Preserves order/review history and financial records.
  - **Business Rule:** On deletion, anonymize sensitive fields (tax_id, bank_account, business_address) while keeping operational data

**Relationships:**
- Belongs to User
- Has many CleanerServices
- Has one base Address
- Has many Orders (assigned orders)
- Receives many Reviews

**Indexes:**
- Primary: id
- Unique: user_id, tax_id
- Index: verification_status, base_address_id
- GeoIndex: base_address_id (for location-based queries)

---

### 4. Driver
**Description:** Profile for drivers who handle pickups and deliveries.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, unique, required) - Reference to User
- `display_name` (string, required) - Public display name
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to User
- Tracks pickups and deliveries through Order status changes (not a separate entity)

**Indexes:**
- Primary: id
- Unique: user_id

---

### 5. Admin
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
- Primary: id
- Unique: user_id

---

### 6. Address
**Description:** Physical addresses for pickup, delivery, and business locations.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → [User](#1-user).id, required) - Owner of address
  - **Constraints:** NOT NULL, FOREIGN KEY
  - **On Delete:** CASCADE
- `label` (string, nullable) - Address nickname
  - **Validation:** Max 50 chars
  - **Examples:** `'Home'`, `'Office'`, `'Hytta'`
- `street` (string, required) - Street address
  - **Validation:** Min 3 chars, max 200 chars
  - **Constraints:** NOT NULL
  - **Example:** `'Bryggen 5'`
- `postal_code` (string, required) - Norwegian postal code
  - **Validation:** Exactly 4 digits
  - **Constraints:** NOT NULL
  - **Example:** `'5003'`
- `city` (string, required) - City name
  - **Validation:** Min 2 chars, max 100 chars
  - **Constraints:** NOT NULL
  - **Example:** `'Bergen'`
- `country` (string) - Country
  - **Default:** `'Norway'`
  - **Constraints:** NOT NULL
  - **Validation:** Max 100 chars
- `special_instructions` (text, nullable) - Access instructions
  - **Validation:** Max 500 chars
  - **Examples:** `'Ring doorbell twice'`, `'Code: 1234'`
- `latitude` (decimal, nullable) - GPS latitude
  - **Validation:** Range -90 to 90
  - **Precision:** decimal(10, 8)
- `longitude` (decimal, nullable) - GPS longitude
  - **Validation:** Range -180 to 180
  - **Precision:** decimal(11, 8)
- `is_default` (boolean) - Default address for user
  - **Default:** `false`
  - **Constraints:** NOT NULL
  - **Rule:** Only one default address per user
- `created_at` (timestamp) - Creation timestamp
  - **Default:** `now()`
- `updated_at` (timestamp) - Last update timestamp
  - **Default:** `now()`
  - **Auto-update:** Updates on every record change

**Relationships:**
- Belongs to User
- Used by many Orders (pickup/delivery)
- Used by Cleaners (base address)

**Indexes:**
- Primary: id
- Foreign: user_id
- GeoIndex: (latitude, longitude)
- Index: postal_code, city

---

### 7. SubscriptionPlan
**Description:** Subscription plan templates (catalog).

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `slug` (string, unique, required) - URL-friendly identifier
  - **Validation:** Lowercase with hyphens only, max 50 chars
  - **Constraints:** UNIQUE, NOT NULL
  - **Examples:** `'weekly-standard'`, `'monthly-premium'`, `'on-demand-basic'`
- `name` (string, required) - Norwegian name
- `description` (text, required) - Norwegian description
- `price_ore` (integer, required) - Price stored in øre (1/100 NOK)
  - **Constraints:** NOT NULL, >= 0
- `billing_period` (enum → [SubscriptionBillingPeriod](#subscriptionbillingperiod), required) - Period: `monthly`, `one_time`
  - **Constraints:** NOT NULL
- `included_kg` (integer, default: 5) - Included kg per cycle
- `features` (string[], required) - Plan features list
- `frequency` (enum → [SubscriptionFrequency](#subscriptionfrequency), required) - Frequency: `weekly`, `biweekly`, `monthly`, `on_demand`
  - **Constraints:** NOT NULL
- `is_popular` (boolean, default: false) - Popular plan flag
- `is_active` (boolean, default: true) - Active/available flag
- `sort_order` (integer, default: 0) - Display order
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Has many Subscriptions
- Has many Orders

**Indexes:**
- Primary: id
- Unique: slug
- Index: is_active, sort_order

---

### 8. Subscription
**Description:** Active customer subscriptions.

**Note:** A customer can only have ONE active or paused subscription at a time.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `plan_id` (uuid, FK → SubscriptionPlan.id, required) - Plan reference
- `default_extra_kg` (integer, default: 0) - Permanent extra kg added to subscription
- `default_needs_ironing` (boolean, default: false) - Permanent ironing preference
- `default_delicate_items_count` (integer, default: 0) - Permanent delicate items count
- `recurring_weekday` (enum → [Weekday](#weekday), nullable) - Preferred weekday for recurring pickups based on subscription frequency
  - **Values:** `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`
  - **Note:** For biweekly frequency, this weekday repeats every 2 weeks from `started_at`. For monthly, it represents the target weekday if possible within the month.
- `status` (enum, required) - Status: `active`, `paused`, `cancelled`, `expired`
- `billing_cost_ore` (integer, required) - Total billing cost in øre (1/100 NOK), calculated from plan price + permanent add-ons
  - **Constraints:** NOT NULL, >= 0
  - **Note:** Named "billing" (not "monthly") because it applies to both monthly and one_time billing periods
- `next_pickup_date` (date, nullable) - Next scheduled pickup
- `last_pickup_date` (date, nullable) - Last completed pickup
- `started_at` (timestamp, required) - Subscription start date
- `paused_at` (timestamp, nullable) - Pause timestamp
- `cancelled_at` (timestamp, nullable) - Cancellation timestamp
- `expires_at` (timestamp, nullable) - Expiration timestamp
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Customer
- Belongs to SubscriptionPlan
- Has many Orders (generated from subscription)
- Has many Payments (monthly recurring billing)

**Notes:**
- `billing_cost_ore` is calculated as: `SubscriptionPlan.price_ore + (default_extra_kg * PricingConfiguration.extra_kg_price_ore) + (default_needs_ironing ? PricingConfiguration.ironing_price_ore : 0) + (default_delicate_items_count * PricingConfiguration.delicate_item_price_ore)`
- When customer updates preferences (default_extra_kg, default_needs_ironing, etc.), `billing_cost_ore` must be recalculated and updated
- Auto-generated orders inherit these default preferences (Order.extra_kg = Subscription.default_extra_kg, etc.)
- Preferences are permanent until customer explicitly changes them

**Indexes:**
- Primary: id
- Foreign: customer_id, plan_id
- Index: status, next_pickup_date

---

### 9. Order
**Description:** Individual laundry order/job.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `order_number` (string, unique, required) - Human-readable order number
  - **Format:** `NC-YYYYMMDD-XXXX` (e.g., `NC-20240101-0001`)
  - **Constraints:** UNIQUE, NOT NULL
  - **Auto-generated:** Sequential per day
  - **Note:** XXXX supports up to 9999 orders per day. If exceeded, consider switching to 5-digit format or UUID suffix.
- `customer_id` (uuid, FK → [Customer](#2-customer).id, required) - Customer reference
  - **Constraints:** NOT NULL, FOREIGN KEY
- `subscription_id` (uuid, FK → [Subscription](#8-subscription).id, nullable) - Subscription reference
  - **Constraints:** FOREIGN KEY
  - **Note:** Set if order is part of subscription, null for one-time orders
- `plan_id` (uuid, FK → [SubscriptionPlan](#7-subscriptionplan).id, required) - Plan reference
  - **Constraints:** NOT NULL, FOREIGN KEY
- `cleaner_id` (uuid, FK → [Cleaner](#3-cleaner).id, nullable) - Assigned cleaner
  - **Constraints:** FOREIGN KEY
- `status` (enum → [OrderStatus](#orderstatus), required) - Order status
  - **Constraints:** NOT NULL
  - **Default:** `pending_assignment`
  - **Values:** See OrderStatus enum for valid transitions
- `pickup_date` (date, required) - Scheduled pickup date
  - **Constraints:** NOT NULL
  - **Validation:** Must be >= today
- `delivery_date` (date, nullable) - Scheduled/actual delivery date
  - **Validation:** Must be >= pickup_date
- `address_id` (uuid, FK → [Address](#6-address).id, required) - Pickup and delivery location
  - **Constraints:** NOT NULL, FOREIGN KEY
- `pickup_method` (enum → [PickupMethod](#pickupmethod), required) - Pickup method
  - **Values:** `home`, `entrance`, `other`
  - **Constraints:** NOT NULL
- `pickup_location_description` (text, nullable) - Detailed location
  - **Validation:** Required if `pickup_method = 'other'`, max 500 chars
- `special_instructions` (text, nullable) - Customer instructions
  - **Validation:** Max 1000 chars
- `extra_kg` (integer) - Extra kg for this order
  - **Default:** `0`
  - **Constraints:** NOT NULL, >= 0, <= 20
- `delicate_items_count` (integer) - Delicate items count
  - **Default:** `0`
  - **Constraints:** NOT NULL, >= 0, <= 50
- `needs_ironing` (boolean) - Ironing needed
  - **Default:** `false`
  - **Constraints:** NOT NULL
- `needs_bag_delivery` (boolean) - NooraCare bag delivery needed
  - **Default:** `false`
  - **Constraints:** NOT NULL
- `bag_delivered_at` (timestamp, nullable) - Bag delivery timestamp
  - **Auto-set:** When bag is marked as delivered
- `bag_placement_photo_url` (string, nullable) - Customer's bag placement photo
  - **Validation:** Valid URL format, max 500 chars
  - **Required:** If `pickup_method != 'home'`
- `actual_weight_kg` (decimal, nullable) - Actual weight measured at pickup
  - **Precision:** decimal(5, 2)
  - **Note:** Set by cleaner/driver during pickup
- `weight_overage_charge_ore` (integer, nullable) - Additional charge for weight exceeding plan + extra_kg
  - **Constraints:** >= 0
  - **Note:** Calculated as (actual_weight_kg - plan.included_kg - extra_kg) * PricingConfiguration.extra_kg_price_ore
- `total_cost_ore` (integer, required) - Total order cost in øre (1/100 NOK)
  - **Constraints:** NOT NULL, >= 0
  - **Calculation:** Plan price + extras (kg, ironing, delicate items) + weight_overage_charge_ore
  - **Note:** For subscription orders, this is tracking only; payment is via subscription
- `pickup_driver_id` (uuid, FK → [Driver](#4-driver).id, nullable) - Driver who handled pickup
  - **Constraints:** FOREIGN KEY
- `delivery_driver_id` (uuid, FK → [Driver](#4-driver).id, nullable) - Driver who handled delivery
  - **Constraints:** FOREIGN KEY
- `assigned_at` (timestamp, nullable) - Cleaner assignment timestamp
  - **Auto-set:** When status changes to `assigned`
- `picked_up_at` (timestamp, nullable) - Actual pickup timestamp
  - **Auto-set:** When status changes to `picked_up`
- `delivered_at` (timestamp, nullable) - Actual delivery timestamp
  - **Auto-set:** When status changes to `delivered`
- `completed_at` (timestamp, nullable) - Order completion timestamp
  - **Auto-set:** When status changes to `completed`
- `cancelled_at` (timestamp, nullable) - Cancellation timestamp
  - **Auto-set:** When status changes to `cancelled`
- `cancellation_reason` (text, nullable) - Reason for cancellation
  - **Validation:** Required if status = `cancelled`, max 500 chars
- `mission_accepted_at` (timestamp, nullable) - When cleaner accepted the order
  - **Auto-set:** When cleaner accepts the assigned order
- `mission_declined_at` (timestamp, nullable) - When cleaner declined the order
  - **Auto-set:** When cleaner declines the assigned order
- `mission_decline_reason` (text, nullable) - Reason for declining
  - **Validation:** Required if cleaner declines, max 500 chars
- `created_at` (timestamp) - Order creation timestamp
  - **Default:** `now()`
- `updated_at` (timestamp) - Last update timestamp
  - **Default:** `now()`
  - **Auto-update:** Updates on every record change

**Relationships:**
- Belongs to Customer
- Belongs to SubscriptionPlan
- Belongs to Subscription (nullable)
- Assigned to Cleaner (nullable)
- Pickup handled by Driver (nullable)
- Delivery handled by Driver (nullable)
- Has one Address (pickup and delivery location)
- Has many Payments (only for one-time plan orders; subscription orders have no direct payment)
- Has many OrderStatusHistory records

**Notes:**
- `total_cost_ore` serves different purposes based on order type:
  - **Subscription orders** (`subscription_id` is set): This field is for tracking/reporting only. The order is covered by the monthly subscription payment. No separate payment is created for individual orders.
  - **One-time orders** (`subscription_id` is null): This field matches the `Payment.amount_ore` for the order's payment.
- **For subscription orders**, fields like `extra_kg`, `needs_ironing`, `delicate_items_count` are auto-populated from `Subscription.default_*` preferences when the order is created:
  - `Order.extra_kg` = `Subscription.default_extra_kg`
  - `Order.needs_ironing` = `Subscription.default_needs_ironing`
  - `Order.delicate_items_count` = `Subscription.default_delicate_items_count`
- **For one-time orders**, these fields are set based on customer's order-specific choices
- **Ironing service**: `Order.needs_ironing` represents basic ironing included with washing. For premium/specialized ironing services, see `AdditionalService` with slug `'ironing'`

**Indexes:**
- Primary: id
- Unique: order_number
- Foreign: customer_id, subscription_id, plan_id, cleaner_id, address_id, pickup_driver_id, delivery_driver_id
- Index: status, pickup_date, mission_accepted_at
- Composite: (customer_id, created_at), (cleaner_id, status)

---

### 10. AdditionalService
**Description:** Catalog of additional services offered by cleaners.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `slug` (string, unique, required) - Service identifier: `dryer`, `drying_room`, `ironing`
- `name` (string, required) - Norwegian name
- `description` (text, required) - Norwegian description
- `base_price_ore` (integer, required) - Base price in øre (1/100 NOK)
  - **Constraints:** NOT NULL, >= 0
- `pricing_type` (enum → [AdditionalServicePricingType](#additionalservicepricingtype), required) - Type: `per_order`, `per_item`, `per_kg`
  - **Constraints:** NOT NULL
- `is_active` (boolean, default: true) - Active flag
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Has many CleanerServices (cleaner-specific offerings)

**Indexes:**
- Primary: id
- Unique: slug
- Index: is_active

---

### 11. CleanerService
**Description:** Services offered by specific cleaners. The existence of a record indicates the cleaner offers this service at the base price defined in AdditionalService.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `cleaner_id` (uuid, FK → Cleaner.id, required) - Cleaner reference
- `service_id` (uuid, FK → AdditionalService.id, required) - Service reference
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Cleaner
- Belongs to AdditionalService

**Indexes:**
- Primary: id
- Foreign: cleaner_id, service_id
- Unique: (cleaner_id, service_id)

---

### 12. CleanerAvailability
**Description:** Tracks cleaner availability, capacity, and blocked dates (vacation, fully booked, etc.).

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `cleaner_id` (uuid, FK → [Cleaner](#3-cleaner).id, required) - Cleaner reference
  - **Constraints:** NOT NULL, FOREIGN KEY
  - **On Delete:** CASCADE
- `date` (date, required) - The date this availability applies to
  - **Constraints:** NOT NULL
- `is_available` (boolean, required) - Whether cleaner is available on this date
  - **Constraints:** NOT NULL
  - **Default:** `true`
- `max_orders` (integer, nullable) - Maximum orders the cleaner can accept on this date
  - **Constraints:** >= 0
  - **Note:** If null, uses cleaner's default `daily_capacity`. If 0, cleaner is unavailable.
- `current_orders` (integer, required) - Current number of orders assigned for this date
  - **Constraints:** NOT NULL, >= 0
  - **Default:** `0`
  - **Auto-update:** Increments when order is assigned, decrements when cancelled
- `reason` (text, nullable) - Reason for unavailability or capacity change
  - **Validation:** Max 500 chars
  - **Examples:** `'Vacation'`, `'Fully booked'`, `'Equipment maintenance'`, `'Personal day'`
- `created_at` (timestamp) - Creation timestamp
  - **Default:** `now()`
- `updated_at` (timestamp) - Last update timestamp
  - **Default:** `now()`
  - **Auto-update:** Updates on every record change

**Relationships:**
- Belongs to Cleaner

**Business Rules:**
- Prevents over-booking: When assigning an order, check `current_orders < max_orders`
- If `is_available = false`, cleaner should not receive new assignments for that date
- Auto-generate availability records when cleaner is approved (based on their availability settings)
- Can be used for vacation planning: cleaner sets `is_available = false` for date range

**Indexes:**
- Primary: id
- Foreign: cleaner_id
- Unique: (cleaner_id, date)
- Index: date, is_available
- Composite: (cleaner_id, date)

---

### 13. OrderStatusHistory
**Description:** Audit trail of order status changes.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `order_id` (uuid, FK → Order.id, required) - Order reference
- `status` (enum, required) - Status value (uses OrderStatus enum)
- `changed_by` (uuid, FK → User.id, required) - User who made the change
- `changed_at` (timestamp, required) - When status changed
- `created_at` (timestamp) - Record creation timestamp

**Relationships:**
- Belongs to Order
- Changed by User

**Indexes:**
- Primary: id
- Foreign: order_id, changed_by
- Index: status, changed_at
- Composite: (order_id, changed_at DESC)

---

### 14. Payment
**Description:** Payment transaction records. Subscriptions generate monthly recurring payments that cover all included orders. One-time plans create a single payment per order.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `order_id` (uuid, FK → Order.id, nullable) - Order reference (for one-time plan orders only)
- `subscription_id` (uuid, FK → Subscription.id, nullable) - Subscription reference (for monthly billing)
- `payment_type` (enum, required) - Type: `recurring`, `one_time`, `refund`
- `payment_method_id` (uuid, FK → PaymentMethod.id, nullable) - Payment method used
- `amount_ore` (integer, required) - Amount in øre (1/100 NOK)
  - **Constraints:** NOT NULL, >= 0
- `status` (enum, required) - Status: `pending`, `authorized`, `captured`, `failed`, `refunded`, `cancelled`
- `payment_provider` (enum, required) - Provider: `vipps`, `stripe`, `manual`
- `provider_payment_id` (string, nullable) - External payment ID
- `provider_metadata` (jsonb, nullable) - Provider response data
- `authorized_at` (timestamp, nullable) - Authorization timestamp
- `captured_at` (timestamp, nullable) - Capture timestamp
- `failed_at` (timestamp, nullable) - Failure timestamp
- `failure_reason` (text, nullable) - Failure reason
- `refunded_at` (timestamp, nullable) - Refund timestamp
- `refund_amount_ore` (integer, nullable) - Refund amount in øre (1/100 NOK)
  - **Constraints:** >= 0
- `refund_reason` (text, nullable) - Refund reason
- `created_at` (timestamp) - Payment creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Customer
- Belongs to Order (nullable, for one-time plan orders)
- Belongs to Subscription (nullable, for monthly subscription billing)
- Uses PaymentMethod (nullable)

**Notes:**
- Recurring payments (`payment_type = recurring`) have `subscription_id` set, `order_id` null, and cover all orders in that billing period
- One-time payments (`payment_type = one_time`) have `order_id` set, `subscription_id` null, and cover the full cost of a single order
- Payment amount for recurring payments matches `Subscription.billing_cost_ore` (base plan + permanent add-ons)
- Payment amount for one-time payments matches `Order.total_cost_ore` (plan price + any extras)

**Indexes:**
- Primary: id
- Unique: provider_payment_id
- Foreign: customer_id, order_id, subscription_id, payment_method_id
- Index: status, payment_provider, payment_type, created_at
- Composite: (customer_id, created_at DESC), (subscription_id, created_at DESC)

---

### 15. PaymentMethod
**Description:** Stored customer payment methods.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `type` (enum, required) - Type: `vipps`, `card`
- `is_default` (boolean, default: false) - Default payment method
  - **Constraints:** NOT NULL
  - **Business Rule:** Only one payment method per customer can have `is_default = true`. Enforce via application logic or partial unique index.
- `provider` (enum, required) - Provider: `vipps`, `stripe`, `manual`
- `provider_payment_method_id` (string, nullable) - External payment method ID
- `card_last4` (string, nullable) - Last 4 digits (for cards)
- `card_brand` (string, nullable) - Card brand (Visa, Mastercard, etc.)
- `card_exp_month` (integer, nullable) - Expiry month
- `card_exp_year` (integer, nullable) - Expiry year
- `vipps_phone` (string, nullable) - Vipps phone number
- `billing_address_id` (uuid, FK → Address.id, nullable) - Billing address
- `is_active` (boolean, default: true) - Active flag
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Customer
- Has billing Address (nullable)
- Used by many Payments

**Indexes:**
- Primary: id
- Foreign: customer_id, billing_address_id
- Index: is_default, is_active, type

---

### 16. Review
**Description:** Customer reviews of cleaners.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `order_id` (uuid, FK → Order.id, unique, required) - Order reference
- `customer_id` (uuid, FK → Customer.id, required) - Reviewer
- `cleaner_id` (uuid, FK → Cleaner.id, required) - Reviewed cleaner
- `rating` (integer, required) - Rating 1-5
  - **Constraints:** NOT NULL, CHECK (rating >= 1 AND rating <= 5)
- `comment` (text, nullable) - Review text
- `is_public` (boolean, default: true) - Public visibility
- `cleaner_response` (text, nullable) - Cleaner's response
- `responded_at` (timestamp, nullable) - Response timestamp
- `created_at` (timestamp) - Review creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Order (one-to-one)
- Written by Customer
- About Cleaner

**Indexes:**
- Primary: id
- Unique: order_id
- Foreign: customer_id, cleaner_id
- Index: rating, is_public, created_at
- Composite: (cleaner_id, created_at DESC)

---

### 17. Notification
**Description:** Notification records (SMS, email, push).

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, required) - Recipient
- `type` (enum, required) - Type: `sms`, `email`, `push`
- `channel` (enum → [NotificationChannel](#notificationchannel), required) - Notification channel/category
  - **Constraints:** NOT NULL
- `subject` (string, nullable) - Notification subject (for email)
- `message` (text, required) - Notification content
- `metadata` (jsonb, nullable) - Additional data
- `status` (enum, required) - Status: `pending`, `sent`, `failed`, `read`
- `sent_at` (timestamp, nullable) - Send timestamp
- `read_at` (timestamp, nullable) - Read timestamp
- `failed_at` (timestamp, nullable) - Failure timestamp
- `failure_reason` (text, nullable) - Failure reason
- `created_at` (timestamp) - Creation timestamp

**Relationships:**
- Belongs to User

**Indexes:**
- Primary: id
- Foreign: user_id
- Index: type, status, channel, created_at
- Composite: (user_id, created_at DESC)

---

### 18. PricingConfiguration
**Description:** System-wide pricing configuration for dynamic pricing variables. Single row table.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `extra_kg_price_ore` (integer, required) - Price per extra kg in øre (1/100 NOK)
  - **Constraints:** NOT NULL, >= 0
  - **Note:** Used to calculate charges for weight beyond plan included_kg
- `ironing_price_ore` (integer, required) - Price for basic ironing service in øre (1/100 NOK)
  - **Constraints:** NOT NULL, >= 0
  - **Note:** Applied when `Order.needs_ironing = true`
- `delicate_item_price_ore` (integer, required) - Price per delicate item in øre (1/100 NOK)
  - **Constraints:** NOT NULL, >= 0
  - **Note:** Multiplied by `Order.delicate_items_count`
- `vat_rate_percent` (decimal, required) - VAT rate percentage
  - **Constraints:** NOT NULL, >= 0, <= 100
  - **Precision:** decimal(5, 2)
  - **Example:** `25.00` for 25% Norwegian MVA
  - **Note:** For display/reporting; prices stored in entities already include VAT
- `version` (integer, required) - Configuration version number
  - **Constraints:** NOT NULL
  - **Default:** `1`
  - **Auto-increment:** Increments on every update for change tracking
- `effective_from` (timestamp, required) - When this pricing becomes effective
  - **Constraints:** NOT NULL
  - **Default:** `now()`
  - **Note:** For future-dated price changes
- `created_at` (timestamp) - Creation timestamp
  - **Default:** `now()`
- `updated_at` (timestamp) - Last update timestamp
  - **Default:** `now()`
  - **Auto-update:** Updates on every record change
- `updated_by` (uuid, FK → User.id, nullable) - Admin who updated pricing
  - **Constraints:** FOREIGN KEY

**Relationships:**
- Updated by Admin User (nullable)

**Business Rules:**
- Only ONE active pricing configuration should exist at a time
- When prices change, create audit trail (consider PricingConfigurationHistory table)
- All cost calculations reference this entity for consistency
- Changes to pricing affect new subscriptions and orders; existing subscriptions keep their calculated `billing_cost_ore` until explicitly recalculated

**Indexes:**
- Primary: id
- Foreign: updated_by

---

## Enums

### UserRole
- `customer`
- `cleaner`
- `driver`
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

### SubscriptionStatus
Status values and their meanings:
- `active` - Currently active, generates recurring orders
- `paused` - Temporarily paused, no orders generated
- `cancelled` - Cancelled by customer (final state)
- `expired` - Subscription expired (final state)

**Status Transition Flow:**
```
active ←→ paused
  ↓       ↓
cancelled (FINAL)
  or
expired (FINAL)
```

**Allowed Transitions:**
- `active` → `paused`, `cancelled`
- `paused` → `active`, `cancelled`
- `cancelled` → (no transitions, final state)
- `expired` → (no transitions, final state)

**Business Rules:**
- `active` subscriptions generate orders based on frequency
- `paused` subscriptions do not generate new orders
- `paused_at` timestamp set when status → `paused`
- `cancelled_at` timestamp set when status → `cancelled`
- `expires_at` timestamp checked to auto-transition to `expired`

### SubscriptionBillingPeriod
- `monthly` - Charged monthly
- `one_time` - One-time payment

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

### OrderStatus
Status values and their meanings:
- `pending_assignment` - Waiting for cleaner assignment
- `assigned` - Cleaner assigned
- `pickup_scheduled` - Pickup scheduled
- `en_route_pickup` - Cleaner heading to pickup
- `picked_up` - Items picked up
- `washing` - Being washed
- `en_route_delivery` - Heading to delivery
- `delivered` - Delivered to customer
- `completed` - Order completed (final state)
- `cancelled` - Order cancelled (final state)

**Status Transition Flow:**
```
pending_assignment
    ↓
assigned
    ↓
pickup_scheduled
    ↓
en_route_pickup
    ↓
picked_up
    ↓
washing
    ↓
en_route_delivery
    ↓
delivered
    ↓
completed (FINAL)

Note: Any status (except completed) can transition to → cancelled
```

**Allowed Transitions:**
- `pending_assignment` → `assigned`, `cancelled`
- `assigned` → `pickup_scheduled`, `cancelled`
- `pickup_scheduled` → `en_route_pickup`, `cancelled`
- `en_route_pickup` → `picked_up`, `cancelled`
- `picked_up` → `washing`, `cancelled`
- `washing` → `en_route_delivery`, `cancelled`
- `en_route_delivery` → `delivered`, `cancelled`
- `delivered` → `completed`
- `completed` → (no transitions, final state)
- `cancelled` → (no transitions, final state)

**Business Rules:**
- Cannot move backwards in status (except to cancelled)
- `completed` requires `delivered_at` timestamp
- `cancelled` requires `cancellation_reason`

### PaymentStatus
Status values and their meanings:
- `pending` - Payment initiated, awaiting processing
- `authorized` - Payment authorized but not yet captured
- `captured` - Payment completed and funds transferred
- `failed` - Payment failed
- `refunded` - Payment refunded to customer
- `cancelled` - Payment cancelled before capture

**Status Transition Flow:**
```
pending
  ↓
authorized ──→ captured (SUCCESS)
  ↓              ↓
cancelled    refunded (REFUND)

pending → failed (FAILURE)
```

**Allowed Transitions:**
- `pending` → `authorized`, `failed`, `cancelled`
- `authorized` → `captured`, `cancelled`
- `captured` → `refunded`
- `failed` → (no transitions, final state)
- `refunded` → (no transitions, final state)
- `cancelled` → (no transitions, final state)

**Business Rules:**
- `authorized_at` timestamp set when status → `authorized`
- `captured_at` timestamp set when status → `captured`
- `failed_at` timestamp + `failure_reason` required when → `failed`
- `refunded_at` timestamp + `refund_reason` required when → `refunded`
- Can only refund `captured` payments

### PaymentType
- `recurring` - Recurring subscription payments (covers all orders in billing period)
- `one_time` - One-time payments for single orders without subscription
- `refund` - Refund transaction

### PaymentProvider
- `vipps` - Vipps payment
- `stripe` - Stripe (card payments)
- `manual` - Manual/offline payment

### PaymentMethodType
- `vipps` - Vipps
- `card` - Credit/debit card

### NotificationType
- `sms` - SMS notification
- `email` - Email notification
- `push` - Push notification

### NotificationChannel
- `order_updates` - Order status updates
- `pickup_reminder` - Pickup reminders
- `delivery_notification` - Delivery notifications
- `payment_confirmation` - Payment confirmations
- `review_request` - Review requests
- `order_assignment` - New order assignments (cleaners)
- `account` - Account-related notifications

### NotificationStatus
- `pending` - Queued for sending
- `sent` - Successfully sent
- `failed` - Failed to send
- `read` - Read by recipient

### AdditionalServicePricingType
- `per_order` - Fixed price per order
- `per_item` - Price per item
- `per_kg` - Price per kg

---

## Business Rules

**User Roles:**
- Each user account has exactly ONE role (`customer`, `cleaner`, `driver`, or `admin`)
- Users cannot have multiple roles simultaneously - this is an intentional business constraint
- If a person needs to operate in different roles, they must create separate accounts with different email/phone
- This maintains clear separation between customer and service provider identities

**Payment Types:**
- `recurring`: `subscription_id` required, `order_id` null. Payment amount = `Subscription.billing_cost_ore`. Covers all orders in billing period.
- `one_time`: `order_id` required, `subscription_id` null. Payment amount = `Order.total_cost_ore`. Only for non-subscription orders.

**Customer Subscription Limits:**
- A customer can have only ONE active subscription at a time
- Database constraint: UNIQUE constraint on `Subscription(customer_id)` WHERE `status IN ('active', 'paused')`
- Customers can have multiple orders through `on_demand` subscription plans without multiple subscriptions
- When a subscription is `cancelled` or `expired`, the customer can create a new subscription

**Subscription Preference Inheritance:**
- Auto-generated orders inherit: `Order.extra_kg` ← `Subscription.default_extra_kg`, `Order.needs_ironing` ← `Subscription.default_needs_ironing`, `Order.delicate_items_count` ← `Subscription.default_delicate_items_count`
- `Subscription.billing_cost_ore` = `plan.price_ore + (default_extra_kg * PricingConfiguration.extra_kg_price_ore) + (default_needs_ironing ? PricingConfiguration.ironing_price_ore : 0) + (default_delicate_items_count * PricingConfiguration.delicate_item_price_ore)`

**Bag Delivery:**
- When `Order.bag_delivered_at` is set (bag successfully delivered), the system should automatically update `Customer.has_noora_bag = true`
- This ensures accurate tracking of which customers have received their NooraCare bags

**Order Status:**
- Must follow valid transitions (see OrderStatus enum)
- Cannot move backwards except to `cancelled`

**Data Retention & Deletion:**
- **Soft Delete Strategy:** User, Customer, and Cleaner entities use `deleted_at` for soft deletion
- **Anonymization on Deletion:**
  - User: `email` → `deleted_[user_id]@deleted.com`, `phone` → `null`, `full_name` → `"Deleted User"`
  - Cleaner: Encrypt/nullify `tax_id`, `bank_account`, `business_address`
- **Preserved Data:** Orders, Payments, Reviews, OrderStatusHistory retained for Norwegian financial record retention requirements (7+ years)
- **GDPR Compliance:** PII is anonymized while transactional/financial records are preserved
- **Cascading:** `deleted_at` on User should trigger `deleted_at` on related Customer/Cleaner profiles

---

## Security & Privacy

- **PII Protection:** Encrypt `Cleaner.tax_id` and `Cleaner.bank_account` fields at rest
- **RLS Policies:** Customers see own data only; cleaners see assigned orders only; admins have full access
- **Payment Data:** Never store full card numbers; use payment provider tokenization (PCI compliance)
- **Photo Storage:** Use signed URLs with time-limited access; auto-deletion after retention period