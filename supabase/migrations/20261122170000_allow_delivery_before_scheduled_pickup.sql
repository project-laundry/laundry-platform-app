-- An order that was picked up and delivered BEFORE its scheduled pickup date
-- could never be completed: completion stamps delivery_date with the actual
-- delivery day, and orders_delivery_after_scheduled rejected it. The cleaner
-- is allowed to pick up early when agreed with the customer, so the order was
-- left stuck in ready_for_delivery after the customer had been charged.
--
-- The check keeps guarding the ESTIMATE (every status before completed) and
-- no longer applies to the actual delivery date of a completed order.

ALTER TABLE public.orders DROP CONSTRAINT orders_delivery_after_scheduled;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_delivery_after_scheduled
  CHECK (status = 'completed' OR delivery_date >= scheduled_date);
