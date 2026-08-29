-- Driver role + signup hardening
--
-- 1) Adds 'driver' to user_role. Drivers run the pickup/delivery route via the
--    driver dashboard; admins can access every driver surface too (the app
--    guards driver routes with role IN ('driver', 'admin')). Drivers have no
--    extra profile table.
--
-- 2) Adds the drivers profile table: each driver serves exactly one city and
--    has an optional stored route start point. Rows are created manually by
--    staff alongside the account (no self-service onboarding).
--
-- 3) Hardens handle_new_user: users.role may only be derived from signup
--    metadata for SELF-SERVE roles. Previously the trigger cast any
--    client-supplied raw_user_meta_data->>'role' into user_role, so anyone
--    could sign up as 'admin' from the browser. Now only 'cleaner' is honored;
--    everything else becomes 'customer'. Privileged roles (admin, driver) are
--    granted manually by staff via SQL.

ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'driver';

CREATE TABLE IF NOT EXISTS "public"."drivers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "city" character varying(100) NOT NULL,
    "start_latitude" double precision,
    "start_longitude" double precision,
    "start_label" character varying(200),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "drivers_user_id_key" UNIQUE ("user_id"),
    CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id")
        REFERENCES "public"."users"("id") ON DELETE CASCADE
);

ALTER TABLE "public"."drivers" OWNER TO "postgres";

ALTER TABLE "public"."drivers" ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE TRIGGER "update_drivers_updated_at"
    BEFORE UPDATE ON "public"."drivers"
    FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role_value public.user_role;
BEGIN
  IF NEW.raw_user_meta_data->>'role' = 'cleaner' THEN
    user_role_value := 'cleaner'::public.user_role;
  ELSE
    user_role_value := 'customer'::public.user_role;
  END IF;

  INSERT INTO public.users (id, email, phone, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role_value,
    NOW(),
    NOW()
  );

  IF user_role_value = 'customer'::public.user_role THEN
    INSERT INTO public.customers (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
