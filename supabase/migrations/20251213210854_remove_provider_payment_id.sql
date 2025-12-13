-- Remove redundant provider_payment_id column from payments table
-- All provider IDs are now stored in provider_metadata JSONB field
-- Webhook lookups use provider_reference (indexed) instead

-- Drop the unique constraint first
ALTER TABLE payments
DROP CONSTRAINT IF EXISTS payments_provider_payment_id_key;

-- Drop the column
ALTER TABLE payments
DROP COLUMN provider_payment_id;

-- Add comment to clarify field usage
COMMENT ON COLUMN payments.provider_reference IS
  'Merchant reference used for webhook lookups. For Recurring API: Vipps chargeId. For ePayment API: order number or custom reference. Indexed for fast webhook processing.';

COMMENT ON COLUMN payments.provider_metadata IS
  'Complete provider response data including transaction IDs, status, amounts, timestamps. Single source of truth for all provider-specific information.';
