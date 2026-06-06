import { describe, it, expect } from 'vitest';
import type { SubscriptionStatus, SubscriptionFrequency } from '@/types/database';
import {
  SUBSCRIPTION_STATUS_LABELS,
  SUBSCRIPTION_FREQUENCY_LABELS,
  getSubscriptionStatusLabel,
  getSubscriptionFrequencyLabel,
  getSubscriptionStatusVariant,
} from './subscription-status';

const ALL_STATUSES: SubscriptionStatus[] = [
  'pending_payment',
  'active',
  'paused',
  'cancelled',
  'expired',
];

const ALL_FREQUENCIES: SubscriptionFrequency[] = ['weekly', 'biweekly', 'monthly', 'on_demand'];

describe('subscription status labels & variants', () => {
  it('has a non-empty label and a variant for every status', () => {
    for (const status of ALL_STATUSES) {
      expect(getSubscriptionStatusLabel(status)).toBe(SUBSCRIPTION_STATUS_LABELS[status]);
      expect(getSubscriptionStatusLabel(status).length).toBeGreaterThan(0);
      expect(getSubscriptionStatusVariant(status)).toBeDefined();
    }
  });
});

describe('subscription frequency labels', () => {
  it('has a non-empty label for every frequency', () => {
    for (const frequency of ALL_FREQUENCIES) {
      expect(getSubscriptionFrequencyLabel(frequency)).toBe(SUBSCRIPTION_FREQUENCY_LABELS[frequency]);
      expect(getSubscriptionFrequencyLabel(frequency).length).toBeGreaterThan(0);
    }
  });
});
