-- =============================================================================
-- RLS Policies for Subscriptions Table
-- =============================================================================
-- Pattern: Customers can SELECT own subscriptions, cleaners can SELECT assigned subscriptions
-- Protection: No INSERT/UPDATE/DELETE policies - mutations via service role only
-- Service role: Used by server actions, cron jobs, webhooks (bypass RLS)
-- =============================================================================

-- SELECT Policy: Customers can view their own subscriptions
-- Joins through customers table to match auth.uid()
CREATE POLICY "allow customers to access their subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT id FROM public.customers WHERE user_id = auth.uid()
  )
);

-- SELECT Policy: Cleaners can view subscriptions they are assigned to
-- Direct comparison of assigned_cleaner_id
CREATE POLICY "allow cleaners to access assigned subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  assigned_cleaner_id IN (
    SELECT id FROM public.cleaners WHERE user_id = auth.uid()
  )
);

-- No INSERT policy: Subscription creation via service role (createSubscription server action)
-- No UPDATE policy: Activation/updates via service role (activateSubscription, updateSubscriptionVippsAgreement)
-- No DELETE policy: Soft delete via status field (cancelled, expired)
