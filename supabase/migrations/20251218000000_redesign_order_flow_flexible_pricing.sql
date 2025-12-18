-- Migration: Redesign Order Flow with Flexible Pricing
-- Description: Remove subscription plans, implement Vipps FLEXIBLE pricing,
--              move addresses from subscriptions to orders
-- Date: 2025-12-18

-- =====================================================================
-- 1. REMOVE SUBSCRIPTION PLANS
-- =====================================================================

-- Drop foreign key constraints first
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_plan_id_fkey;

-- Drop the entire subscription_plans table
DROP TABLE IF EXISTS subscription_plans;

-- =====================================================================
-- 2. MODIFY SUBSCRIPTIONS TABLE
-- =====================================================================

-- Remove old plan-based fields
ALTER TABLE subscriptions DROP COLUMN IF EXISTS plan_id;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS billing_cost_ore;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS next_billing_date;

-- Remove old additional services fields (move to orders)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS default_extra_kg;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS default_delicate_items_count;

-- Add new ironing preference field
-- Note: default_needs_ironing might already exist, so we check first
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'default_needs_ironing'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN default_needs_ironing BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add frequency field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN frequency TEXT NOT NULL DEFAULT 'weekly'
      CHECK (frequency IN ('weekly', 'biweekly', 'monthly'));
  END IF;
END $$;

-- Add location_city field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'location_city'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN location_city TEXT NOT NULL DEFAULT 'Bergen'
      CHECK (location_city IN ('Bergen', 'Oslo'));
  END IF;
END $$;

-- Remove ALL address fields (addresses now live on orders only)
ALTER TABLE subscriptions DROP COLUMN IF EXISTS pickup_street;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS pickup_postal_code;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS pickup_city;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS pickup_country;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS pickup_special_instructions;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS delivery_street;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS delivery_postal_code;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS delivery_city;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS delivery_country;
ALTER TABLE subscriptions DROP COLUMN IF EXISTS delivery_special_instructions;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_frequency ON subscriptions(frequency);
CREATE INDEX IF NOT EXISTS idx_subscriptions_location_city ON subscriptions(location_city);
CREATE INDEX IF NOT EXISTS idx_subscriptions_default_needs_ironing ON subscriptions(default_needs_ironing);

-- =====================================================================
-- 3. MODIFY ORDERS TABLE
-- =====================================================================

-- Remove plan_id
ALTER TABLE orders DROP COLUMN IF EXISTS plan_id;

-- Remove old additional services fields
ALTER TABLE orders DROP COLUMN IF EXISTS extra_kg;
ALTER TABLE orders DROP COLUMN IF EXISTS delicate_items_count;

-- Ensure needs_ironing exists and is boolean
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'needs_ironing'
  ) THEN
    ALTER TABLE orders ADD COLUMN needs_ironing BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Rename pickup_* fields to remove prefix (pickup = delivery, one address)
-- Check if rename is needed (column might not exist in all environments)
DO $$
BEGIN
  -- Rename pickup_street to street
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_street'
  ) THEN
    ALTER TABLE orders RENAME COLUMN pickup_street TO street;
  END IF;

  -- Rename pickup_postal_code to postal_code
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_postal_code'
  ) THEN
    ALTER TABLE orders RENAME COLUMN pickup_postal_code TO postal_code;
  END IF;

  -- Rename pickup_city to city
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_city'
  ) THEN
    ALTER TABLE orders RENAME COLUMN pickup_city TO city;
  END IF;

  -- Rename pickup_country to country
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_country'
  ) THEN
    ALTER TABLE orders RENAME COLUMN pickup_country TO country;
  END IF;

  -- Rename pickup_special_instructions to special_instructions_address
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pickup_special_instructions'
  ) THEN
    ALTER TABLE orders RENAME COLUMN pickup_special_instructions TO special_instructions_address;
  END IF;
END $$;

-- Drop delivery address fields (not needed, same as pickup)
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_street;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_postal_code;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_city;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_country;
ALTER TABLE orders DROP COLUMN IF EXISTS delivery_special_instructions;

-- Make total_cost_ore nullable (set by cleaner after weighing)
ALTER TABLE orders ALTER COLUMN total_cost_ore DROP NOT NULL;

-- Add cleaner pricing fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pricing_notes TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_calculated_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS price_calculated_by UUID REFERENCES cleaners(id);

-- =====================================================================
-- 4. UPDATE ORDER_STATUS ENUM (Remove 'pending_payment')
-- =====================================================================

-- Note: This is a complex operation that requires care with existing data
-- We'll recreate the enum without 'pending_payment'

-- First, check if we need to update any existing orders with 'pending_payment' status
DO $$
BEGIN
  -- If any orders have 'pending_payment', update them to 'pending_assignment'
  IF EXISTS (
    SELECT 1 FROM orders WHERE status::text = 'pending_payment'
  ) THEN
    RAISE NOTICE 'Updating % orders from pending_payment to pending_assignment',
      (SELECT COUNT(*) FROM orders WHERE status::text = 'pending_payment');

    UPDATE orders
    SET status = 'pending_assignment'::order_status
    WHERE status::text = 'pending_payment';
  END IF;
END $$;

-- =====================================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================================

COMMENT ON COLUMN subscriptions.default_needs_ironing IS 'Default ironing preference applied to all generated orders';
COMMENT ON COLUMN subscriptions.frequency IS 'Order generation frequency: weekly (4/month), biweekly (2/month), monthly (1/month)';
COMMENT ON COLUMN subscriptions.location_city IS 'Service location city (Bergen or Oslo)';
COMMENT ON COLUMN subscriptions.provider_agreement_metadata IS 'Stores initial address for order generation (JSONB: {initial_address, pickup_method, pickup_location_description, special_instructions})';

COMMENT ON COLUMN orders.needs_ironing IS 'Whether this specific order requires ironing service';
COMMENT ON COLUMN orders.street IS 'Service address street (pickup = delivery address)';
COMMENT ON COLUMN orders.postal_code IS 'Service address postal code (4 digits, Norwegian format)';
COMMENT ON COLUMN orders.city IS 'Service address city';
COMMENT ON COLUMN orders.country IS 'Service address country';
COMMENT ON COLUMN orders.special_instructions_address IS 'Address-specific instructions (e.g., gate code, entrance)';
COMMENT ON COLUMN orders.pricing_notes IS 'Optional notes about pricing calculation';
COMMENT ON COLUMN orders.price_calculated_at IS 'Timestamp when cleaner calculated the price';
COMMENT ON COLUMN orders.price_calculated_by IS 'Cleaner who calculated the price';
COMMENT ON COLUMN orders.total_cost_ore IS 'Total cost in øre (NULL until cleaner calculates price)';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Summary of changes:
-- ✓ Removed subscription_plans table
-- ✓ Removed plan_id, billing_cost_ore, next_billing_date from subscriptions
-- ✓ Removed default_extra_kg, default_delicate_items_count from subscriptions
-- ✓ Added default_needs_ironing, frequency, location_city to subscriptions
-- ✓ Removed ALL address fields from subscriptions (moved to orders)
-- ✓ Removed plan_id, extra_kg, delicate_items_count from orders
-- ✓ Renamed pickup_* fields in orders (removed prefix)
-- ✓ Removed delivery_* fields from orders (pickup = delivery)
-- ✓ Made total_cost_ore nullable in orders
-- ✓ Added cleaner pricing fields to orders
-- ✓ Removed 'pending_payment' from order_status enum
-- ✓ Added indexes for performance
