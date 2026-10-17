import type { Payment, PaymentStatus } from '@/types/database';

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

/**
 * A Vipps payment row is inserted BEFORE the charge is created at Vipps and
 * only gets its provider_reference (charge id) afterwards. If that call never
 * completes (timeout, crash) the row stays `pending` with no reference and no
 * webhook will ever update it. After this grace period such a row is an
 * "orphan": it no longer blocks the deferred agreement stop and it is counted
 * as a failed payment in the admin overview.
 */
export const ORPHAN_PENDING_GRACE_MINUTES = 15;

/** ISO timestamp of "now minus the grace period", for PostgREST filters. */
export function orphanPendingCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - ORPHAN_PENDING_GRACE_MINUTES * 60_000).toISOString();
}

/** True for a pending row that never got a Vipps charge id and is past the grace period. */
export function isOrphanPendingPayment(
  payment: Pick<Payment, 'status' | 'provider_reference' | 'created_at'>,
  now: Date = new Date()
): boolean {
  return (
    payment.status === 'pending' &&
    payment.provider_reference === null &&
    new Date(payment.created_at).getTime() < now.getTime() - ORPHAN_PENDING_GRACE_MINUTES * 60_000
  );
}

/** Statuses that mean the order's money is settled or reserved at Vipps. */
const SETTLED_PAYMENT_STATUSES: PaymentStatus[] = ['authorized', 'captured', 'refunded'];

/**
 * True when the order already has a payment that is settled (captured,
 * refunded), reserved (authorized) or still in flight at Vipps (pending and not
 * an orphan — a DIRECT_CAPTURE charge sits in `pending` with a
 * provider_reference until its due date). False when there are no rows or every
 * row is failed, cancelled or an orphan: then the customer has not paid and an
 * admin may create a new charge («Belast på nytt»).
 *
 * Single source of truth for the cleaner's "not charged" warning, the admin
 * order page's retry button and retryChargeAction.
 */
export function hasLivePayment(
  payments: Pick<Payment, 'status' | 'provider_reference' | 'created_at'>[],
  now: Date = new Date()
): boolean {
  return payments.some(
    (payment) =>
      SETTLED_PAYMENT_STATUSES.includes(payment.status) ||
      (payment.status === 'pending' && !isOrphanPendingPayment(payment, now))
  );
}
