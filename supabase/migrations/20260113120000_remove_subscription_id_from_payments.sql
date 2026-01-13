-- Remove subscription_id from payments table
--
-- Rationale:
-- With FLEXIBLE pricing model, all payments are created per completed order.
-- Payments are always linked to a specific order via order_id.
-- The subscription can be traced via: payment -> order_id -> order.subscription_id
--
-- This removes:
-- - subscription_id column (no longer needed)
-- - payments_order_xor_subscription constraint (no longer needed)
-- - Related indexes

-- Drop the XOR constraint
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_order_xor_subscription;

-- Drop subscription_id indexes
DROP INDEX IF EXISTS idx_payments_subscription_id;
DROP INDEX IF EXISTS idx_payments_subscription_created;

-- Drop the subscription_id column
ALTER TABLE payments DROP COLUMN IF EXISTS subscription_id;

-- Make order_id required (NOT NULL) since all payments must have an order
ALTER TABLE payments ALTER COLUMN order_id SET NOT NULL;
