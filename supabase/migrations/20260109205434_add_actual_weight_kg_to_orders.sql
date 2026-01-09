-- Migration: Add actual_weight_kg column to orders
-- Description: Add column for cleaners to record actual laundry weight after pickup
-- Date: 2026-01-09

-- Add actual_weight_kg column (nullable - set by cleaner after weighing)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_weight_kg DECIMAL(5,2);

-- Add comment for documentation
COMMENT ON COLUMN orders.actual_weight_kg IS 'Actual weight in kg measured by cleaner after pickup (used for price calculation)';

-- Add index for potential queries on weight
CREATE INDEX IF NOT EXISTS idx_orders_actual_weight_kg ON orders(actual_weight_kg) WHERE actual_weight_kg IS NOT NULL;
