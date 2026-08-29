import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// --- Mock every dependency the action reaches (Supabase, Vipps, DB layer) ---
const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/database/customers', () => ({ getCustomerByUserId: vi.fn() }));
vi.mock('@/lib/database/subscriptions', () => ({
  getSubscriptionById: vi.fn(),
  cancelSubscription: vi.fn(),
}));
vi.mock('@/lib/database/payment-agreements', () => ({
  getPaymentAgreementById: vi.fn(),
  stopPaymentAgreement: vi.fn(),
}));
vi.mock('@/lib/database/orders', () => ({ getActiveOrdersBySubscriptionId: vi.fn() }));
vi.mock('@/lib/payments/vipps/service', () => ({ cancelVippsAgreement: vi.fn() }));

import { getCustomerByUserId } from '@/lib/database/customers';
import { getSubscriptionById, cancelSubscription } from '@/lib/database/subscriptions';
import { getPaymentAgreementById, stopPaymentAgreement } from '@/lib/database/payment-agreements';
import { getActiveOrdersBySubscriptionId } from '@/lib/database/orders';
import { cancelVippsAgreement } from '@/lib/payments/vipps/service';
import { cancelSubscriptionAction } from './actions';

const m = (fn: unknown) => fn as Mock;

const SUBSCRIPTION = {
  id: 'sub-1',
  customer_id: 'cust-1',
  status: 'active' as const,
  payment_agreement_id: 'pa-1',
};

/** Wire the common happy-path return values; individual tests override as needed. */
function happyPathMocks() {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
  m(getSubscriptionById).mockResolvedValue(SUBSCRIPTION);
  m(cancelSubscription).mockResolvedValue({ ...SUBSCRIPTION, status: 'cancelled' });
  m(getActiveOrdersBySubscriptionId).mockResolvedValue([]);
  m(getPaymentAgreementById).mockResolvedValue({ id: 'pa-1', provider_agreement_id: 'agr-1' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('cancelSubscriptionAction — auth & ownership guards', () => {
  it('rejects when not authenticated', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const result = await cancelSubscriptionAction('sub-1');

    expect(result).toEqual({ success: false, error: 'Ikke autentisert' });
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it('rejects when the customer profile is missing', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue(null);

    const result = await cancelSubscriptionAction('sub-1');

    expect(result).toEqual({ success: false, error: 'Kundeprofil ikke funnet' });
  });

  it('rejects when the subscription does not exist', async () => {
    happyPathMocks();
    m(getSubscriptionById).mockResolvedValue(null);

    const result = await cancelSubscriptionAction('sub-1');

    expect(result).toEqual({ success: false, error: 'Abonnement ikke funnet' });
  });

  it('rejects when the subscription belongs to another customer', async () => {
    happyPathMocks();
    m(getSubscriptionById).mockResolvedValue({ ...SUBSCRIPTION, customer_id: 'other-cust' });

    const result = await cancelSubscriptionAction('sub-1');

    expect(result).toEqual({ success: false, error: 'Ikke autorisert' });
    expect(cancelSubscription).not.toHaveBeenCalled();
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
  });

  it('rejects an already-cancelled subscription without touching orders or Vipps', async () => {
    happyPathMocks();
    m(getSubscriptionById).mockResolvedValue({ ...SUBSCRIPTION, status: 'cancelled' });

    const result = await cancelSubscriptionAction('sub-1');

    expect(result).toEqual({ success: false, error: 'Abonnementet kan ikke kanselleres' });
    expect(getActiveOrdersBySubscriptionId).not.toHaveBeenCalled();
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
  });

  it('rejects an expired subscription', async () => {
    happyPathMocks();
    m(getSubscriptionById).mockResolvedValue({ ...SUBSCRIPTION, status: 'expired' });

    const result = await cancelSubscriptionAction('sub-1');

    expect(result).toEqual({ success: false, error: 'Abonnementet kan ikke kanselleres' });
  });
});

describe('cancelSubscriptionAction — cancellation flow', () => {
  it('cancels DB state and stops the Vipps agreement immediately when no in-flight order remains', async () => {
    happyPathMocks();

    const result = await cancelSubscriptionAction('sub-1');

    expect(cancelSubscription).toHaveBeenCalledWith('sub-1');
    expect(cancelVippsAgreement).toHaveBeenCalledWith('agr-1');
    expect(stopPaymentAgreement).toHaveBeenCalledWith('pa-1');
    expect(result).toEqual({ success: true, hasInFlightOrder: false });
  });

  it('defers the Vipps stop when an in-flight order remains', async () => {
    happyPathMocks();
    m(getActiveOrdersBySubscriptionId).mockResolvedValue([{ id: 'ord-1', status: 'picked_up' }]);

    const result = await cancelSubscriptionAction('sub-1');

    expect(cancelSubscription).toHaveBeenCalledWith('sub-1');
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, hasInFlightOrder: true });
  });

  it('still succeeds when the Vipps stop call fails', async () => {
    happyPathMocks();
    m(cancelVippsAgreement).mockRejectedValue(new Error('Vipps down'));

    const result = await cancelSubscriptionAction('sub-1');

    expect(result.success).toBe(true);
    expect(stopPaymentAgreement).toHaveBeenCalledWith('pa-1');
  });

  it('returns an error and never calls Vipps when cancelSubscription returns null', async () => {
    happyPathMocks();
    m(cancelSubscription).mockResolvedValue(null);

    const result = await cancelSubscriptionAction('sub-1');

    expect(result).toEqual({ success: false, error: 'Kunne ikke kansellere abonnementet' });
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
  });

  it('succeeds without any Vipps calls when the subscription has no payment_agreement_id', async () => {
    happyPathMocks();
    m(getSubscriptionById).mockResolvedValue({ ...SUBSCRIPTION, payment_agreement_id: null });

    const result = await cancelSubscriptionAction('sub-1');

    expect(result).toEqual({ success: true, hasInFlightOrder: false });
    expect(getPaymentAgreementById).not.toHaveBeenCalled();
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
  });
});
