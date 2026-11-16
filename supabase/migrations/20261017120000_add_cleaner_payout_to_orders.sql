-- The cleaner's share of an order (PRICING.cleaner_payout_percent of the full
-- service price, before any platform-absorbed promo discount) was computed at
-- pricing time and thrown away; bookkeeping had to reconstruct it as
-- 70 % × (total_cost_ore + promo.discount_ore). Stamp it next to total_cost_ore
-- so it is frozen with the price and survives later pricing changes.
ALTER TABLE public.orders
  ADD COLUMN cleaner_payout_ore integer,
  ADD CONSTRAINT orders_cleaner_payout_ore_positive
    CHECK (cleaner_payout_ore >= 0);

COMMENT ON COLUMN public.orders.cleaner_payout_ore IS
  'Cleaner''s share of the order in øre, frozen at pricing time (calculateOrderPrice.cleaner_payout_ore — before any promo discount, which is platform-absorbed). NULL until the cleaner prices the order. Owed only once the order is completed.';
