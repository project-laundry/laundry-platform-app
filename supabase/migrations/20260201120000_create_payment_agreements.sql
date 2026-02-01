-- Create payment_agreements table
-- Decouples Vipps agreement lifecycle from subscription lifecycle
-- An agreement is mandatory for every checkout; a subscription is only needed for recurring orders.

-- 1. Create payment_agreements table
CREATE TABLE payment_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'vipps',
  provider_agreement_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'stopped', 'expired')),
  provider_metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for payment_agreements
CREATE INDEX idx_payment_agreements_customer_id ON payment_agreements(customer_id);
CREATE INDEX idx_payment_agreements_status ON payment_agreements(status);

-- updated_at trigger
CREATE TRIGGER update_payment_agreements_updated_at
  BEFORE UPDATE ON payment_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE payment_agreements ENABLE ROW LEVEL SECURITY;

-- 2. Add payment_agreement_id to subscriptions
ALTER TABLE subscriptions ADD COLUMN payment_agreement_id UUID REFERENCES payment_agreements(id);

-- Migrate existing data: create payment_agreements from subscriptions that have provider_agreement_id
INSERT INTO payment_agreements (customer_id, provider, provider_agreement_id, status, created_at, updated_at)
SELECT
  s.customer_id,
  'vipps',
  s.provider_agreement_id,
  CASE s.status
    WHEN 'active' THEN 'active'
    WHEN 'pending_payment' THEN 'pending'
    WHEN 'cancelled' THEN 'stopped'
    WHEN 'expired' THEN 'expired'
    ELSE 'pending'
  END,
  s.created_at,
  s.updated_at
FROM subscriptions s
WHERE s.provider_agreement_id IS NOT NULL;

-- Link subscriptions to their new payment_agreements
UPDATE subscriptions s
SET payment_agreement_id = pa.id
FROM payment_agreements pa
WHERE pa.provider_agreement_id = s.provider_agreement_id;

-- Drop old column from subscriptions
ALTER TABLE subscriptions DROP COLUMN provider_agreement_id;

-- 3. Add payment_agreement_id to orders (for one-time orders without subscription)
ALTER TABLE orders ADD COLUMN payment_agreement_id UUID REFERENCES payment_agreements(id);

CREATE INDEX idx_orders_payment_agreement_id ON orders(payment_agreement_id);

-- 4. Make payments.order_id nullable (it already is based on the schema, but ensure it)
-- payments.order_id is already nullable per the existing schema, no change needed.
