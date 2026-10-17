-- Admin "Avvis søknaden": until now setCleanerVerificationStatus only wrote
-- approved/suspended, so a rejected applicant was left pending (or suspended)
-- with no record of why. Store the rejection time and the reason the admin
-- wrote; the cleaner dashboard shows the reason verbatim. A later approval
-- clears both again.
ALTER TABLE public.cleaners
  ADD COLUMN rejected_at timestamp with time zone,
  ADD COLUMN rejection_reason text,
  ADD CONSTRAINT cleaners_rejection_reason_length
    CHECK (char_length(rejection_reason) <= 500);

COMMENT ON COLUMN public.cleaners.rejected_at IS
  'When an admin rejected the application (verification_status = rejected). Cleared by a later approval.';
COMMENT ON COLUMN public.cleaners.rejection_reason IS
  'Reason written by the admin when rejecting; shown verbatim on the cleaner dashboard. Max 500 chars. Cleared by a later approval.';
