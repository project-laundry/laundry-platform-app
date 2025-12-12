-- Add INSERT policy for customers table
-- Allow authenticated users to create their own customer record

CREATE POLICY "allow users to create their own customer record"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
);
