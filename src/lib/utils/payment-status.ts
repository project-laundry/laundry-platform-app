import type { PaymentStatus } from '@/types/database';

/**
 * Norwegian labels for payment statuses (admin dashboard).
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Venter',
  authorized: 'Reservert',
  captured: 'Betalt',
  failed: 'Feilet',
  refunded: 'Refundert',
  cancelled: 'Kansellert',
};

/**
 * StatusBadge variants for payment statuses.
 */
export const PAYMENT_STATUS_VARIANT: Record<
  PaymentStatus,
  'success' | 'info' | 'warning' | 'destructive' | 'neutral'
> = {
  pending: 'warning',
  authorized: 'info',
  captured: 'success',
  failed: 'destructive',
  refunded: 'neutral',
  cancelled: 'neutral',
};
