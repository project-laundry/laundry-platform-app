-- Add geocoding coordinates to orders and cleaners
--
-- Coordinates are geocoded from the address at the source (checkout, address edit,
-- cleaner onboarding) and copied onto each generated order. They power the
-- cleaner "Tasks of the day" route optimization. Nullable: addresses still save
-- even when geocoding is unavailable or fails.

ALTER TABLE orders
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;

ALTER TABLE cleaners
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision;
