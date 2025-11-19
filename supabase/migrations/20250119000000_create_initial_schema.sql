-- =============================================================================
-- NooraCare Database Schema
-- Generated from ENTITIES.md specification
-- =============================================================================

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('customer', 'cleaner', 'admin');

CREATE TYPE cleaner_verification_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TYPE cleaner_business_type AS ENUM ('individual', 'business');

CREATE TYPE cleaner_experience_level AS ENUM ('beginner', 'some', 'experienced', 'expert', 'professional');

CREATE TYPE cleaner_specialization AS ENUM ('wool', 'silk', 'down', 'sportswear', 'leather', 'delicate', 'formal', 'outerwear');

CREATE TYPE subscription_billing_period AS ENUM ('monthly', 'one_time');

CREATE TYPE subscription_status AS ENUM ('pending_payment', 'active', 'paused', 'cancelled', 'expired');

CREATE TYPE subscription_frequency AS ENUM ('weekly', 'biweekly', 'monthly', 'on_demand');

CREATE TYPE weekday AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

CREATE TYPE pickup_method AS ENUM ('home', 'entrance', 'other');

CREATE TYPE bag_delivery_status AS ENUM ('pending', 'scheduled', 'en_route', 'delivered', 'completed', 'cancelled');

CREATE TYPE order_status AS ENUM ('pending_assignment', 'pickup_scheduled', 'picked_up', 'in_cleaning', 'ready_for_delivery', 'out_for_delivery', 'completed', 'cancelled');

CREATE TYPE payment_type AS ENUM ('recurring', 'one_time', 'refund');

CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'failed', 'refunded', 'cancelled');

CREATE TYPE payment_provider AS ENUM ('vipps', 'stripe', 'manual');

-- =============================================================================
-- HELPER FUNCTION FOR updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================================================
-- TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Users Table
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(255) NOT NULL UNIQUE,
    phone varchar(20) NOT NULL UNIQUE,
    full_name varchar(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'customer',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_login_at timestamptz,
    deleted_at timestamptz,

    CONSTRAINT users_full_name_length CHECK (char_length(full_name) >= 2),
    CONSTRAINT users_phone_format CHECK (phone ~ '^\+47[0-9]{8}$')
);

CREATE INDEX idx_users_role ON users(role);
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Addresses Table
-- -----------------------------------------------------------------------------
CREATE TABLE addresses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label varchar(50),
    street varchar(200) NOT NULL,
    postal_code varchar(4) NOT NULL,
    city varchar(100) NOT NULL,
    country varchar(100) NOT NULL DEFAULT 'Norway',
    special_instructions text,
    latitude decimal(10, 8),
    longitude decimal(11, 8),
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT addresses_street_length CHECK (char_length(street) >= 3),
    CONSTRAINT addresses_city_length CHECK (char_length(city) >= 2),
    CONSTRAINT addresses_postal_code_format CHECK (postal_code ~ '^[0-9]{4}$'),
    CONSTRAINT addresses_special_instructions_length CHECK (char_length(special_instructions) <= 500),
    CONSTRAINT addresses_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
    CONSTRAINT addresses_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180))
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_postal_code ON addresses(postal_code);
CREATE INDEX idx_addresses_city ON addresses(city);
CREATE INDEX idx_addresses_geo ON addresses(latitude, longitude);
CREATE UNIQUE INDEX idx_addresses_one_default_per_user ON addresses(user_id) WHERE is_default = true;
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Customers Table
-- -----------------------------------------------------------------------------
CREATE TABLE customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    laundry_bags_count integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz,

    CONSTRAINT customers_laundry_bags_count_positive CHECK (laundry_bags_count >= 0)
);

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Cleaners Table
-- -----------------------------------------------------------------------------
CREATE TABLE cleaners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name varchar(100) NOT NULL,
    profile_image_url varchar(500),
    bio text,
    verification_status cleaner_verification_status NOT NULL DEFAULT 'pending',
    business_type cleaner_business_type NOT NULL,
    tax_id varchar(50) NOT NULL UNIQUE,
    business_name varchar(200),
    business_address text,
    bank_account varchar(11) NOT NULL,
    base_address_id uuid NOT NULL REFERENCES addresses(id),
    experience_level cleaner_experience_level NOT NULL,
    languages text[] NOT NULL,
    specializations cleaner_specialization[],
    weekly_schedule jsonb NOT NULL DEFAULT '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": true, "sat": false, "sun": false}'::jsonb,
    is_accepting_orders boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz,
    suspended_at timestamptz,
    deleted_at timestamptz,

    CONSTRAINT cleaners_display_name_length CHECK (char_length(display_name) >= 2),
    CONSTRAINT cleaners_bio_length CHECK (char_length(bio) <= 1000),
    CONSTRAINT cleaners_bank_account_format CHECK (bank_account ~ '^[0-9]{11}$'),
    CONSTRAINT cleaners_languages_not_empty CHECK (array_length(languages, 1) >= 1),
    CONSTRAINT cleaners_business_address_length CHECK (char_length(business_address) <= 300)
);

