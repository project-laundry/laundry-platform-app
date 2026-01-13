-- Add laundry details fields to orders table
-- These fields support the new load-based pricing model

-- Load counts (structured columns for core pricing data)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dark_loads INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS white_loads INTEGER DEFAULT 0;

-- Ironing quantities (JSONB for flexibility - 7 categories may evolve)
-- Structure: { "kids_pillow": 0, "tshirts_shorts": 0, "business_shirts": 0,
--              "single_bedding": 0, "complex_dresses": 0, "double_bedding": 0, "king_bedding": 0 }
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ironing_details JSONB DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN orders.dark_loads IS 'Number of dark/colored laundry loads (5kg each)';
COMMENT ON COLUMN orders.white_loads IS 'Number of white laundry loads (5kg each)';
COMMENT ON COLUMN orders.ironing_details IS 'Ironing quantities by category (JSONB). Only populated when needs_ironing = true.';
