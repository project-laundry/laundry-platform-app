-- Add 'on_demand' to subscription frequency constraint
-- This allows single (non-recurring) orders to be stored with frequency='on_demand'

-- Drop the existing constraint and add a new one with 'on_demand' included
ALTER TABLE subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_frequency_check;

ALTER TABLE subscriptions
ADD CONSTRAINT subscriptions_frequency_check
CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'on_demand'));

COMMENT ON COLUMN subscriptions.frequency IS 'Order generation frequency: weekly (4/month), biweekly (2/month), monthly (1/month), on_demand (single order, no recurring)';
