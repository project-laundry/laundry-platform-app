


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."bag_delivery_status" AS ENUM (
    'pending',
    'scheduled',
    'en_route',
    'delivered',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."bag_delivery_status" OWNER TO "postgres";


CREATE TYPE "public"."cleaner_business_type" AS ENUM (
    'individual',
    'business'
);


ALTER TYPE "public"."cleaner_business_type" OWNER TO "postgres";


CREATE TYPE "public"."cleaner_experience_level" AS ENUM (
    'beginner',
    'some',
    'experienced',
    'expert',
    'professional'
);


ALTER TYPE "public"."cleaner_experience_level" OWNER TO "postgres";


CREATE TYPE "public"."cleaner_specialization" AS ENUM (
    'wool',
    'silk',
    'down',
    'sportswear',
    'leather',
    'delicate',
    'formal',
    'outerwear'
);


ALTER TYPE "public"."cleaner_specialization" OWNER TO "postgres";


CREATE TYPE "public"."cleaner_verification_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'suspended'
);


ALTER TYPE "public"."cleaner_verification_status" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending_payment',
    'pending_assignment',
    'pickup_scheduled',
    'picked_up',
    'in_cleaning',
    'ready_for_delivery',
    'out_for_delivery',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


COMMENT ON TYPE "public"."order_status" IS 'Order lifecycle statuses: pending_payment (awaiting payment), pending_assignment (awaiting cleaner), pickup_scheduled, picked_up, in_cleaning, ready_for_delivery, out_for_delivery, completed, cancelled';



CREATE TYPE "public"."payment_provider" AS ENUM (
    'vipps',
    'stripe',
    'manual'
);


ALTER TYPE "public"."payment_provider" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'authorized',
    'captured',
    'failed',
    'refunded',
    'cancelled'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_type" AS ENUM (
    'recurring',
    'one_time',
    'refund'
);


ALTER TYPE "public"."payment_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_billing_period" AS ENUM (
    'monthly',
    'one_time'
);


ALTER TYPE "public"."subscription_billing_period" OWNER TO "postgres";


CREATE TYPE "public"."subscription_frequency" AS ENUM (
    'weekly',
    'biweekly',
    'monthly',
    'on_demand'
);


ALTER TYPE "public"."subscription_frequency" OWNER TO "postgres";


CREATE TYPE "public"."subscription_status" AS ENUM (
    'pending_payment',
    'active',
    'paused',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."subscription_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'customer',
    'cleaner',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."weekday" AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
);


ALTER TYPE "public"."weekday" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role_value public.user_role;
BEGIN
  BEGIN
    user_role_value := (NEW.raw_user_meta_data->>'role')::public.user_role;
  EXCEPTION
    WHEN invalid_text_representation OR undefined_object THEN
      user_role_value := 'customer'::public.user_role;
  END;

  IF user_role_value IS NULL THEN
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "permissions" "text"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cleaners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "profile_image_url" character varying(500),
    "bio" "text",
    "verification_status" "public"."cleaner_verification_status" DEFAULT 'pending'::"public"."cleaner_verification_status" NOT NULL,
    "business_type" "public"."cleaner_business_type" NOT NULL,
    "tax_id" character varying(50) NOT NULL,
    "business_name" character varying(200),
    "business_address" "text",
    "bank_account" character varying(11) NOT NULL,
    "experience_level" "public"."cleaner_experience_level" NOT NULL,
    "languages" "text"[] NOT NULL,
    "specializations" "public"."cleaner_specialization"[],
    "weekly_schedule" "jsonb" DEFAULT '{"fri": true, "mon": true, "sat": false, "sun": false, "thu": true, "tue": true, "wed": true}'::"jsonb" NOT NULL,
    "is_accepting_orders" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "suspended_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "base_street" character varying(200) NOT NULL,
    "base_postal_code" character varying(4) NOT NULL,
    "base_city" character varying(100) NOT NULL,
    "base_country" character varying(100) DEFAULT 'Norway'::character varying NOT NULL,
    "base_special_instructions" "text",
    CONSTRAINT "cleaners_bank_account_format" CHECK ((("bank_account")::"text" ~ '^[0-9]{11}$'::"text")),
    CONSTRAINT "cleaners_bio_length" CHECK (("char_length"("bio") <= 1000)),
    CONSTRAINT "cleaners_business_address_length" CHECK (("char_length"("business_address") <= 300)),
    CONSTRAINT "cleaners_city_length" CHECK (("char_length"(("base_city")::"text") >= 2)),
    CONSTRAINT "cleaners_display_name_length" CHECK (("char_length"(("display_name")::"text") >= 2)),
    CONSTRAINT "cleaners_languages_not_empty" CHECK (("array_length"("languages", 1) >= 1)),
    CONSTRAINT "cleaners_postal_code_format" CHECK ((("base_postal_code")::"text" ~ '^[0-9]{4}$'::"text")),
    CONSTRAINT "cleaners_street_length" CHECK (("char_length"(("base_street")::"text") >= 3))
);


