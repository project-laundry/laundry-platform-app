-- Policy: allow authenticated users to SELECT only their own rows
CREATE POLICY "allow users to access their customer row"
ON public.customers
FOR SELECT
TO authenticated
USING (
    -- compare the table's user_id with the current auth uid
    (user_id = (SELECT auth.uid()))
);

-- Policy: allow authenticated users to UPDATE only rows they own
CREATE POLICY "allow users to update their customer row" ON public.customers
  FOR UPDATE
  TO authenticated
  USING (
    (user_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    (user_id = (SELECT auth.uid()))
  );