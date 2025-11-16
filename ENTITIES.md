# NooraCare Entity Model

## Overview
This document defines all entities (database tables and TypeScript types) for the NooraCare P2P laundry platform.

---

## Core Entities

### 1. User
**Description:** Base authentication entity for all platform users.

**Fields:**
- `id` (uuid, PK) - Unique identifier (Supabase Auth UUID)
- `email` (string, unique, required) - User email
- `phone` (string, unique, required) - Phone number (Norwegian format)
- `full_name` (string, required) - Full name
- `role` (enum, required) - User role: `customer`, `cleaner`, `admin`
- `created_at` (timestamp) - Account creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- `last_login_at` (timestamp, nullable) - Last login timestamp

**Relationships:**
- Has one Customer profile (if role = customer)
- Has one Cleaner profile (if role = cleaner)
- Has one Admin profile (if role = admin)

**Indexes:**
- Primary: id
- Unique: email, phone
- Index: role

---

### 2. Customer
**Description:** Extended profile for customer users.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, unique, required) - Reference to User
- `default_address_id` (uuid, FK → Address.id, nullable) - Default pickup/delivery address
- `has_noora_bag` (boolean, default: false) - Whether customer has received NooraCare bag
- `profile_image_url` (string, nullable) - Profile picture URL
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to User
- Has many Subscriptions
- Has many Orders
- Has many Reviews
- Has many Addresses
- Has many PaymentMethods

**Indexes:**
- Primary: id
- Unique: user_id
- Foreign: default_address_id

---

### 3. Cleaner
**Description:** Extended profile for cleaner users.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, unique, required) - Reference to User
- `display_name` (string, required) - Public display name
- `profile_image_url` (string, nullable) - Profile/logo URL
- `bio` (text, nullable) - About/bio section
- `verification_status` (enum, required) - Status: `pending`, `approved`, `rejected`, `suspended`
- `business_type` (enum, required) - Type: `individual`, `business`
- `tax_id` (string, required) - Personal number (11 digits) or Org number (9 digits)
- `business_name` (string, nullable) - Company name (if business_type = business)
- `business_address` (text, nullable) - Registered business address
- `bank_account` (string, required) - Norwegian bank account (11 digits)
- `base_address_id` (uuid, FK → Address.id, required) - Base operation address
- `service_radius_km` (integer, default: 5) - Service area radius in km
- `experience_level` (enum, required) - Level: `beginner`, `some`, `experienced`, `expert`, `professional`
- `languages` (string[], required) - Languages spoken (e.g., ['no', 'en'])
- `specializations` (string[], nullable) - Clothing specializations
- `daily_capacity` (string, nullable) - Wash cycles per day (e.g., '3-4')
- `weekly_capacity` (string, nullable) - Orders per week (e.g., '6-10')
- `can_pickup_deliver` (boolean, default: true) - Offers pickup/delivery service
- `created_at` (timestamp) - Profile creation timestamp
- `updated_at` (timestamp) - Last update timestamp
- `approved_at` (timestamp, nullable) - Approval timestamp
- `suspended_at` (timestamp, nullable) - Suspension timestamp

**Relationships:**
- Belongs to User
- Has many CleanerServices
- Has one base Address
- Has many Missions
- Receives many Reviews

**Indexes:**
- Primary: id
- Unique: user_id, tax_id
- Index: verification_status, base_address_id
- GeoIndex: base_address_id (for location-based queries)

---

### 4. Admin
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

### 5. Address
**Description:** Physical addresses for pickup, delivery, and business locations.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `user_id` (uuid, FK → User.id, required) - Owner of address
- `label` (string, nullable) - Address nickname (e.g., 'Home', 'Office')
- `street` (string, required) - Street address
- `postal_code` (string, required) - Norwegian postal code (4 digits)
- `city` (string, required) - City name
- `country` (string, default: 'Norway') - Country
- `special_instructions` (text, nullable) - Access instructions
- `latitude` (decimal, nullable) - GPS latitude
- `longitude` (decimal, nullable) - GPS longitude
- `is_default` (boolean, default: false) - Default address for user
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

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

