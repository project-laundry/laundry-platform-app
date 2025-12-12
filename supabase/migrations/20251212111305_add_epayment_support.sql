-- Add ePayment API support
-- Adds provider_reference column for storing merchant references used by Vipps ePayment API

-- Add merchant reference field for ePayment API lookups
ALTER TABLE payments
ADD COLUMN provider_reference VARCHAR(64);

-- Index for quick lookup by merchant reference
CREATE INDEX idx_payments_provider_reference
ON payments(provider_reference)
WHERE provider_reference IS NOT NULL;

-- Comment for clarity
COMMENT ON COLUMN payments.provider_reference IS
  'Merchant reference for ePayment API (payment reference field). Used to look up payments from Vipps webhooks.';
