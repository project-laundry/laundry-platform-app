-- What the cleaner does at delivery when nobody is home, chosen by the customer
-- at checkout (required from now on), and the customer's optional delivery note.
-- Both are NULL on orders created before the question existed.
ALTER TABLE public.orders
  ADD COLUMN delivery_if_absent text,
  ADD COLUMN delivery_instructions text,
  ADD CONSTRAINT orders_delivery_if_absent_check
    CHECK (delivery_if_absent IN ('leave_at_door', 'call_customer')),
  ADD CONSTRAINT orders_delivery_instructions_length
    CHECK (char_length(delivery_instructions) <= 500);

COMMENT ON COLUMN public.orders.delivery_if_absent IS
  'Customer''s choice for delivery when nobody is home: leave_at_door or call_customer. NULL on orders created before the choice existed.';
COMMENT ON COLUMN public.orders.delivery_instructions IS
  'Customer''s optional free-text delivery note (max 500 chars).';
