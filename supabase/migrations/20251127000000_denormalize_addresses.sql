-- Migration: Denormalize addresses table
-- Remove addresses table and embed address fields directly into cleaners, orders, and bag_deliveries

-- Step 1: Add address columns to cleaners table
ALTER TABLE cleaners
ADD COLUMN base_street varchar(200),
ADD COLUMN base_postal_code varchar(4),
ADD COLUMN base_city varchar(100),
ADD COLUMN base_country varchar(100) DEFAULT 'Norway',
ADD COLUMN base_special_instructions text;

-- Step 2: Migrate existing cleaner address data
UPDATE cleaners c
SET
  base_street = a.street,
  base_postal_code = a.postal_code,
  base_city = a.city,
  base_country = a.country,
  base_special_instructions = a.special_instructions
FROM addresses a
WHERE c.base_address_id = a.id;

-- Step 3: Make cleaner address columns NOT NULL
ALTER TABLE cleaners
ALTER COLUMN base_street SET NOT NULL,
ALTER COLUMN base_postal_code SET NOT NULL,
ALTER COLUMN base_city SET NOT NULL,
ALTER COLUMN base_country SET NOT NULL;

-- Step 4: Add CHECK constraints for cleaners
ALTER TABLE cleaners
ADD CONSTRAINT cleaners_postal_code_format CHECK (base_postal_code ~ '^[0-9]{4}$'),
ADD CONSTRAINT cleaners_street_length CHECK (char_length(base_street) >= 3),
ADD CONSTRAINT cleaners_city_length CHECK (char_length(base_city) >= 2);

-- Step 5: Add address columns to orders table
ALTER TABLE orders
ADD COLUMN pickup_street varchar(200),
ADD COLUMN pickup_postal_code varchar(4),
ADD COLUMN pickup_city varchar(100),
ADD COLUMN pickup_country varchar(100) DEFAULT 'Norway',
ADD COLUMN pickup_special_instructions text;

-- Step 6: Migrate existing order address data
UPDATE orders o
SET
  pickup_street = a.street,
  pickup_postal_code = a.postal_code,
  pickup_city = a.city,
  pickup_country = a.country,
  pickup_special_instructions = a.special_instructions
FROM addresses a
WHERE o.address_id = a.id;

-- Step 7: Make order address columns NOT NULL
ALTER TABLE orders
ALTER COLUMN pickup_street SET NOT NULL,
ALTER COLUMN pickup_postal_code SET NOT NULL,
ALTER COLUMN pickup_city SET NOT NULL,
ALTER COLUMN pickup_country SET NOT NULL;

-- Step 8: Add CHECK constraints for orders
ALTER TABLE orders
ADD CONSTRAINT orders_postal_code_format CHECK (pickup_postal_code ~ '^[0-9]{4}$'),
ADD CONSTRAINT orders_street_length CHECK (char_length(pickup_street) >= 3),
ADD CONSTRAINT orders_city_length CHECK (char_length(pickup_city) >= 2);

-- Step 9: Add address columns to bag_deliveries table
ALTER TABLE bag_deliveries
ADD COLUMN delivery_street varchar(200),
ADD COLUMN delivery_postal_code varchar(4),
ADD COLUMN delivery_city varchar(100),
ADD COLUMN delivery_country varchar(100) DEFAULT 'Norway',
ADD COLUMN delivery_special_instructions text;

-- Step 10: Migrate existing bag delivery address data
UPDATE bag_deliveries bd
SET
  delivery_street = a.street,
  delivery_postal_code = a.postal_code,
  delivery_city = a.city,
  delivery_country = a.country,
  delivery_special_instructions = a.special_instructions
FROM addresses a
WHERE bd.address_id = a.id;

-- Step 11: Make bag delivery address columns NOT NULL (if data exists)
ALTER TABLE bag_deliveries
ALTER COLUMN delivery_street SET NOT NULL,
ALTER COLUMN delivery_postal_code SET NOT NULL,
ALTER COLUMN delivery_city SET NOT NULL,
ALTER COLUMN delivery_country SET NOT NULL;

-- Step 12: Add CHECK constraints for bag_deliveries
ALTER TABLE bag_deliveries
ADD CONSTRAINT bag_deliveries_postal_code_format CHECK (delivery_postal_code ~ '^[0-9]{4}$'),
ADD CONSTRAINT bag_deliveries_street_length CHECK (char_length(delivery_street) >= 3),
ADD CONSTRAINT bag_deliveries_city_length CHECK (char_length(delivery_city) >= 2);

-- Step 13: Drop foreign key constraints
ALTER TABLE cleaners DROP CONSTRAINT IF EXISTS cleaners_base_address_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_address_id_fkey;
ALTER TABLE bag_deliveries DROP CONSTRAINT IF EXISTS bag_deliveries_address_id_fkey;

-- Step 14: Drop address_id columns
ALTER TABLE cleaners DROP COLUMN base_address_id;
ALTER TABLE orders DROP COLUMN address_id;
ALTER TABLE bag_deliveries DROP COLUMN address_id;

-- Step 15: Add index on cleaner city for matching queries
CREATE INDEX idx_cleaners_base_city ON cleaners(base_city);

-- Step 16: Add address columns to subscriptions table
ALTER TABLE subscriptions
ADD COLUMN delivery_street varchar(200),
ADD COLUMN delivery_postal_code varchar(4),
ADD COLUMN delivery_city varchar(100),
ADD COLUMN delivery_country varchar(100) DEFAULT 'Norway',
ADD COLUMN delivery_special_instructions text;

-- Step 17: For existing subscriptions, try to get address from their first order
UPDATE subscriptions s
SET
  delivery_street = o.pickup_street,
  delivery_postal_code = o.pickup_postal_code,
  delivery_city = o.pickup_city,
  delivery_country = o.pickup_country,
  delivery_special_instructions = o.pickup_special_instructions
FROM orders o
WHERE s.id = o.subscription_id
  AND o.id = (
    SELECT id FROM orders
    WHERE subscription_id = s.id
    ORDER BY created_at ASC
    LIMIT 1
  );

-- Step 18: Make subscription address columns NOT NULL for new subscriptions
-- Note: Existing subscriptions without address will have NULL values
ALTER TABLE subscriptions
ALTER COLUMN delivery_street SET DEFAULT '',
ALTER COLUMN delivery_postal_code SET DEFAULT '',
ALTER COLUMN delivery_city SET DEFAULT '',
ALTER COLUMN delivery_country SET DEFAULT 'Norway';

-- Step 19: Drop the addresses table
DROP TABLE addresses;