### 6. SubscriptionPlan
**Description:** Subscription plan templates (catalog).

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `slug` (string, unique, required) - Plan identifier: `weekly`, `biweekly`, `single`
- `name_no` (string, required) - Norwegian name
- `name_en` (string, required) - English name
- `description_no` (text, required) - Norwegian description
- `description_en` (text, required) - English description
- `price_nok` (integer, required) - Price in NOK
- `billing_period` (enum, required) - Period: `monthly`, `one_time`
- `included_kg` (integer, default: 5) - Included kg per cycle
- `features` (string[], required) - Plan features list
- `frequency` (enum, required) - Frequency: `weekly`, `biweekly`, `on_demand`
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

### 7. Subscription
**Description:** Active customer subscriptions.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `plan_id` (uuid, FK → SubscriptionPlan.id, required) - Plan reference
- `status` (enum, required) - Status: `active`, `paused`, `cancelled`, `expired`
- `recurring_weekday` (enum, nullable) - Day: `monday`, `tuesday`, etc. (for recurring plans)
- `pickup_time_window` (string, default: '15:00-20:00') - Pickup time window
- `pickup_address_id` (uuid, FK → Address.id, required) - Pickup location
- `delivery_address_id` (uuid, FK → Address.id, required) - Delivery location
- `pickup_method` (enum, required) - Method: `home`, `entrance`, `other`
- `pickup_location_description` (text, nullable) - Detailed pickup location
- `special_instructions` (text, nullable) - Customer instructions
- `extra_kg` (integer, default: 0) - Additional kg beyond included
- `delicate_items_count` (integer, default: 0) - Delicate items per cycle
- `needs_ironing` (boolean, default: false) - Ironing service flag
- `monthly_cost_nok` (integer, required) - Total monthly cost
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
- Has pickup Address
- Has delivery Address

**Indexes:**
- Primary: id
- Foreign: customer_id, plan_id, pickup_address_id, delivery_address_id
- Index: status, next_pickup_date, recurring_weekday

---