ALTER TABLE "public"."cleaners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" character varying(8) NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "cleaner_id" "uuid",
    "status" "public"."order_status" DEFAULT 'pending_assignment'::"public"."order_status" NOT NULL,
    "scheduled_date" "date" NOT NULL,
    "delivery_date" "date" NOT NULL,
    "special_instructions" "text",
    "needs_ironing" boolean DEFAULT false NOT NULL,
    "total_cost_ore" integer,
    "declined_by_cleaner_ids" "uuid"[],
    "assigned_at" timestamp with time zone,
    "picked_up_at" timestamp with time zone,
    "in_cleaning_at" timestamp with time zone,
    "ready_for_delivery_at" timestamp with time zone,
    "out_for_delivery_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "mission_accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "street" character varying(200) NOT NULL,
    "postal_code" character varying(4) NOT NULL,
    "city" character varying(100) NOT NULL,
    "country" character varying(100) DEFAULT 'Norway'::character varying NOT NULL,
    "special_instructions_address" "text",
    "pricing_notes" "text",
    "price_calculated_at" timestamp with time zone,
    "actual_weight_kg" numeric(5,2),
    "dark_loads" integer DEFAULT 0,
    "white_loads" integer DEFAULT 0,
    "ironing_details" "jsonb",
    "payment_agreement_id" "uuid",
    "promo" "jsonb",
    CONSTRAINT "orders_cancellation_reason_length" CHECK (("char_length"("cancellation_reason") <= 500)),
    CONSTRAINT "orders_city_length" CHECK (("char_length"(("city")::"text") >= 2)),
    CONSTRAINT "orders_delivery_after_scheduled" CHECK (("delivery_date" >= "scheduled_date")),
    CONSTRAINT "orders_postal_code_format" CHECK ((("postal_code")::"text" ~ '^[0-9]{4}$'::"text")),
    CONSTRAINT "orders_special_instructions_length" CHECK (("char_length"("special_instructions") <= 1000)),
    CONSTRAINT "orders_street_length" CHECK (("char_length"(("street")::"text") >= 3)),
    CONSTRAINT "orders_total_cost_ore_positive" CHECK (("total_cost_ore" >= 0))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."orders"."needs_ironing" IS 'Whether this specific order requires ironing service';



COMMENT ON COLUMN "public"."orders"."total_cost_ore" IS 'Total cost in øre (NULL until cleaner calculates price)';



COMMENT ON COLUMN "public"."orders"."street" IS 'Service address street (pickup = delivery address)';



COMMENT ON COLUMN "public"."orders"."postal_code" IS 'Service address postal code (4 digits, Norwegian format)';



COMMENT ON COLUMN "public"."orders"."city" IS 'Service address city';



COMMENT ON COLUMN "public"."orders"."country" IS 'Service address country';



COMMENT ON COLUMN "public"."orders"."special_instructions_address" IS 'Address-specific instructions (e.g., gate code, entrance)';



COMMENT ON COLUMN "public"."orders"."pricing_notes" IS 'Optional notes about pricing calculation';



COMMENT ON COLUMN "public"."orders"."price_calculated_at" IS 'Timestamp when cleaner calculated the price';



COMMENT ON COLUMN "public"."orders"."actual_weight_kg" IS 'Actual weight in kg measured by cleaner after pickup (used for price calculation)';



