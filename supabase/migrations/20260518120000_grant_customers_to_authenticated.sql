-- Grant table-level privileges required by existing RLS policies on public.customers.
-- RLS still restricts rows to those where user_id = auth.uid().
-- See: 20251119130802_add_customer_policy.sql, 20251211213737_add_customer_insert_policy.sql
GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
