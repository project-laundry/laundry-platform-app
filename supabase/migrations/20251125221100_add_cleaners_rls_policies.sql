-- =============================================================================
-- RLS Policies for Cleaners Table
-- =============================================================================
-- Pattern: Cleaners can SELECT/UPDATE own row (like customers table)
-- Protection: UPDATE policy prevents modification of admin-only fields
-- Service role: Used by system for operations that bypass RLS
-- =============================================================================

-- SELECT Policy: Cleaners can view their own complete profile
CREATE POLICY "allow cleaners to access their cleaner row"
ON public.cleaners
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- UPDATE Policy: Cleaners can update own profile EXCEPT admin-controlled fields
-- Protected fields: verification_status, approved_at, suspended_at
CREATE POLICY "allow cleaners to update their cleaner row"
ON public.cleaners
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
)
WITH CHECK (
  user_id = auth.uid()
  -- Admin-only fields must not change (prevents self-approval, etc.)
  AND verification_status = (SELECT verification_status FROM cleaners WHERE id = cleaners.id)
  AND approved_at IS NOT DISTINCT FROM (SELECT approved_at FROM cleaners WHERE id = cleaners.id)
  AND suspended_at IS NOT DISTINCT FROM (SELECT suspended_at FROM cleaners WHERE id = cleaners.id)
);

-- No INSERT policy: Profile creation via service role (onboarding server action)
-- No DELETE policy: Soft delete via deleted_at (CASCADE from users table)
-- No customer/public access: Server actions filter and return data