CREATE INDEX idx_cleaners_verification_status ON cleaners(verification_status);
CREATE INDEX idx_cleaners_base_address_id ON cleaners(base_address_id);
CREATE TRIGGER update_cleaners_updated_at BEFORE UPDATE ON cleaners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Admins Table
-- -----------------------------------------------------------------------------
CREATE TABLE admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE REFERENCES users(id),
    permissions text[] NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Bag Deliveries Table
-- -----------------------------------------------------------------------------
CREATE TABLE bag_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_number varchar(6) NOT NULL UNIQUE,
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    address_id uuid NOT NULL REFERENCES addresses(id),
    status bag_delivery_status NOT NULL DEFAULT 'pending',
    bag_quantity integer NOT NULL DEFAULT 1,
    scheduled_date date NOT NULL,
    special_instructions text,
    delivered_at timestamptz,
    placement_photo_url varchar(500),
    cancelled_at timestamptz,
    cancellation_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT bag_deliveries_bag_quantity_range CHECK (bag_quantity >= 1 AND bag_quantity <= 10),
    CONSTRAINT bag_deliveries_special_instructions_length CHECK (char_length(special_instructions) <= 500),
    CONSTRAINT bag_deliveries_cancellation_reason_length CHECK (char_length(cancellation_reason) <= 500)
);

CREATE INDEX idx_bag_deliveries_customer_id ON bag_deliveries(customer_id);
CREATE INDEX idx_bag_deliveries_address_id ON bag_deliveries(address_id);
CREATE INDEX idx_bag_deliveries_status ON bag_deliveries(status);
CREATE INDEX idx_bag_deliveries_scheduled_date ON bag_deliveries(scheduled_date);
CREATE INDEX idx_bag_deliveries_customer_created ON bag_deliveries(customer_id, created_at DESC);
CREATE TRIGGER update_bag_deliveries_updated_at BEFORE UPDATE ON bag_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Subscription Plans Table
-- -----------------------------------------------------------------------------
CREATE TABLE subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug varchar(50) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    description text NOT NULL,
    price_ore integer NOT NULL,
    billing_period subscription_billing_period NOT NULL,
    included_kg integer NOT NULL DEFAULT 5,
    features text[] NOT NULL,
    frequency subscription_frequency NOT NULL,
    is_popular boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT subscription_plans_price_ore_positive CHECK (price_ore >= 0),
    CONSTRAINT subscription_plans_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_sort_order ON subscription_plans(sort_order);
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Subscriptions Table
-- -----------------------------------------------------------------------------
CREATE TABLE subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES customers(id),
    plan_id uuid NOT NULL REFERENCES subscription_plans(id),
    assigned_cleaner_id uuid REFERENCES cleaners(id),
    default_extra_kg integer NOT NULL DEFAULT 0,
    default_needs_ironing boolean NOT NULL DEFAULT false,
    default_delicate_items_count integer NOT NULL DEFAULT 0,
    recurring_weekday weekday,
    status subscription_status NOT NULL DEFAULT 'pending_payment',
    billing_cost_ore integer NOT NULL,
    next_billing_date date,
    started_at timestamptz,
    paused_at timestamptz,
    cancelled_at timestamptz,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT subscriptions_billing_cost_ore_positive CHECK (billing_cost_ore >= 0),
    CONSTRAINT subscriptions_default_extra_kg_positive CHECK (default_extra_kg >= 0),
    CONSTRAINT subscriptions_default_delicate_items_count_positive CHECK (default_delicate_items_count >= 0),
    CONSTRAINT subscriptions_expires_after_started CHECK (expires_at IS NULL OR started_at IS NULL OR expires_at >= started_at),
    CONSTRAINT subscriptions_next_billing_after_started CHECK (next_billing_date IS NULL OR started_at IS NULL OR next_billing_date > started_at::date)
);

