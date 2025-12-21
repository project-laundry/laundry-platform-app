-- Remove bag delivery functionality from the platform
-- This is safe to do during development phase

-- Drop the foreign key constraint first
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_prerequisite_bag_delivery_id_fkey;

-- Remove the prerequisite_bag_delivery_id column from orders table
ALTER TABLE orders DROP COLUMN IF EXISTS prerequisite_bag_delivery_id;

-- Drop the bag_deliveries table
DROP TABLE IF EXISTS bag_deliveries;

-- Remove laundry_bags_count from customers table (no longer needed without bag delivery)
ALTER TABLE customers DROP COLUMN IF EXISTS laundry_bags_count;
