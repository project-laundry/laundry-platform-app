import type { SubscriptionStatus, SubscriptionFrequency } from '@/types/database';

/**
 * Norwegian labels for subscription statuses
 */
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  pending_payment: 'Venter på betaling',
  active: 'Aktiv',
  paused: 'Pauset',
  cancelled: 'Kansellert',
  expired: 'Utløpt',
};

/**
 * Norwegian labels for subscription frequencies
 */
export const SUBSCRIPTION_FREQUENCY_LABELS: Record<SubscriptionFrequency, string> = {
  weekly: 'Ukentlig',
  biweekly: 'Annenhver uke',
  monthly: 'Månedlig',
  on_demand: 'Engangsbestilling',
};

/**
 * Badge variants for subscription statuses
 */
export const SUBSCRIPTION_STATUS_VARIANT: Record<SubscriptionStatus, 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'info' | 'warning' | 'neutral'> = {
  pending_payment: 'warning',
  active: 'success',
  paused: 'neutral',
  cancelled: 'destructive',
  expired: 'neutral',
};

/**
 * Get display label for subscription status
 */
export function getSubscriptionStatusLabel(status: SubscriptionStatus): string {
  return SUBSCRIPTION_STATUS_LABELS[status];
}

/**
 * Get display label for subscription frequency
 */
export function getSubscriptionFrequencyLabel(frequency: SubscriptionFrequency): string {
  return SUBSCRIPTION_FREQUENCY_LABELS[frequency];
}

/**
 * Get badge variant for subscription status
 */
export function getSubscriptionStatusVariant(status: SubscriptionStatus): 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'info' | 'warning' | 'neutral' {
  return SUBSCRIPTION_STATUS_VARIANT[status];
}