CREATE INDEX idx_subscriptions_customer_id ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_assigned_cleaner_id ON subscriptions(assigned_cleaner_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE UNIQUE INDEX idx_subscriptions_one_active_per_customer ON subscriptions(customer_id) WHERE status IN ('pending_payment', 'active', 'paused');
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Orders Table
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number varchar(6) NOT NULL UNIQUE,
    customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    subscription_id uuid REFERENCES subscriptions(id),
    plan_id uuid NOT NULL REFERENCES subscription_plans(id),
    cleaner_id uuid REFERENCES cleaners(id),
    status order_status NOT NULL DEFAULT 'pending_assignment',
    address_id uuid NOT NULL REFERENCES addresses(id),
    scheduled_date date NOT NULL,
    delivery_date date NOT NULL,
    pickup_method pickup_method NOT NULL,
    pickup_location_description text,
    special_instructions text,
    extra_kg integer NOT NULL DEFAULT 0,
    delicate_items_count integer NOT NULL DEFAULT 0,
    needs_ironing boolean NOT NULL DEFAULT false,
    total_cost_ore integer NOT NULL,
    prerequisite_bag_delivery_id uuid REFERENCES bag_deliveries(id),
    declined_by_cleaner_ids uuid[],
    assigned_at timestamptz,
    picked_up_at timestamptz,
    in_cleaning_at timestamptz,
    ready_for_delivery_at timestamptz,
    out_for_delivery_at timestamptz,
    completed_at timestamptz,
    cancelled_at timestamptz,
    cancellation_reason text,
    mission_accepted_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT orders_delivery_after_scheduled CHECK (delivery_date >= scheduled_date),
    CONSTRAINT orders_total_cost_ore_positive CHECK (total_cost_ore >= 0),
    CONSTRAINT orders_extra_kg_range CHECK (extra_kg >= 0 AND extra_kg <= 20),
    CONSTRAINT orders_delicate_items_count_range CHECK (delicate_items_count >= 0 AND delicate_items_count <= 50),
    CONSTRAINT orders_pickup_location_description_length CHECK (char_length(pickup_location_description) <= 500),
    CONSTRAINT orders_special_instructions_length CHECK (char_length(special_instructions) <= 1000),
    CONSTRAINT orders_cancellation_reason_length CHECK (char_length(cancellation_reason) <= 500)
);

CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_subscription_id ON orders(subscription_id);
CREATE INDEX idx_orders_plan_id ON orders(plan_id);
CREATE INDEX idx_orders_cleaner_id ON orders(cleaner_id);
CREATE INDEX idx_orders_address_id ON orders(address_id);
CREATE INDEX idx_orders_prerequisite_bag_delivery_id ON orders(prerequisite_bag_delivery_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_scheduled_date ON orders(scheduled_date);
CREATE INDEX idx_orders_customer_created ON orders(customer_id, created_at DESC);
CREATE INDEX idx_orders_cleaner_status ON orders(cleaner_id, status);
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Payments Table
-- -----------------------------------------------------------------------------
CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES customers(id),
    order_id uuid REFERENCES orders(id),
    subscription_id uuid REFERENCES subscriptions(id),
    payment_type payment_type NOT NULL,
    amount_ore integer NOT NULL,
    status payment_status NOT NULL,
    payment_provider payment_provider NOT NULL,
    provider_payment_id varchar(255) UNIQUE,
    provider_metadata jsonb,
    authorized_at timestamptz,
    captured_at timestamptz,
    failed_at timestamptz,
    failure_reason text,
    refunded_at timestamptz,
    refund_amount_ore integer,
    refund_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT payments_amount_ore_positive CHECK (amount_ore >= 0),
    CONSTRAINT payments_refund_amount_ore_positive CHECK (refund_amount_ore IS NULL OR refund_amount_ore >= 0),
    CONSTRAINT payments_order_xor_subscription CHECK ((order_id IS NOT NULL) != (subscription_id IS NOT NULL))
);

CREATE INDEX idx_payments_customer_id ON payments(customer_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_payment_provider ON payments(payment_provider);
CREATE INDEX idx_payments_payment_type ON payments(payment_type);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_customer_created ON payments(customer_id, created_at DESC);
CREATE INDEX idx_payments_subscription_created ON payments(subscription_id, created_at DESC);
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleaners ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE bag_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
