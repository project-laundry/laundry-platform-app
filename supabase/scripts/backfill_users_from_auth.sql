-- Backfill public.users (and public.customers) from auth.users
-- =============================================================================
-- Run MANUALLY against the target project (SQL editor or psql) AFTER
-- `supabase db reset --linked`, ONLY if you want to KEEP the authenticated users
-- that already exist in auth.users.
--
-- WHY: public.handle_new_user() recreates the public.users row on signup, but it
-- only fires on INSERT into auth.users. Users that existed BEFORE the reset are
-- left in auth.users with no matching public.users row (there is no FK between
-- them). This script reproduces the trigger's logic for those existing users.
--
-- SCOPE / LIMITS — read before running:
--   * Restores IDENTITY only: id, email, phone, full_name, role + an empty
--     customers shell for customer-role users (exactly what the trigger creates).
--   * Does NOT restore cleaner profiles, addresses, orders, subscriptions or
--     payment agreements — those were dropped by the reset and are not present
--     in auth.users. If any of these users are cleaners or have data you need,
--     use the no-reset (surgical delta) path instead.
--   * This is an operational one-off, NOT a migration. Do NOT place it in
--     supabase/migrations/ (it would re-run on every fresh DB).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) DRY RUN — preview what WILL be inserted. Run this first; it changes nothing.
-- -----------------------------------------------------------------------------
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'phone', '')     AS phone,
  COALESCE(au.raw_user_meta_data->>'full_name', '') AS full_name,
  CASE
    WHEN au.raw_user_meta_data->>'role'
         IN (SELECT unnest(enum_range(NULL::public.user_role))::text)
    THEN (au.raw_user_meta_data->>'role')::public.user_role
    ELSE 'customer'::public.user_role
  END AS role
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
ORDER BY au.created_at;

-- 1b) Rows that will be SKIPPED because they can't satisfy public.users
--     constraints (NULL email, or full_name shorter than 2 chars — the
--     users_full_name_length CHECK). Handle these by hand if you need them.
SELECT au.id, au.email, au.raw_user_meta_data->>'full_name' AS full_name
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
  AND (
    au.email IS NULL
    OR char_length(COALESCE(au.raw_user_meta_data->>'full_name', '')) < 2
  );

-- -----------------------------------------------------------------------------
-- 2) BACKFILL — transactional.
-- -----------------------------------------------------------------------------
BEGIN;

-- public.users (mirrors handle_new_user's INSERT, but preserves the original
-- auth.users.created_at instead of NOW()).
INSERT INTO public.users (id, email, phone, full_name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  COALESCE(au.raw_user_meta_data->>'full_name', ''),
  CASE
    WHEN au.raw_user_meta_data->>'role'
         IN (SELECT unnest(enum_range(NULL::public.user_role))::text)
    THEN (au.raw_user_meta_data->>'role')::public.user_role
    ELSE 'customer'::public.user_role
  END,
  COALESCE(au.created_at, NOW()),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id)
  AND au.email IS NOT NULL
  AND char_length(COALESCE(au.raw_user_meta_data->>'full_name', '')) >= 2
ON CONFLICT DO NOTHING;  -- skip residual email/phone/pk uniqueness clashes

-- public.customers shell for customer-role users (mirrors the trigger).
INSERT INTO public.customers (user_id)
SELECT u.id
FROM public.users u
WHERE u.role = 'customer'::public.user_role
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = u.id)
ON CONFLICT (user_id) DO NOTHING;

COMMIT;

-- -----------------------------------------------------------------------------
-- 3) VERIFY — counts should reconcile (allowing for any rows reported in 1b).
-- -----------------------------------------------------------------------------
SELECT
  (SELECT count(*) FROM auth.users)                           AS auth_users,
  (SELECT count(*) FROM public.users)                         AS public_users,
  (SELECT count(*) FROM public.users WHERE role = 'customer') AS customer_users,
  (SELECT count(*) FROM public.customers)                     AS customers;

-- Any auth users STILL without a public.users row (skipped/clashed) — investigate:
SELECT au.id, au.email,
       au.raw_user_meta_data->>'full_name' AS full_name,
       au.raw_user_meta_data->>'phone'     AS phone
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id);
