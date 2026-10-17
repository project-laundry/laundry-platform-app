-- Internal admin notes on an order («Interne notater» on /admin/orders/[orderId]).
-- Free text for operations: why a price was overridden, what the customer said on
-- the phone, follow-ups. Never rendered on a customer or cleaner surface.
ALTER TABLE public.orders
  ADD COLUMN admin_notes text,
  ADD CONSTRAINT orders_admin_notes_length
    CHECK (char_length(admin_notes) <= 2000);

COMMENT ON COLUMN public.orders.admin_notes IS
  'Internal admin notes (free text, max 2000 chars). Admin dashboard only — never shown to customers or cleaners.';
