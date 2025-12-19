-- Refactor subscription schema: rename provider_agreement_metadata to order_defaults
-- and move location_city, default_needs_ironing, and assigned_cleaner_id into JSONB

-- Step 1: Drop RLS policy that depends on assigned_cleaner_id
DROP POLICY IF EXISTS "allow cleaners to access assigned subscriptions" ON subscriptions;

-- Step 2: Rename metadata column
ALTER TABLE subscriptions
RENAME COLUMN provider_agreement_metadata TO order_defaults;

-- Step 3: Backfill order_defaults with all fields from columns
-- Merge existing order_defaults with the three fields being moved
UPDATE subscriptions
SET order_defaults = COALESCE(order_defaults, '{}'::jsonb)
  || jsonb_build_object(
    'location_city', location_city,
    'default_needs_ironing', default_needs_ironing,
    'default_cleaner_id', assigned_cleaner_id
  )
WHERE order_defaults IS NOT NULL OR location_city IS NOT NULL;

-- Step 4: Drop foreign key constraint
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_assigned_cleaner_id_fkey;

-- Step 5: Drop indexes
DROP INDEX IF EXISTS idx_subscriptions_location_city;
DROP INDEX IF EXISTS idx_subscriptions_default_needs_ironing;
DROP INDEX IF EXISTS idx_subscriptions_assigned_cleaner_id;

-- Step 6: Drop columns
ALTER TABLE subscriptions DROP COLUMN location_city;
ALTER TABLE subscriptions DROP COLUMN default_needs_ironing;
ALTER TABLE subscriptions DROP COLUMN assigned_cleaner_id;

-- Step 7: Update column comment
COMMENT ON COLUMN subscriptions.order_defaults IS
'Order generation defaults (JSONB): initial_address, pickup_method, pickup_location_description, special_instructions, location_city, default_needs_ironing, default_cleaner_id';