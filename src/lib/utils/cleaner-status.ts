import type { CleanerVerificationStatus } from '@/types/database';

/**
 * Norwegian labels for cleaner verification statuses (admin dashboard).
 */
export const CLEANER_VERIFICATION_LABELS: Record<CleanerVerificationStatus, string> = {
  pending: 'Venter på godkjenning',
  approved: 'Aktiv',
  rejected: 'Avvist',
  suspended: 'Deaktivert',
};

/**
 * StatusBadge variants for cleaner verification statuses.
 */
export const CLEANER_VERIFICATION_VARIANT: Record<
  CleanerVerificationStatus,
  'success' | 'warning' | 'destructive' | 'neutral'
> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  suspended: 'neutral',
};
