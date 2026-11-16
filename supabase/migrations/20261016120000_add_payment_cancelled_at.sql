-- The charge-canceled webhook now flips payments.status to 'cancelled'. Give it
-- a timestamp column like failed_at / refunded_at so the cancellation time is a
-- real column, not only provider_metadata.canceled_at.
ALTER TABLE public.payments
  ADD COLUMN cancelled_at timestamp with time zone;