COMMENT ON COLUMN "public"."orders"."dark_loads" IS 'Number of dark/colored laundry loads (5kg each)';



COMMENT ON COLUMN "public"."orders"."white_loads" IS 'Number of white laundry loads (5kg each)';



COMMENT ON COLUMN "public"."orders"."ironing_details" IS 'Ironing quantities by category (JSONB). Only populated when needs_ironing = true.';



CREATE TABLE IF NOT EXISTS "public"."payment_agreements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "provider" "text" DEFAULT 'vipps'::"text" NOT NULL,
    "provider_agreement_id" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "provider_metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "activated_at" timestamp with time zone,
    "stopped_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "payment_agreements_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'stopped'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."payment_agreements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "order_id" "uuid" NOT NULL,
    "payment_type" "public"."payment_type" NOT NULL,
    "amount_ore" integer NOT NULL,
    "status" "public"."payment_status" NOT NULL,
    "payment_provider" "public"."payment_provider" NOT NULL,
    "provider_metadata" "jsonb",
    "authorized_at" timestamp with time zone,
    "captured_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "failure_reason" "text",
    "refunded_at" timestamp with time zone,
    "refund_amount_ore" integer,
    "refund_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "provider_reference" character varying(64),
    CONSTRAINT "payments_amount_ore_positive" CHECK (("amount_ore" >= 0)),
    CONSTRAINT "payments_refund_amount_ore_positive" CHECK ((("refund_amount_ore" IS NULL) OR ("refund_amount_ore" >= 0)))
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON COLUMN "public"."payments"."provider_metadata" IS 'Complete provider response data including transaction IDs, status, amounts, timestamps. Single source of truth for all provider-specific information.';



COMMENT ON COLUMN "public"."payments"."provider_reference" IS 'Merchant reference used for webhook lookups. For Recurring API: Vipps chargeId. For ePayment API: order number or custom reference. Indexed for fast webhook processing.';



CREATE TABLE IF NOT EXISTS "public"."promo_code_redemptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "promo_code_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "payment_agreement_id" "uuid",
    "order_id" "uuid",
    "redeemed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."promo_code_redemptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."promo_codes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_type" "text" NOT NULL,
    "discount_value" integer NOT NULL,
    "max_discount_ore" integer,
    "active" boolean DEFAULT true NOT NULL,
    "valid_from" timestamp with time zone,
    "valid_until" timestamp with time zone,
    "max_redemptions" integer,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "promo_codes_discount_type_check" CHECK (("discount_type" = ANY (ARRAY['percentage'::"text", 'fixed'::"text"]))),
    CONSTRAINT "promo_codes_discount_value_check" CHECK (("discount_value" > 0)),
    CONSTRAINT "promo_codes_max_discount_ore_check" CHECK ((("max_discount_ore" IS NULL) OR ("max_discount_ore" >= 0))),
    CONSTRAINT "promo_codes_max_redemptions_check" CHECK ((("max_redemptions" IS NULL) OR ("max_redemptions" >= 0)))
);


ALTER TABLE "public"."promo_codes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "status" "public"."subscription_status" DEFAULT 'pending_payment'::"public"."subscription_status" NOT NULL,
    "started_at" timestamp with time zone,
    "paused_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_defaults" "jsonb" DEFAULT '{}'::"jsonb",
    "frequency" "text" DEFAULT 'weekly'::"text" NOT NULL,
    "payment_agreement_id" "uuid",
    CONSTRAINT "subscriptions_frequency_check" CHECK (("frequency" = ANY (ARRAY['weekly'::"text", 'biweekly'::"text", 'monthly'::"text", 'on_demand'::"text"])))
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."subscriptions"."order_defaults" IS 'Order generation defaults (JSONB): initial_address, pickup_method, pickup_location_description, special_instructions, location_city, default_needs_ironing, default_cleaner_id, first_pickup_date. The weekday is derived from first_pickup_date when needed.';



COMMENT ON COLUMN "public"."subscriptions"."frequency" IS 'Order generation frequency: weekly (4/month), biweekly (2/month), monthly (1/month), on_demand (single order, no recurring)';



CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(20) NOT NULL,
    "full_name" character varying(100) NOT NULL,
    "role" "public"."user_role" DEFAULT 'customer'::"public"."user_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "last_login_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "users_full_name_length" CHECK (("char_length"(("full_name")::"text") >= 2))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."cleaners"
    ADD CONSTRAINT "cleaners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cleaners"
    ADD CONSTRAINT "cleaners_tax_id_key" UNIQUE ("tax_id");



ALTER TABLE ONLY "public"."cleaners"
    ADD CONSTRAINT "cleaners_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_agreements"
    ADD CONSTRAINT "payment_agreements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_agreements"
    ADD CONSTRAINT "payment_agreements_provider_agreement_id_key" UNIQUE ("provider_agreement_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_promo_code_id_customer_id_key" UNIQUE ("promo_code_id", "customer_id");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."promo_codes"
    ADD CONSTRAINT "promo_codes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_cleaners_base_city" ON "public"."cleaners" USING "btree" ("base_city");



CREATE INDEX "idx_cleaners_verification_status" ON "public"."cleaners" USING "btree" ("verification_status");



CREATE INDEX "idx_orders_actual_weight_kg" ON "public"."orders" USING "btree" ("actual_weight_kg") WHERE ("actual_weight_kg" IS NOT NULL);



CREATE INDEX "idx_orders_cleaner_id" ON "public"."orders" USING "btree" ("cleaner_id");



CREATE INDEX "idx_orders_cleaner_status" ON "public"."orders" USING "btree" ("cleaner_id", "status");



CREATE INDEX "idx_orders_customer_created" ON "public"."orders" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "idx_orders_customer_id" ON "public"."orders" USING "btree" ("customer_id");



CREATE INDEX "idx_orders_payment_agreement_id" ON "public"."orders" USING "btree" ("payment_agreement_id");



CREATE INDEX "idx_orders_scheduled_date" ON "public"."orders" USING "btree" ("scheduled_date");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_subscription_id" ON "public"."orders" USING "btree" ("subscription_id");



CREATE INDEX "idx_payment_agreements_customer_id" ON "public"."payment_agreements" USING "btree" ("customer_id");



CREATE INDEX "idx_payment_agreements_status" ON "public"."payment_agreements" USING "btree" ("status");



CREATE INDEX "idx_payments_created_at" ON "public"."payments" USING "btree" ("created_at");



CREATE INDEX "idx_payments_customer_created" ON "public"."payments" USING "btree" ("customer_id", "created_at" DESC);



CREATE INDEX "idx_payments_customer_id" ON "public"."payments" USING "btree" ("customer_id");



CREATE INDEX "idx_payments_order_id" ON "public"."payments" USING "btree" ("order_id");



CREATE INDEX "idx_payments_payment_provider" ON "public"."payments" USING "btree" ("payment_provider");



CREATE INDEX "idx_payments_payment_type" ON "public"."payments" USING "btree" ("payment_type");



CREATE INDEX "idx_payments_provider_reference" ON "public"."payments" USING "btree" ("provider_reference") WHERE ("provider_reference" IS NOT NULL);



CREATE INDEX "idx_payments_status" ON "public"."payments" USING "btree" ("status");



CREATE INDEX "idx_promo_code_redemptions_customer_id" ON "public"."promo_code_redemptions" USING "btree" ("customer_id");



CREATE INDEX "idx_promo_code_redemptions_promo_code_id" ON "public"."promo_code_redemptions" USING "btree" ("promo_code_id");



CREATE INDEX "idx_promo_codes_code" ON "public"."promo_codes" USING "btree" ("code");



CREATE INDEX "idx_subscriptions_customer_id" ON "public"."subscriptions" USING "btree" ("customer_id");



CREATE INDEX "idx_subscriptions_frequency" ON "public"."subscriptions" USING "btree" ("frequency");



CREATE UNIQUE INDEX "idx_subscriptions_one_active_per_customer" ON "public"."subscriptions" USING "btree" ("customer_id") WHERE ("status" = ANY (ARRAY['pending_payment'::"public"."subscription_status", 'active'::"public"."subscription_status", 'paused'::"public"."subscription_status"]));



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_users_role" ON "public"."users" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "update_admins_updated_at" BEFORE UPDATE ON "public"."admins" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cleaners_updated_at" BEFORE UPDATE ON "public"."cleaners" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payment_agreements_updated_at" BEFORE UPDATE ON "public"."payment_agreements" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_payments_updated_at" BEFORE UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_promo_codes_updated_at" BEFORE UPDATE ON "public"."promo_codes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_subscriptions_updated_at" BEFORE UPDATE ON "public"."subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_updated_at" BEFORE UPDATE ON "public"."users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."admins"
    ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."cleaners"
    ADD CONSTRAINT "cleaners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_cleaner_id_fkey" FOREIGN KEY ("cleaner_id") REFERENCES "public"."cleaners"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_payment_agreement_id_fkey" FOREIGN KEY ("payment_agreement_id") REFERENCES "public"."payment_agreements"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id");



