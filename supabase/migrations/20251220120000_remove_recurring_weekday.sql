-- Drop recurring_weekday column from subscriptions table
-- We now store only first_pickup_date in order_defaults and derive weekday from it

ALTER TABLE subscriptions DROP COLUMN IF EXISTS recurring_weekday;

-- Update comment on order_defaults column
COMMENT ON COLUMN subscriptions.order_defaults IS
'Order generation defaults (JSONB): initial_address, pickup_method, pickup_location_description, special_instructions, location_city, default_needs_ironing, default_cleaner_id, first_pickup_date. The weekday is derived from first_pickup_date when needed.';
