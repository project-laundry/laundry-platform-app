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
- Has one Driver profile (if role = driver)
- Has one Admin profile (if role = admin)
- Has many Addresses
- Has many Notifications

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
- Has many Reviews
- Has many PaymentMethods

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
- `bank_account` (string, required) - Norwegian bank account
  - **Validation:** 11 digits (Norwegian bank account format)
- `base_address_id` (uuid, FK → [Address](#6-address).id, required) - Base operation address
- `experience_level` (enum → [CleanerExperienceLevel](#cleanerexperiencelevel), required) - Experience level
- `languages` (string[], required) - Languages spoken
  - **Validation:** ISO 639-1 codes (e.g., `['no', 'en']`), at least 1 language
- `specializations` (enum[] → [CleanerSpecialization](#cleanerspecialization), nullable) - Clothing specializations
  - **Note:** Can select multiple specializations
- `daily_capacity` (integer, nullable) - Maximum wash cycles per day
  - **Constraints:** >= 1, <= 20
- `weekly_schedule` (jsonb, nullable) - Weekly availability pattern
  - **Format:** `{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}`
  - **Note:** Defines which weekdays cleaner accepts orders. If null, cleaner must set availability before receiving orders.
- `is_accepting_orders` (boolean) - Whether cleaner is accepting new orders
  - **Default:** `true`
  - **Note:** Vacation mode toggle. When false, cleaner receives no new assignments.
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- `approved_at` (timestamp, nullable) - Approval timestamp
- `suspended_at` (timestamp, nullable) - Suspension timestamp
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

- Unique: user_id, tax_id
- Index: verification_status, base_address_id
- GeoIndex: base_address_id (for location-based queries)

---

### Driver

**Description:** Profile for drivers who handle pickups and deliveries.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, unique, required) - Reference to User
- `display_name` (string, required) - Public display name
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Belongs to User
- Has many Orders as pickup_driver (through Order.pickup_driver_id)
- Has many Orders as delivery_driver (through Order.delivery_driver_id)

**Indexes:**

- Unique: user_id

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
- `country` (string) - Country
  - **Default:** `'Norway'`
  - **Validation:** Max 100 chars
- `special_instructions` (text, nullable) - Access instructions
  - **Validation:** Max 500 chars
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
- `default_extra_kg` (integer, default: 0) - Permanent extra kg added to subscription
- `default_needs_ironing` (boolean, default: false) - Permanent ironing preference
- `default_delicate_items_count` (integer, default: 0) - Permanent delicate items count
- `recurring_weekday` (enum → [Weekday](#weekday), nullable) - Preferred weekday for recurring pickups based on subscription frequency
  - **Note:** For biweekly frequency, this weekday repeats every 2 weeks from `started_at`. For monthly, it represents the target weekday if possible within the month.
- `status` (enum, required) - Status: `active`, `paused`, `cancelled`, `expired`
- `billing_cost_ore` (integer, required) - Total billing cost in øre, calculated from plan price + permanent add-ons
  - **Constraints:** >= 0
  - **Note:** Named "billing" (not "monthly") because it applies to both monthly and one_time billing periods
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

- Foreign: customer_id, plan_id
- Index: status

---

### Order

**Description:** Represents orders/tasks in the system. Supports two types: laundry orders (pickup and delivery) and bag deliveries. The `order_type` field determines which fields are applicable.

**Fields:**

**Common Fields (all order types):**

- `id` (uuid, PK) - Unique identifier
- `order_number` (string, unique, required) - Human-readable order number
- `order_type` (enum → [OrderType](#ordertype), required) - Type of order
  - **Default:** `laundry`
- `customer_id` (uuid, FK → [Customer](#2-customer).id, required) - Customer reference
  - **On Delete:** CASCADE
- `status` (enum → [OrderStatus](#orderstatus), required) - Order status
  - **Default:** `pending_assignment`
- `address_id` (uuid, FK → [Address](#6-address).id, required) - Delivery/pickup location
- `assigned_driver_id` (uuid, FK → [Driver](#4-driver).id, nullable) - Assigned driver for this task
  - **Note:** Used for routing; represents the driver assigned to complete this specific task
- `scheduled_date` (date, required) - Scheduled date for this task
  - **Validation:** Must be >= today
  - **Note:** For driver routing and optimization
- `special_instructions` (text, nullable) - Special instructions
  - **Validation:** Max 1000 chars
- `declined_by_cleaner_ids` (uuid[], nullable) - Array of cleaner IDs who declined this order
  - **Note:** Used during reassignment to prevent offering order to same cleaner again
- `completed_at` (timestamp, nullable) - Task completion timestamp
- `cancelled_at` (timestamp, nullable) - Cancellation timestamp
- `cancellation_reason` (text, nullable) - Reason for cancellation
  - **Validation:** Required if status = `cancelled`, max 500 chars
- `created_at` (timestamp) - Order creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Laundry Order Fields (order_type = 'laundry'):**

- `subscription_id` (uuid, FK → [Subscription](#8-subscription).id, nullable) - Subscription reference
  - **Note:** Set if order is part of subscription, null for one-time orders
  - **Applicable to:** `laundry` type only
- `plan_id` (uuid, FK → [SubscriptionPlan](#7-subscriptionplan).id, nullable) - Plan reference
  - **Required for:** `laundry` type
- `cleaner_id` (uuid, FK → [Cleaner](#3-cleaner).id, nullable) - Assigned cleaner
  - **Applicable to:** `laundry` type only
- `pickup_date` (date, nullable) - Scheduled pickup date
  - **Required for:** `laundry` type
  - **Validation:** Must be >= today
  - **Note:** Should match `scheduled_date` for routing consistency
- `delivery_date` (date, nullable) - Scheduled/actual delivery date
  - **Validation:** Must be >= pickup_date
  - **Applicable to:** `laundry` type
- `pickup_method` (enum → [PickupMethod](#pickupmethod), nullable) - Pickup method
  - **Required for:** `laundry` type
- `pickup_location_description` (text, nullable) - Detailed pickup location
  - **Validation:** Required if `pickup_method = 'other'`, max 500 chars
  - **Applicable to:** `laundry` type
- `extra_kg` (integer, nullable) - Extra kg for this order
  - **Default:** `0`
  - **Constraints:** >= 0, <= 20
  - **Applicable to:** `laundry` type
- `delicate_items_count` (integer, nullable) - Delicate items count
  - **Default:** `0`
  - **Constraints:** >= 0, <= 50
  - **Applicable to:** `laundry` type
- `needs_ironing` (boolean, nullable) - Ironing needed
  - **Default:** `false`
  - **Applicable to:** `laundry` type
- `actual_weight_kg` (decimal(5,2), nullable) - Actual weight measured at pickup
  - **Note:** Set by cleaner/driver during pickup
  - **Applicable to:** `laundry` type
- `weight_overage_charge_ore` (integer, nullable) - Additional charge for weight exceeding plan
  - **Constraints:** >= 0
  - **Applicable to:** `laundry` type
- `total_cost_ore` (integer, nullable) - Total order cost in øre
  - **Constraints:** >= 0
  - **Required for:** `laundry` type
  - **Calculation:** Plan price + extras (kg, ironing, delicate items) + weight_overage_charge_ore
- `pickup_driver_id` (uuid, FK → [Driver](#4-driver).id, nullable) - Driver who handled pickup
  - **Applicable to:** `laundry` type
  - **Note:** Different from `assigned_driver_id`; this tracks who actually did the pickup
- `delivery_driver_id` (uuid, FK → [Driver](#4-driver).id, nullable) - Driver who handled delivery
  - **Applicable to:** `laundry` type
  - **Note:** Different from `assigned_driver_id`; this tracks who actually did the delivery
- `assigned_at` (timestamp, nullable) - Cleaner assignment timestamp
  - **Applicable to:** `laundry` type
- `picked_up_at` (timestamp, nullable) - Actual pickup timestamp
  - **Applicable to:** `laundry` type
- `delivered_at` (timestamp, nullable) - Actual delivery timestamp
  - **Applicable to:** `laundry` type
- `mission_accepted_at` (timestamp, nullable) - When cleaner accepted the order
  - **Applicable to:** `laundry` type
- `mission_declined_at` (timestamp, nullable) - When cleaner declined the order
  - **Applicable to:** `laundry` type
- `mission_decline_reason` (text, nullable) - Reason for declining
  - **Validation:** Required if cleaner declines, max 500 chars
  - **Applicable to:** `laundry` type
- `related_bag_order_id` (uuid, FK → Order.id, nullable) - Reference to prerequisite bag delivery
  - **Note:** If this laundry order requires bags to be delivered first
  - **Applicable to:** `laundry` type
  - **Business Rule:** Laundry order cannot move to pickup status until related bag order is completed

**Bag Delivery Fields (order_type = 'bag_delivery'):**

- `bag_quantity` (integer, nullable) - Number of bags to deliver
  - **Default:** `1`
  - **Constraints:** >= 1, <= 10
  - **Required for:** `bag_delivery` type
- `bag_delivered_at` (timestamp, nullable) - Bag delivery timestamp
  - **Applicable to:** `bag_delivery` type
- `bag_placement_photo_url` (string, nullable) - Placement photo URL
  - **Validation:** max 500 chars
  - **Applicable to:** `bag_delivery` type
- `related_laundry_order_id` (uuid, FK → Order.id, nullable) - Reference to the laundry order this supports
  - **Note:** Links bag delivery to the upcoming laundry order
  - **Applicable to:** `bag_delivery` type

**Relationships:**

- Belongs to Customer
- Belongs to SubscriptionPlan (laundry only)
- Belongs to Subscription (laundry only, nullable)
- Assigned to Cleaner (laundry only)
- Pickup handled by Driver (laundry only)
- Delivery handled by Driver (laundry only)
- Has assigned Driver (all types, for routing)
- Has one Address (all types)
- Has many Payments (laundry only)
- Has many OrderStatusHistory records
- Self-referential: bag_delivery links to laundry via `related_laundry_order_id`, laundry links to bag_delivery via `related_bag_order_id`

**Indexes:**

- Unique: order_number
- Foreign: customer_id, subscription_id, plan_id, cleaner_id, address_id, pickup_driver_id, delivery_driver_id, assigned_driver_id
- Index: order_type, status, scheduled_date, pickup_date
- Composite: (order_type, customer_id, created_at), (order_type, cleaner_id, status), (assigned_driver_id, scheduled_date, order_type)

---

### AdditionalService

**Description:** Catalog of additional services offered by cleaners.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `slug` (string, unique, required) - Service identifier: `dryer`, `drying_room`, `ironing`
- `name` (string, required) - Norwegian name
- `description` (text, required) - Norwegian description
- `base_price_ore` (integer, required) - Base price in øre
  - **Constraints:** >= 0
- `pricing_type` (enum → [AdditionalServicePricingType](#additionalservicepricingtype), required) - Pricing type
- `is_active` (boolean, default: true) - Active flag
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**

- Has many CleanerServices (cleaner-specific offerings)

**Indexes:**

- Unique: slug
- Index: is_active

---

### CleanerService

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

- Foreign: cleaner_id, service_id
- Unique: (cleaner_id, service_id)

---

### OrderStatusHistory

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

- Foreign: order_id, changed_by
- Index: status, changed_at
- Composite: (order_id, changed_at DESC)

---

### Payment

**Description:** Payment transaction records. Subscriptions generate monthly recurring payments that cover all included orders. One-time plans create a single payment per order.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `order_id` (uuid, FK → Order.id, nullable) - Order reference (for one-time plan orders only)
- `subscription_id` (uuid, FK → Subscription.id, nullable) - Subscription reference (for monthly billing)
- `payment_type` (enum, required) - Type: `recurring`, `one_time`, `refund`
- `payment_method_id` (uuid, FK → PaymentMethod.id, nullable) - Payment method used
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
- Uses PaymentMethod (nullable)

**Notes:**

- Recurring payments (`payment_type = recurring`) have `subscription_id` set, `order_id` null, and cover all orders in that billing period
- One-time payments (`payment_type = one_time`) have `order_id` set, `subscription_id` null, and cover the full cost of a single order
- Payment amount for recurring payments matches `Subscription.billing_cost_ore` (base plan + permanent add-ons)
- Payment amount for one-time payments matches `Order.total_cost_ore` (plan price + any extras)

**Indexes:**

- Unique: provider_payment_id
- Foreign: customer_id, order_id, subscription_id, payment_method_id
- Index: status, payment_provider, payment_type, created_at
- Composite: (customer_id, created_at DESC), (subscription_id, created_at DESC)

---

### PaymentMethod

**Description:** Stored customer payment methods.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `type` (enum, required) - Type: `vipps`, `card`
- `is_default` (boolean, default: false) - Default payment method
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

- Foreign: customer_id, billing_address_id
- Index: is_default, is_active, type

---

### Review

**Description:** Customer reviews of cleaners.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `order_id` (uuid, FK → Order.id, unique, required) - Order reference
- `customer_id` (uuid, FK → Customer.id, required) - Reviewer
- `cleaner_id` (uuid, FK → Cleaner.id, required) - Reviewed cleaner
- `rating` (integer, required) - Rating 1-5
  - **Constraints:** CHECK (rating >= 1 AND rating <= 5)
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

- Unique: order_id
- Foreign: customer_id, cleaner_id
- Index: rating, is_public, created_at
- Composite: (cleaner_id, created_at DESC)

---

### 16. Notification

**Description:** Notification records (SMS, email, push).

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, required) - Recipient
- `type` (enum, required) - Type: `sms`, `email`, `push`
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

- Foreign: user_id
- Index: type, status, channel, created_at
- Composite: (user_id, created_at DESC)

---

### PricingConfiguration

**Description:** System-wide pricing configuration for dynamic pricing variables. Single row table.

**Fields:**

- `id` (uuid, PK) - Unique identifier
- `extra_kg_price_ore` (integer, required) - Price per extra kg in øre
  - **Constraints:** >= 0
  - **Note:** Used to calculate charges for weight beyond plan included_kg
- `ironing_price_ore` (integer, required) - Price for basic ironing service in øre
  - **Constraints:** >= 0
  - **Note:** Applied when `Order.needs_ironing = true`
- `delicate_item_price_ore` (integer, required) - Price per delicate item in øre
  - **Constraints:** >= 0
  - **Note:** Multiplied by `Order.delicate_items_count`
- `vat_rate_percent` (decimal(5,2), required) - VAT rate percentage
  - **Constraints:** >= 0, <= 100
  - **Example:** `25.00` for 25% Norwegian MVA
  - **Note:** For display/reporting; prices stored in entities already include VAT
- `version` (integer, required) - Configuration version number
  - **Default:** `1`
  - **Auto-increment:** Increments on every update for change tracking
- `effective_from` (timestamp, required) - When this pricing becomes effective
  - **Note:** For future-dated price changes
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- `updated_by` (uuid, FK → User.id, nullable) - Admin who updated pricing

**Relationships:**

- Updated by Admin User (nullable)

**Business Rules:**

- Only ONE active pricing configuration should exist at a time
- When prices change, create audit trail (consider PricingConfigurationHistory table)
- All cost calculations reference this entity for consistency
- Changes to pricing affect new subscriptions and orders; existing subscriptions keep their calculated `billing_cost_ore` until explicitly recalculated

**Indexes:**

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

### OrderType

- `laundry` - Standard laundry pickup and delivery order
- `bag_delivery` - NooraCare bag delivery to customer

### OrderStatus

- `pending_assignment` - Waiting for driver/cleaner assignment
- `assigned` - Driver/cleaner assigned
- `pickup_scheduled` - Pickup scheduled (laundry only)
- `en_route_pickup` - Driver heading to location (for bag delivery: heading to deliver; for laundry: heading to pick up)
- `picked_up` - Items picked up (laundry only)
- `en_route_delivery` - Heading to delivery (laundry only)
- `delivered` - Delivered to customer (for bag delivery: bags delivered; for laundry: laundry delivered)
- `completed` - Order completed (final state)
- `cancelled` - Order cancelled (final state)

**Note:** Some statuses have different semantic meanings based on `order_type`. For `bag_delivery` orders, the flow is simpler: `pending_assignment` → `assigned` → `en_route_pickup` (driver heading to deliver bags) → `delivered` → `completed`.

### AdditionalServicePricingType

- `per_order` - Fixed price per order
- `per_item` - Price per item
- `per_kg` - Price per kg

---

## Security & Privacy

- **RLS Policies:** Customers see own data only; cleaners see assigned orders only; admins have full access