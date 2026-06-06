-- Promo codes for order checkout discounts
-- Codes are SHARED (one code, many customers) but each customer may redeem a given code only ONCE.
-- The discount applies to the FIRST order of an agreement and is absorbed by the platform
-- (cleaner payout is unaffected; only the amount charged to the customer is reduced).

-- 1. promo_codes table
CREATE TABLE promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  -- percentage: 1-100 ; fixed: amount in øre
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  -- optional cap for percentage codes (in øre); NULL = no cap
  max_discount_ore INTEGER CHECK (max_discount_ore IS NULL OR max_discount_ore >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  -- optional global cap on total redemptions; NULL = unlimited
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Codes are stored uppercase for case-insensitive matching (also enforced in the app layer)
CREATE INDEX idx_promo_codes_code ON promo_codes(code);

CREATE TRIGGER update_promo_codes_updated_at
  BEFORE UPDATE ON promo_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- 2. promo_code_redemptions ledger
-- One row per (code, customer) enforces "once per customer".
-- Total row count for a code enforces max_redemptions.
CREATE TABLE promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  payment_agreement_id UUID REFERENCES payment_agreements(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, customer_id)
);

CREATE INDEX idx_promo_code_redemptions_promo_code_id ON promo_code_redemptions(promo_code_id);
CREATE INDEX idx_promo_code_redemptions_customer_id ON promo_code_redemptions(customer_id);

ALTER TABLE promo_code_redemptions ENABLE ROW LEVEL SECURITY;

-- 3. Add locked promo snapshot to orders
-- Stores the discount terms captured at checkout + the discount_ore applied at pricing time.
-- Example: { "promo_code_id": "...", "code": "VELKOMMEN20", "discount_type": "percentage",
--            "discount_value": 20, "max_discount_ore": 10000, "discount_ore": 9160 }
ALTER TABLE orders ADD COLUMN promo JSONB;
