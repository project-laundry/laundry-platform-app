-- Delivery choices are now «Sett tøyet utenfor døra» (leave_at_door) and
-- «Annet» (other — what to do is written in delivery_instructions, required).
-- «Ring meg» (call_customer) is removed: orders that had it become NULL, which
-- tells the cleaner to call the customer before leaving the laundry — the same
-- instruction. Old order_defaults JSON keeping 'call_customer' is mapped to NULL
-- by buildOrderData.
ALTER TABLE public.orders DROP CONSTRAINT orders_delivery_if_absent_check;

UPDATE public.orders
SET delivery_if_absent = NULL,
    delivery_instructions = NULL
WHERE delivery_if_absent = 'call_customer';

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_if_absent_check
    CHECK (delivery_if_absent IN ('leave_at_door', 'other'));

COMMENT ON COLUMN public.orders.delivery_if_absent IS
  'Customer''s choice for delivery when nobody is home: leave_at_door or other (what to do is in delivery_instructions). NULL when no choice was made.';
COMMENT ON COLUMN public.orders.delivery_instructions IS
  'The customer''s delivery note: what to do when nobody is home, set only when delivery_if_absent = ''other'' (max 500 chars).';
