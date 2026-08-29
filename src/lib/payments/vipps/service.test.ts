import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// --- Mock every dependency stopVippsAgreementForCancelledSubscription reaches ---
const stopAgreement = vi.fn();
vi.mock('./recurring-client', () => ({
  createVippsRecurringClient: vi.fn(() => ({ stopAgreement })),
}));
vi.mock('@/lib/database/payments', () => ({
  createPayment: vi.fn(),
  hasUnsettledVippsPaymentForSubscription: vi.fn(),
}));
vi.mock('@/lib/database/subscriptions', () => ({ getSubscriptionById: vi.fn() }));
vi.mock('@/lib/database/payment-agreements', () => ({
  getPaymentAgreementById: vi.fn(),
  stopPaymentAgreement: vi.fn(),
}));
vi.mock('@/lib/database/orders', () => ({ getActiveOrdersBySubscriptionId: vi.fn() }));

import { getSubscriptionById } from '@/lib/database/subscriptions';
import { getPaymentAgreementById, stopPaymentAgreement } from '@/lib/database/payment-agreements';
import { getActiveOrdersBySubscriptionId } from '@/lib/database/orders';
import { hasUnsettledVippsPaymentForSubscription } from '@/lib/database/payments';
import { stopVippsAgreementForCancelledSubscription } from './service';

const m = (fn: unknown) => fn as Mock;

/** Wire the common happy-path return values; individual tests override as needed. */
function happyPathMocks() {
  m(getSubscriptionById).mockResolvedValue({
    id: 'sub-1',
    status: 'cancelled',
    payment_agreement_id: 'pa-1',
  });
  m(getPaymentAgreementById).mockResolvedValue({
    id: 'pa-1',
    status: 'active',
    provider_agreement_id: 'agr-1',
  });
  m(getActiveOrdersBySubscriptionId).mockResolvedValue([]);
  m(hasUnsettledVippsPaymentForSubscription).mockResolvedValue(false);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('stopVippsAgreementForCancelledSubscription', () => {
  it('stops the Vipps agreement then marks the DB row stopped when cancelled, active, and no active orders remain', async () => {
    happyPathMocks();

    await stopVippsAgreementForCancelledSubscription('sub-1');

    expect(stopAgreement).toHaveBeenCalledWith('agr-1');
    expect(stopPaymentAgreement).toHaveBeenCalledWith('pa-1');
  });

  it('is a no-op when the subscription is still active', async () => {
    happyPathMocks();
    m(getSubscriptionById).mockResolvedValue({
      id: 'sub-1',
      status: 'active',
      payment_agreement_id: 'pa-1',
    });

    await stopVippsAgreementForCancelledSubscription('sub-1');

    expect(stopAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('is a no-op when the subscription has no payment agreement', async () => {
    happyPathMocks();
    m(getSubscriptionById).mockResolvedValue({
      id: 'sub-1',
      status: 'cancelled',
      payment_agreement_id: null,
    });

    await stopVippsAgreementForCancelledSubscription('sub-1');

    expect(getPaymentAgreementById).not.toHaveBeenCalled();
    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('is a no-op when the agreement is already stopped', async () => {
    happyPathMocks();
    m(getPaymentAgreementById).mockResolvedValue({
      id: 'pa-1',
      status: 'stopped',
      provider_agreement_id: 'agr-1',
    });

    await stopVippsAgreementForCancelledSubscription('sub-1');

    expect(getActiveOrdersBySubscriptionId).not.toHaveBeenCalled();
    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('is a no-op while another active order remains', async () => {
    happyPathMocks();
    m(getActiveOrdersBySubscriptionId).mockResolvedValue([{ id: 'ord-1', status: 'picked_up' }]);

    await stopVippsAgreementForCancelledSubscription('sub-1');

    expect(stopAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('does not mark the DB row stopped when the Vipps call fails, and does not throw', async () => {
    happyPathMocks();
    stopAgreement.mockRejectedValue(new Error('Vipps down'));

    await expect(stopVippsAgreementForCancelledSubscription('sub-1')).resolves.toBeUndefined();

    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('is a no-op while a Vipps charge for the subscription is still pending/authorized', async () => {
    happyPathMocks();
    m(hasUnsettledVippsPaymentForSubscription).mockResolvedValue(true);

    await stopVippsAgreementForCancelledSubscription('sub-1');

    expect(stopAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });
});
