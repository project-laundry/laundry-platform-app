-- Restore standard Supabase grants for service_role on the public schema.
-- service_role is used by SUPABASE_SERVICE_ROLE_KEY (src/lib/supabase/admin.ts) and is intended
-- to have full backend access (it bypasses RLS by design). Production is missing the default
-- privileges Supabase normally provisions, causing 42501 errors on cleaners/orders/subscriptions
-- and likely every other table over time.
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Ensure future tables/sequences/functions created in public are also granted to service_role,
-- regardless of which role created them.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Same for objects created by postgres / supabase_admin (the most common creators in Supabase).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