### 8. Order
**Description:** Individual laundry order/job.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `order_number` (string, unique, required) - Human-readable order number (e.g., NC-20240101)
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `subscription_id` (uuid, FK → Subscription.id, nullable) - Subscription (if recurring)
- `plan_id` (uuid, FK → SubscriptionPlan.id, required) - Plan reference
- `cleaner_id` (uuid, FK → Cleaner.id, nullable) - Assigned cleaner
- `status` (enum, required) - Status: `pending_assignment`, `assigned`, `pickup_scheduled`, `en_route_pickup`, `at_pickup`, `picked_up`, `washing`, `drying`, `ironing`, `quality_check`, `en_route_delivery`, `delivered`, `completed`, `cancelled`
- `pickup_date` (date, required) - Scheduled pickup date
- `pickup_time_window` (string, required) - Time window (e.g., '15:00-20:00')
- `pickup_address_id` (uuid, FK → Address.id, required) - Pickup location
- `delivery_date` (date, nullable) - Scheduled/actual delivery date
- `delivery_time_window` (string, nullable) - Delivery time window
- `delivery_address_id` (uuid, FK → Address.id, required) - Delivery location
- `pickup_method` (enum, required) - Method: `home`, `entrance`, `other`
- `pickup_location_description` (text, nullable) - Detailed location
- `special_instructions` (text, nullable) - Customer instructions
- `extra_kg` (integer, default: 0) - Extra kg for this order
- `delicate_items_count` (integer, default: 0) - Delicate items count
- `needs_ironing` (boolean, default: false) - Ironing needed
- `needs_bag_delivery` (boolean, default: false) - NooraCare bag delivery needed
- `bag_delivered_at` (timestamp, nullable) - Bag delivery timestamp
- `total_cost_nok` (integer, required) - Total order cost
- `cleaner_earnings_nok` (integer, nullable) - Cleaner earnings
- `platform_fee_nok` (integer, nullable) - Platform commission
- `payment_status` (enum, required) - Status: `pending`, `authorized`, `captured`, `failed`, `refunded`
- `payment_method_id` (uuid, FK → PaymentMethod.id, nullable) - Payment method used
- `assigned_at` (timestamp, nullable) - Cleaner assignment timestamp
- `picked_up_at` (timestamp, nullable) - Actual pickup timestamp
- `delivered_at` (timestamp, nullable) - Actual delivery timestamp
- `completed_at` (timestamp, nullable) - Order completion timestamp
- `cancelled_at` (timestamp, nullable) - Cancellation timestamp
- `cancellation_reason` (text, nullable) - Reason for cancellation
- `created_at` (timestamp) - Order creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Customer
- Belongs to SubscriptionPlan
- Belongs to Subscription (nullable)
- Assigned to Cleaner (nullable)
- Has one Mission (cleaner's view)
- Has pickup Address
- Has delivery Address
- Has many Photos
- Has one Payment
- Has many MissionProgress records

**Indexes:**
- Primary: id
- Unique: order_number
- Foreign: customer_id, subscription_id, plan_id, cleaner_id, pickup_address_id, delivery_address_id, payment_method_id
- Index: status, pickup_date, payment_status
- Composite: (customer_id, created_at), (cleaner_id, status)

---

### 9. AdditionalService
**Description:** Catalog of additional services offered by cleaners.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `slug` (string, unique, required) - Service identifier: `dryer`, `drying_room`, `ironing`
- `name_no` (string, required) - Norwegian name
- `name_en` (string, required) - English name
- `description_no` (text, required) - Norwegian description
- `description_en` (text, required) - English description
- `base_price_nok` (integer, required) - Base price in NOK
- `pricing_type` (enum, required) - Type: `per_order`, `per_item`, `per_kg`
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

### 10. CleanerService
**Description:** Services offered by specific cleaners.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `cleaner_id` (uuid, FK → Cleaner.id, required) - Cleaner reference
- `service_id` (uuid, FK → AdditionalService.id, required) - Service reference
- `is_offered` (boolean, default: true) - Whether cleaner offers this service
- `custom_price_nok` (integer, nullable) - Custom pricing (overrides base price)
- `notes` (text, nullable) - Additional notes
- `created_at` (timestamp) - Creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Cleaner
- Belongs to AdditionalService

**Indexes:**
- Primary: id
- Foreign: cleaner_id, service_id
- Unique: (cleaner_id, service_id)
- Index: is_offered

---

### 11. Mission
**Description:** Cleaner's view of an assigned order.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `order_id` (uuid, FK → Order.id, unique, required) - Order reference
- `cleaner_id` (uuid, FK → Cleaner.id, required) - Assigned cleaner
- `status` (enum, required) - Current mission phase
- `accepted_at` (timestamp, nullable) - Acceptance timestamp
- `declined_at` (timestamp, nullable) - Decline timestamp
- `decline_reason` (text, nullable) - Reason for declining
- `created_at` (timestamp) - Mission creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Order (one-to-one)
- Belongs to Cleaner
- Has many MissionProgress records
- Has many Photos

**Indexes:**
- Primary: id
- Unique: order_id
- Foreign: cleaner_id
- Index: status, accepted_at

---

### 12. MissionProgress
**Description:** Tracks progress/status changes for missions.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `mission_id` (uuid, FK → Mission.id, required) - Mission reference
- `phase` (enum, required) - Phase: `assigned`, `en_route_pickup`, `at_pickup`, `picked_up`, `washing`, `en_route_delivery`, `delivered`
- `timestamp` (timestamp, required) - When phase was entered
- `notes` (text, nullable) - Progress notes
- `photo_id` (uuid, FK → Photo.id, nullable) - Associated photo
- `created_by` (uuid, FK → User.id, required) - Who created this record
- `created_at` (timestamp) - Creation timestamp

**Relationships:**
- Belongs to Mission
- May have one Photo
- Created by User

**Indexes:**
- Primary: id
- Foreign: mission_id, photo_id, created_by
- Index: phase, timestamp
- Composite: (mission_id, timestamp DESC)

---

### 13. Photo
**Description:** Photos for proof of pickup/delivery and bag placement.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `order_id` (uuid, FK → Order.id, required) - Order reference
- `mission_id` (uuid, FK → Mission.id, nullable) - Mission reference
- `uploaded_by` (uuid, FK → User.id, required) - Uploader
- `photo_type` (enum, required) - Type: `bag_delivery`, `bag_placement`, `pickup_proof`, `delivery_proof`, `issue_documentation`
- `file_url` (string, required) - Storage URL
- `thumbnail_url` (string, nullable) - Thumbnail URL
- `caption` (text, nullable) - Photo caption/notes
- `metadata` (jsonb, nullable) - EXIF data, location, etc.
- `created_at` (timestamp) - Upload timestamp

**Relationships:**
- Belongs to Order
- Belongs to Mission (nullable)
- Uploaded by User
- Used by MissionProgress records

**Indexes:**
- Primary: id
- Foreign: order_id, mission_id, uploaded_by
- Index: photo_type, created_at

---

### 14. Payment
**Description:** Payment transaction records.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `order_id` (uuid, FK → Order.id, unique, required) - Order reference
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `payment_method_id` (uuid, FK → PaymentMethod.id, nullable) - Payment method used
- `amount_nok` (integer, required) - Amount in NOK (øre)
- `currency` (string, default: 'NOK') - Currency code
- `status` (enum, required) - Status: `pending`, `authorized`, `captured`, `failed`, `refunded`, `cancelled`
- `payment_provider` (enum, required) - Provider: `vipps`, `stripe`, `manual`
- `provider_payment_id` (string, nullable) - External payment ID
- `provider_metadata` (jsonb, nullable) - Provider response data
- `authorized_at` (timestamp, nullable) - Authorization timestamp
- `captured_at` (timestamp, nullable) - Capture timestamp
- `failed_at` (timestamp, nullable) - Failure timestamp
- `failure_reason` (text, nullable) - Failure reason
- `refunded_at` (timestamp, nullable) - Refund timestamp
- `refund_amount_nok` (integer, nullable) - Refund amount
- `refund_reason` (text, nullable) - Refund reason
- `created_at` (timestamp) - Payment creation timestamp
- `updated_at` (timestamp) - Last update timestamp

**Relationships:**
- Belongs to Order (one-to-one)
- Belongs to Customer
- Uses PaymentMethod (nullable)

**Indexes:**
- Primary: id
- Unique: order_id, provider_payment_id
- Foreign: customer_id, payment_method_id
- Index: status, payment_provider, created_at

---

### 15. PaymentMethod
**Description:** Stored customer payment methods.

**Fields:**
- `id` (uuid, PK) - Unique identifier
- `customer_id` (uuid, FK → Customer.id, required) - Customer reference
- `type` (enum, required) - Type: `vipps`, `card`
- `is_default` (boolean, default: false) - Default payment method
- `provider` (enum, required) - Provider: `vipps`, `stripe`
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
- `channel` (enum, required) - Notification channel/category
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

### SubscriptionStatus
- `active` - Currently active
- `paused` - Temporarily paused
- `cancelled` - Cancelled by customer
- `expired` - Subscription expired

### SubscriptionBillingPeriod
- `monthly` - Charged monthly
- `one_time` - One-time payment

### SubscriptionFrequency
- `weekly` - Every week
- `biweekly` - Every 2 weeks
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
- `pending_assignment` - Waiting for cleaner assignment
- `assigned` - Cleaner assigned
- `pickup_scheduled` - Pickup scheduled
- `en_route_pickup` - Cleaner heading to pickup
- `at_pickup` - Cleaner at pickup location
- `picked_up` - Items picked up
- `washing` - Being washed
- `drying` - Drying
- `ironing` - Being ironed
- `quality_check` - Quality inspection
- `en_route_delivery` - Heading to delivery
- `delivered` - Delivered to customer
- `completed` - Order completed
- `cancelled` - Order cancelled

### MissionPhase
- `assigned` - Mission assigned to cleaner
- `en_route_pickup` - Heading to pickup
- `at_pickup` - At pickup location
- `picked_up` - Items collected
- `washing` - Washing in progress
- `en_route_delivery` - Heading to delivery
- `delivered` - Delivered

### PaymentStatus
- `pending` - Payment initiated
- `authorized` - Payment authorized (not captured)
- `captured` - Payment completed
- `failed` - Payment failed
- `refunded` - Payment refunded
- `cancelled` - Payment cancelled

### PaymentProvider
- `vipps` - Vipps payment
- `stripe` - Stripe (card payments)
- `manual` - Manual/offline payment

### PaymentMethodType
- `vipps` - Vipps
- `card` - Credit/debit card

### PhotoType
- `bag_delivery` - NooraCare bag delivery proof
- `bag_placement` - Customer's bag placement photo
- `pickup_proof` - Pickup verification
- `delivery_proof` - Delivery verification
- `issue_documentation` - Issue/problem documentation

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
- `mission_assignment` - New mission assignments (cleaners)
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

## Relationships Summary

### One-to-One
- User → Customer/Cleaner/Admin (via role)
- Order → Mission
- Order → Payment
- Order → Review

### One-to-Many
- Customer → Subscriptions
- Customer → Orders
- Customer → PaymentMethods
- Customer → Reviews (written)
- Cleaner → CleanerServices
- Cleaner → Missions
- Cleaner → Reviews (received)
- SubscriptionPlan → Subscriptions
- SubscriptionPlan → Orders
- Subscription → Orders
- Order → Photos
- Order → MissionProgress
- Mission → MissionProgress
- Mission → Photos
- AdditionalService → CleanerServices
- User → Addresses
- User → Notifications

### Many-to-Many
- (handled through junction tables)
- Cleaner ←→ AdditionalService (via CleanerService)

---

## Data Integrity Rules

1. **User Role Consistency:**
   - A User with role=customer must have a Customer profile
   - A User with role=cleaner must have a Cleaner profile
   - A User with role=admin must have an Admin profile

2. **Address Consistency:**
   - Pickup and delivery addresses for an Order must exist
   - Cleaner base address must exist

3. **Order State Machine:**
   - Order status must follow valid transitions
   - Cannot move backwards in status (except cancellation)

4. **Payment Consistency:**
   - Order total_cost_nok = plan price + additional services
   - Payment amount must match order total
   - Payment must be captured before order completion

5. **Subscription Auto-generation:**
   - Active subscriptions should auto-generate orders based on schedule
   - Next_pickup_date should be updated after each order

6. **Cleaner Capacity:**
   - Cleaners cannot exceed weekly_capacity
   - Should check availability before assignment

7. **Review Constraints:**
   - Can only review completed orders
   - One review per order
   - Customer must be the order customer

8. **Photo Requirements:**
   - Pickup with method ≠ 'home' requires bag_placement photo
   - Delivery requires delivery_proof photo

---

## Performance Considerations

1. **Geolocation Queries:**
   - Use PostGIS for distance calculations
   - Index (latitude, longitude) on Address table
   - Consider caching service areas

2. **Order Listing:**
   - Composite index on (customer_id, created_at DESC)
   - Composite index on (cleaner_id, status)
   - Consider materialized view for dashboard stats

3. **Cleaner Matching:**
   - Index on cleaner.verification_status
   - GeoIndex for location-based queries
   - Cache available cleaners per area

4. **Notification Queue:**
   - Index on (status, created_at)
   - Bulk processing for pending notifications
   - Archive old notifications

5. **Review Aggregation:**
   - Keep denormalized rating_average and rating_count on Cleaner
   - Update via trigger on Review insert/update

---

## Security & Privacy

1. **PII Protection:**
   - Encrypt tax_id, bank_account fields
   - Row-level security (RLS) for customer/cleaner data
   - Audit logging for sensitive data access

2. **RLS Policies:**
   - Customers can only see their own data
   - Cleaners can only see assigned mission details
   - Admins have full access

3. **Payment Data:**
   - Never store full card numbers
   - Use payment provider tokenization
   - PCI compliance for card handling

4. **Photo Storage:**
   - Secure S3/Supabase Storage with signed URLs
   - Time-limited access to photos
   - Automatic deletion after retention period

---

## Migration Strategy

1. Create base tables (User, Address)
2. Create profile tables (Customer, Cleaner, Admin)
3. Create catalog tables (SubscriptionPlan, AdditionalService)
4. Create transactional tables (Order, Subscription)
5. Create supporting tables (Payment, Review, Notification, Photo)
6. Create junction tables (CleanerService)
7. Add foreign key constraints
8. Add indexes
9. Set up RLS policies
10. Add triggers for denormalized data