ALTER TABLE ONLY "public"."payment_agreements"
    ADD CONSTRAINT "payment_agreements_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_payment_agreement_id_fkey" FOREIGN KEY ("payment_agreement_id") REFERENCES "public"."payment_agreements"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."promo_code_redemptions"
    ADD CONSTRAINT "promo_code_redemptions_promo_code_id_fkey" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_payment_agreement_id_fkey" FOREIGN KEY ("payment_agreement_id") REFERENCES "public"."payment_agreements"("id");



ALTER TABLE "public"."admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow cleaners to access their cleaner row" ON "public"."cleaners" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "allow cleaners to update their cleaner row" ON "public"."cleaners" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND ("verification_status" = ( SELECT "cleaners_1"."verification_status"
   FROM "public"."cleaners" "cleaners_1"
  WHERE ("cleaners_1"."id" = "cleaners_1"."id"))) AND (NOT ("approved_at" IS DISTINCT FROM ( SELECT "cleaners_1"."approved_at"
   FROM "public"."cleaners" "cleaners_1"
  WHERE ("cleaners_1"."id" = "cleaners_1"."id")))) AND (NOT ("suspended_at" IS DISTINCT FROM ( SELECT "cleaners_1"."suspended_at"
   FROM "public"."cleaners" "cleaners_1"
  WHERE ("cleaners_1"."id" = "cleaners_1"."id"))))));



CREATE POLICY "allow customers to access their subscriptions" ON "public"."subscriptions" FOR SELECT TO "authenticated" USING (("customer_id" IN ( SELECT "customers"."id"
   FROM "public"."customers"
  WHERE ("customers"."user_id" = "auth"."uid"()))));



CREATE POLICY "allow users to access their customer row" ON "public"."customers" FOR SELECT TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "allow users to create their own customer record" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "allow users to update their customer row" ON "public"."customers" FOR UPDATE TO "authenticated" USING (("user_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."cleaners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_agreements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_code_redemptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."promo_codes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users can read own record" ON "public"."users" FOR SELECT TO "authenticated" USING (("id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "supabase_auth_admin";




























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."admins" TO "anon";
GRANT ALL ON TABLE "public"."admins" TO "authenticated";
GRANT ALL ON TABLE "public"."admins" TO "service_role";



GRANT ALL ON TABLE "public"."cleaners" TO "anon";
GRANT ALL ON TABLE "public"."cleaners" TO "authenticated";
GRANT ALL ON TABLE "public"."cleaners" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";
GRANT ALL ON TABLE "public"."customers" TO "supabase_auth_admin";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_agreements" TO "anon";
GRANT ALL ON TABLE "public"."payment_agreements" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_agreements" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."promo_code_redemptions" TO "anon";
GRANT ALL ON TABLE "public"."promo_code_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_code_redemptions" TO "service_role";



GRANT ALL ON TABLE "public"."promo_codes" TO "anon";
GRANT ALL ON TABLE "public"."promo_codes" TO "authenticated";
GRANT ALL ON TABLE "public"."promo_codes" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";
GRANT ALL ON TABLE "public"."users" TO "supabase_auth_admin";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































--
-- Dumped schema changes for auth and storage
--

CREATE OR REPLACE TRIGGER "on_auth_user_created" AFTER INSERT ON "auth"."users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();



