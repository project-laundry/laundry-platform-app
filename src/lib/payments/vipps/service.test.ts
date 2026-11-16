import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// --- Mock every dependency stopVippsAgreementForCancelledSubscription reaches ---
const stopAgreement = vi.fn();
const createCharge = vi.fn();
vi.mock('./recurring-client', () => ({
  createVippsRecurringClient: vi.fn(() => ({ stopAgreement, createCharge })),
}));
vi.mock('@/lib/database/payments', () => ({
  createPayment: vi.fn(),
  updatePayment: vi.fn(),
  failPaymentWithMetadata: vi.fn(),
  hasUnsettledVippsPaymentForSubscription: vi.fn(),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/database/subscriptions', () => ({ getSubscriptionById: vi.fn() }));
vi.mock('@/lib/database/payment-agreements', () => ({
  getPaymentAgreementById: vi.fn(),
  stopPaymentAgreement: vi.fn(),
}));
vi.mock('@/lib/database/orders', () => ({ getActiveOrdersBySubscriptionId: vi.fn() }));

import { getSubscriptionById } from '@/lib/database/subscriptions';
import { getPaymentAgreementById, stopPaymentAgreement } from '@/lib/database/payment-agreements';
import { getActiveOrdersBySubscriptionId } from '@/lib/database/orders';
import {
  createPayment,
  updatePayment,
  failPaymentWithMetadata,
  hasUnsettledVippsPaymentForSubscription,
} from '@/lib/database/payments';
import { createAdminClient } from '@/lib/supabase/admin';
import { createChargeForCompletedOrder, stopVippsAgreementForCancelledSubscription } from './service';

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

describe('createChargeForCompletedOrder', () => {
  /** The order lookup is the only query this function runs through the admin client. */
  function mockOrderLookup() {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'ord-1',
        customer_id: 'cust-1',
        payment_agreements: { provider_agreement_id: 'agr-1' },
        subscriptions: null,
      },
      error: null,
    });
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ select })) });
  }

  beforeEach(() => {
    mockOrderLookup();
    m(createPayment).mockResolvedValue({ id: 'pay-1' });
  });

  it('stores the Vipps charge id on the payment when the charge is created', async () => {
    createCharge.mockResolvedValue({ chargeId: 'chr-1' });

    const paymentId = await createChargeForCompletedOrder('ord-1', 50000, 'NooraCare vask #1');

    expect(paymentId).toBe('pay-1');
    expect(createCharge).toHaveBeenCalledWith('agr-1', expect.objectContaining({ amount: 50000, transactionType: 'DIRECT_CAPTURE' }));
    expect(updatePayment).toHaveBeenCalledWith('pay-1', expect.objectContaining({ provider_reference: 'chr-1' }));
    expect(failPaymentWithMetadata).not.toHaveBeenCalled();
  });

  it('marks the payment failed with the Vipps error and rethrows when charge creation fails', async () => {
    createCharge.mockRejectedValue(new Error('Vipps create charge failed (500): boom'));

    await expect(createChargeForCompletedOrder('ord-1', 50000, 'NooraCare vask #1')).rejects.toThrow('boom');

    expect(failPaymentWithMetadata).toHaveBeenCalledWith(
      'pay-1',
      'Vipps charge creation failed: Vipps create charge failed (500): boom',
      expect.objectContaining({ vipps_agreement_id: 'agr-1', vipps_status: 'CREATION_FAILED' })
    );
    expect(updatePayment).not.toHaveBeenCalled();
  });
});
