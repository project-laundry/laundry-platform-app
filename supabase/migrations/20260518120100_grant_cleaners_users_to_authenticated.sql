-- Grant table-level privileges required by existing RLS policies on public.cleaners and public.users.
-- RLS continues to enforce row-level access (user_id = auth.uid() / id = auth.uid()).
--
-- cleaners: SELECT + UPDATE policies exist (20251125221100_add_cleaners_rls_policies.sql).
--   No INSERT/DELETE policies — profile creation goes through the service role.
-- users: SELECT-only policy exists (20260109120000_add_users_rls_policy.sql).
--   Rows are created by the auth trigger running as supabase_auth_admin.
GRANT SELECT, UPDATE ON public.cleaners TO authenticated;
GRANT SELECT ON public.users TO authenticated;
