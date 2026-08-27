-- Customer's self-reported selection from checkout (bags, bedding sets, ironing
-- counts) plus the estimate total they were shown. Informational for the cleaner
-- and support — the binding price is still set by the cleaner after pickup.
ALTER TABLE orders
  ADD COLUMN customer_estimate jsonb;

COMMENT ON COLUMN orders.customer_estimate IS
  'Customer selection + price estimate from checkout: {bags, bedding_sets, iron_everyday_items, iron_formal_items, iron_bedding, estimated_total_ore}. NULL for orders created before the estimate flow.';
