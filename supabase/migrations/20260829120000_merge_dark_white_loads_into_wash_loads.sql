-- Collapse the dark/white load split into a single wash count.
-- The platform no longer separates dark and white laundry; the cleaner registers
-- how many machines were run, and each bedding set counts as its own wash.

ALTER TABLE "public"."orders"
    ADD COLUMN "wash_loads" integer DEFAULT 0;

UPDATE "public"."orders"
SET "wash_loads" = COALESCE("dark_loads", 0) + COALESCE("white_loads", 0);

ALTER TABLE "public"."orders"
    DROP COLUMN "dark_loads",
    DROP COLUMN "white_loads";

COMMENT ON COLUMN "public"."orders"."wash_loads" IS 'Number of laundry loads run by the cleaner (5kg each)';
