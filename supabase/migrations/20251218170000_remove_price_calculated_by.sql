-- Remove price_calculated_by column from orders table
-- This resolves the ambiguous relationship issue between orders and cleaners
-- The cleaner_id foreign key is sufficient for tracking the assigned cleaner

ALTER TABLE orders DROP COLUMN IF EXISTS price_calculated_by;
