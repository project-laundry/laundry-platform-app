-- Cleaner onboarding step 3 asks for the cleaner's washing machine. Until now
-- the answers were collected in the browser and never stored. Persist them so
-- admins can see them when approving an application.
CREATE TYPE public.cleaner_machine_condition AS ENUM (
    'excellent',
    'very_good',
    'good',
    'fair'
);

ALTER TABLE public.cleaners
  ADD COLUMN machine_brand character varying(100),
  ADD COLUMN machine_capacity_kg smallint,
  ADD COLUMN machine_year smallint,
  ADD COLUMN machine_condition public.cleaner_machine_condition,
  ADD CONSTRAINT cleaners_machine_capacity_positive
    CHECK (machine_capacity_kg IS NULL OR machine_capacity_kg > 0),
  ADD CONSTRAINT cleaners_machine_year_range
    CHECK (machine_year IS NULL OR machine_year BETWEEN 1900 AND 2100);
