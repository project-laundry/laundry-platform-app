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
vi.mock('@/lib/database/orders', () => ({
  getActiveOrdersBySubscriptionId: vi.fn(),
  getOrderById: vi.fn(),
}));

import { getSubscriptionById } from '@/lib/database/subscriptions';
import { getPaymentAgreementById, stopPaymentAgreement } from '@/lib/database/payment-agreements';
import { getActiveOrdersBySubscriptionId, getOrderById } from '@/lib/database/orders';
import {
  createPayment,
  updatePayment,
  failPaymentWithMetadata,
  hasUnsettledVippsPaymentForSubscription,
} from '@/lib/database/payments';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createChargeForCompletedOrder,
  stopVippsAgreementForCancelledSubscription,
  stopVippsAgreementForOneTimeOrder,
} from './service';

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

describe('stopVippsAgreementForOneTimeOrder', () => {
  type PaymentRow = {
    status: string;
    provider_reference: string | null;
    created_at: string;
    payment_provider: string;
  };

  const eq = vi.fn();

  /** The payments lookup is the only query this function runs through the admin client. */
  function mockPaymentsLookup(result: { data: PaymentRow[] | null; error: unknown }) {
    eq.mockResolvedValue(result);
    const select = vi.fn(() => ({ eq }));
    m(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ select })) });
  }

  /** A Vipps payment row created just now (so a pending one is not an orphan yet). */
  function payment(overrides: Partial<PaymentRow> = {}): PaymentRow {
    return {
      status: 'captured',
      provider_reference: 'chr-1',
      created_at: new Date().toISOString(),
      payment_provider: 'vipps',
      ...overrides,
    };
  }

  /** A cancelled one-time order with an active agreement and no payments. */
  function oneTimeMocks(orderOverrides: Record<string, unknown> = {}) {
    m(getOrderById).mockResolvedValue({
      id: 'ord-1',
      status: 'cancelled',
      subscription_id: null,
      payment_agreement_id: 'pa-1',
      total_cost_ore: null,
      ...orderOverrides,
    });
    m(getPaymentAgreementById).mockResolvedValue({
      id: 'pa-1',
      status: 'active',
      provider_agreement_id: 'agr-1',
    });
    m(stopPaymentAgreement).mockResolvedValue({ id: 'pa-1', status: 'stopped' });
    // clearAllMocks keeps implementations: an earlier test makes stopAgreement reject.
    stopAgreement.mockResolvedValue(undefined);
    mockPaymentsLookup({ data: [], error: null });
  }

  it('stops the Vipps agreement then marks the DB row stopped for a cancelled one-time order', async () => {
    oneTimeMocks();

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(eq).toHaveBeenCalledWith('order_id', 'ord-1');
    expect(stopAgreement).toHaveBeenCalledWith('agr-1');
    expect(stopPaymentAgreement).toHaveBeenCalledWith('pa-1');
    expect(stopAgreement.mock.invocationCallOrder[0]).toBeLessThan(
      m(stopPaymentAgreement).mock.invocationCallOrder[0]
    );
  });

  it('stops for a completed one-time order with a 0 total and no payment (100 % promo)', async () => {
    oneTimeMocks({ status: 'completed', total_cost_ore: 0 });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).toHaveBeenCalledWith('agr-1');
    expect(stopPaymentAgreement).toHaveBeenCalledWith('pa-1');
  });

  it('stops for a completed one-time order whose charge is already captured', async () => {
    oneTimeMocks({ status: 'completed', total_cost_ore: 50000 });
    mockPaymentsLookup({ data: [payment({ status: 'captured' })], error: null });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).toHaveBeenCalledWith('agr-1');
  });

  it('is a no-op when the order does not exist', async () => {
    oneTimeMocks();
    m(getOrderById).mockResolvedValue(null);

    await stopVippsAgreementForOneTimeOrder('ord-x');

    expect(getPaymentAgreementById).not.toHaveBeenCalled();
    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('is a no-op for a subscription order', async () => {
    oneTimeMocks({ subscription_id: 'sub-1' });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(getPaymentAgreementById).not.toHaveBeenCalled();
    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('is a no-op for an order without a payment agreement', async () => {
    oneTimeMocks({ payment_agreement_id: null });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(getPaymentAgreementById).not.toHaveBeenCalled();
    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('is a no-op while the order is still in progress', async () => {
    oneTimeMocks({ status: 'ready_for_delivery', total_cost_ore: 50000 });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(getPaymentAgreementById).not.toHaveBeenCalled();
    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('is a no-op when the agreement is already stopped', async () => {
    oneTimeMocks();
    m(getPaymentAgreementById).mockResolvedValue({
      id: 'pa-1',
      status: 'stopped',
      provider_agreement_id: 'agr-1',
    });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(createAdminClient).not.toHaveBeenCalled();
    expect(stopAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('does not stop while a Vipps charge for the order is still pending', async () => {
    oneTimeMocks({ status: 'completed', total_cost_ore: 50000 });
    mockPaymentsLookup({ data: [payment({ status: 'pending' })], error: null });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('does not stop while a Vipps charge for the order is authorized', async () => {
    oneTimeMocks({ status: 'completed', total_cost_ore: 50000 });
    mockPaymentsLookup({ data: [payment({ status: 'authorized' })], error: null });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('does not stop a completed order whose only charge failed (the admin retry needs the agreement)', async () => {
    oneTimeMocks({ status: 'completed', total_cost_ore: 50000 });
    mockPaymentsLookup({ data: [payment({ status: 'failed' })], error: null });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('does not stop a completed order with a price above 0 and no payment row at all', async () => {
    oneTimeMocks({ status: 'completed', total_cost_ore: 50000 });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('does not stop a completed order with only an orphan pending row and a price above 0', async () => {
    oneTimeMocks({ status: 'completed', total_cost_ore: 50000 });
    mockPaymentsLookup({
      data: [payment({ status: 'pending', provider_reference: null, created_at: '2020-01-01T00:00:00.000Z' })],
      error: null,
    });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('does not stop a completed order that has no price', async () => {
    oneTimeMocks({ status: 'completed', total_cost_ore: null });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).not.toHaveBeenCalled();
  });

  it('does not stop when the payments cannot be read (fail safe)', async () => {
    oneTimeMocks();
    mockPaymentsLookup({ data: null, error: { message: 'boom' } });

    await stopVippsAgreementForOneTimeOrder('ord-1');

    expect(stopAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('does not mark the DB row stopped when the Vipps call fails, and does not throw', async () => {
    oneTimeMocks();
    stopAgreement.mockRejectedValue(new Error('Vipps down'));

    await expect(stopVippsAgreementForOneTimeOrder('ord-1')).resolves.toBeUndefined();

    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('does not throw when the DB row cannot be marked stopped after the Vipps stop', async () => {
    oneTimeMocks();
    m(stopPaymentAgreement).mockResolvedValue(null);

    await expect(stopVippsAgreementForOneTimeOrder('ord-1')).resolves.toBeUndefined();

    expect(stopAgreement).toHaveBeenCalledWith('agr-1');
  });

  it('does not throw when the order lookup itself throws', async () => {
    oneTimeMocks();
    m(getOrderById).mockRejectedValue(new Error('db down'));

    await expect(stopVippsAgreementForOneTimeOrder('ord-1')).resolves.toBeUndefined();

    expect(stopAgreement).not.toHaveBeenCalled();
  });
});
