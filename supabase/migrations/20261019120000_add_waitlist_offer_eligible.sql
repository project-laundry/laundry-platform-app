-- The waitlist offer ("halv pris på første vask" for the first 50 customer
-- signups — WAITLIST_OFFER_SPOTS in src/components/coming-soon/launch.ts) was
-- display-only: nothing marked which rows are inside the cap, and the launch
-- checklist relied on slicing by created_at by hand. Stamp it on the row when
-- it is inserted, so the recipients of the launch promo code are simply
-- `WHERE offer_eligible`.
--
-- The cap (50) is mirrored in launch.ts — change both together.
ALTER TABLE public.waitlist_signups
  ADD COLUMN offer_eligible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.waitlist_signups.offer_eligible IS
  'True on the first 50 customer signups (WAITLIST_OFFER_SPOTS): they get the launch promo code. Set once by waitlist_mark_offer_eligible on insert and never recomputed — if one of them is deleted, the freed spot goes to the next new signup, not to the existing 51st row.';

-- Backfill: signups that already exist keep their place in line.
UPDATE public.waitlist_signups
SET offer_eligible = true
WHERE id IN (
  SELECT id
  FROM public.waitlist_signups
  WHERE audience = 'customer'
  ORDER BY created_at, id
  LIMIT 50
);

CREATE OR REPLACE FUNCTION public.waitlist_mark_offer_eligible() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.audience <> 'customer' THEN
    NEW.offer_eligible := false;
    RETURN NEW;
  END IF;

  -- Serialise concurrent signups so two inserts cannot both count 49 and
  -- both take spot 50. The lock is released when the transaction ends.
  PERFORM pg_advisory_xact_lock(hashtext('waitlist_offer_eligible'));

  IF (SELECT count(*) FROM public.waitlist_signups WHERE offer_eligible) < 50 THEN
    NEW.offer_eligible := true;
  ELSE
    NEW.offer_eligible := false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER waitlist_signups_mark_offer_eligible
    BEFORE INSERT ON public.waitlist_signups
    FOR EACH ROW EXECUTE FUNCTION public.waitlist_mark_offer_eligible();
