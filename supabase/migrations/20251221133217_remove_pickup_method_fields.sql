-- Remove pickup_method and pickup_location_description from Orders table
-- Development phase: No data preservation needed

-- Drop columns from orders table
ALTER TABLE orders
  DROP COLUMN IF EXISTS pickup_method,
  DROP COLUMN IF EXISTS pickup_location_description;

-- Drop the enum type (no longer needed)
DROP TYPE IF EXISTS pickup_method;
