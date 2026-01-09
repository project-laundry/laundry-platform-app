-- Add RLS policy for users to read their own record
-- This allows the login flow to fetch the user's role from the users table

CREATE POLICY "users can read own record"
ON public.users
FOR SELECT
TO authenticated
USING (id = auth.uid());
