-- Security hardening before launch (issue #117, Supabase security advisors).
-- No application behaviour changes: every statement removes access that the
-- app does not use.
--
-- 1) Trigger functions are not an API. They were executable by anon and
--    authenticated through /rest/v1/rpc (handle_new_user is SECURITY DEFINER).
--    Triggers keep firing: EXECUTE is checked when a trigger is created, not
--    when it fires. service_role and supabase_auth_admin keep an explicit grant.
-- 2) update_updated_at_column had a role-mutable search_path.
-- 3) These tables have RLS enabled with no policies, so anon/authenticated
--    could never read or write them — but they still held GRANT ALL, which
--    means one accidental permissive policy would open the table to the anon
--    key. All access goes through the service role (createAdminClient).
-- 4) The cleaners self-update policy compared each column with a subquery on
--    "cleaners_1.id = cleaners_1.id" (always true): with two or more cleaner
--    rows the subquery returns several rows and every update fails, and it
--    never protected verification_status. Cleaner rows are only written with
--    the service role, so the policy is dropped instead of rewritten.

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.waitlist_mark_offer_eligible() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.waitlist_mark_offer_eligible() TO service_role, supabase_auth_admin;

ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

REVOKE ALL ON TABLE
  public.admins,
  public.drivers,
  public.orders,
  public.payment_agreements,
  public.payments,
  public.promo_code_redemptions,
  public.promo_codes,
  public.waitlist_signups
FROM anon, authenticated;

DROP POLICY IF EXISTS "allow cleaners to update their cleaner row" ON public.cleaners;
