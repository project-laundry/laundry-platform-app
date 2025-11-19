-- Allow public read access to subscription plans
-- This enables unauthenticated users to view available plans

CREATE POLICY "Allow public read access to subscription_plans"
ON subscription_plans
FOR SELECT
TO public
USING (true);
