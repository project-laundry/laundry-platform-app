import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

// --- Mock every dependency the actions reach (Supabase, Vipps, DB layer) ---
const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/database/customers', () => ({ getCustomerByUserId: vi.fn() }));
vi.mock('@/lib/database/promo-codes', () => ({ validatePromoCode: vi.fn() }));
vi.mock('@/lib/database/subscriptions', () => ({
  createSubscription: vi.fn(),
  getActiveSubscriptionByCustomerId: vi.fn(),
  getSubscriptionById: vi.fn(),
}));
vi.mock('@/lib/database/payment-agreements', () => ({
  createPaymentAgreement: vi.fn(),
  getPaymentAgreementByProviderId: vi.fn(),
  getPaymentAgreementsByCustomerId: vi.fn(),
}));
vi.mock('@/lib/database/cleaners', () => ({
  findAvailableCleaner: vi.fn(),
  getAvailableWeekdaysForCity: vi.fn(),
}));
vi.mock('@/lib/payments/vipps/service', () => ({
  createVippsAgreement: vi.fn(),
  cancelVippsAgreement: vi.fn(),
}));
vi.mock('@/lib/payments/vipps/config', () => ({ isVippsTestEnvironment: vi.fn() }));
vi.mock('@/lib/payments/vipps/recurring-client', () => ({ createVippsRecurringClient: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({
  getOrderWithDetailsByIdAndCustomerId: vi.fn(),
  updateOrderStatus: vi.fn(),
}));
vi.mock('@/lib/services/order-generation', () => ({ checkAndGenerateNextOrders: vi.fn() }));
vi.mock('@/app/dashboard/subscription/actions', () => ({ cancelSubscriptionAction: vi.fn() }));

import { getCustomerByUserId } from '@/lib/database/customers';
import { validatePromoCode } from '@/lib/database/promo-codes';
import { createSubscription, getActiveSubscriptionByCustomerId } from '@/lib/database/subscriptions';
import { createPaymentAgreement, getPaymentAgreementsByCustomerId } from '@/lib/database/payment-agreements';
import { findAvailableCleaner } from '@/lib/database/cleaners';
import { createVippsAgreement } from '@/lib/payments/vipps/service';
import { createVippsRecurringClient } from '@/lib/payments/vipps/recurring-client';
import {
  createSubscriptionAction,
  validatePromoCodeAction,
  getCheckoutStatusAction,
  type CreateSubscriptionInput,
} from './actions';

const m = (fn: unknown) => fn as Mock;

const PROMO = {
  promo_code_id: 'promo-1',
  code: 'WELCOME',
  discount_type: 'percentage' as const,
  discount_value: 20,
  max_discount_ore: null,
};

const baseInput: CreateSubscriptionInput = {
  location: 'Oslo',
  needsIroning: true,
  isRecurring: true,
  frequency: 'weekly',
  firstPickupDate: '2030-01-04',
  pickupAddress: {
    street: 'Storgata 1',
    postalCode: '0150',
    city: 'Oslo',
    country: 'Norge',
    specialInstructions: 'Ring på',
  },
  specialInstructions: 'Hentes kl 09',
};

/** Wire the common happy-path return values; individual tests override as needed. */
function happyPathMocks() {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
  m(getActiveSubscriptionByCustomerId).mockResolvedValue(null);
  m(findAvailableCleaner).mockResolvedValue({ id: 'cleaner-1', display_name: 'Kari' });
  m(createVippsAgreement).mockResolvedValue({
    agreementId: 'agr-1',
    vippsConfirmationUrl: 'https://vipps.example/redirect',
  });
  m(createPaymentAgreement).mockResolvedValue({ id: 'pa-1' });
  m(createSubscription).mockResolvedValue({ id: 'sub-1' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createSubscriptionAction — auth & customer guards', () => {
  it('rejects an unauthenticated user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const result = await createSubscriptionAction(baseInput);
    expect(result.error).toBe('Not authenticated');
    expect(createPaymentAgreement).not.toHaveBeenCalled();
  });

  it('rejects when no customer record exists', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue(null);
    const result = await createSubscriptionAction(baseInput);
    expect(result.error).toBe('Customer not found');
  });
});

describe('createSubscriptionAction — promo handling', () => {
  it('aborts checkout when the promo code is invalid', async () => {
    happyPathMocks();
    m(validatePromoCode).mockResolvedValue({ valid: false, error: 'Ugyldig rabattkode' });

    const result = await createSubscriptionAction({ ...baseInput, promoCode: 'BADCODE' });

    expect(result.displayError).toBe('Ugyldig rabattkode');
    expect(result.error).toBe('Invalid promo code');
    expect(createPaymentAgreement).not.toHaveBeenCalled();
  });

  it('locks a valid promo snapshot into the payment agreement metadata', async () => {
    happyPathMocks();
    m(validatePromoCode).mockResolvedValue({ valid: true, promo: PROMO });

    await createSubscriptionAction({ ...baseInput, promoCode: 'WELCOME' });

    expect(createPaymentAgreement).toHaveBeenCalledWith(
      expect.objectContaining({ provider_metadata: expect.objectContaining({ promo: PROMO }) })
    );
  });
});

describe('createSubscriptionAction — recurring orders', () => {
  it('blocks a second active subscription', async () => {
    happyPathMocks();
    m(getActiveSubscriptionByCustomerId).mockResolvedValue({ id: 'existing-sub' });

    const result = await createSubscriptionAction(baseInput);

    expect(result.displayError).toBe('Du har allerede et aktivt abonnement');
    expect(createVippsAgreement).not.toHaveBeenCalled();
  });

  it('creates a payment agreement + subscription and returns the Vipps redirect', async () => {
    happyPathMocks();

    const result = await createSubscriptionAction(baseInput);

    expect(createVippsAgreement).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'weekly' }));
    expect(createPaymentAgreement).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: 'cust-1', provider_agreement_id: 'agr-1', provider_metadata: null })
    );
    expect(createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        customer_id: 'cust-1',
        frequency: 'weekly',
        payment_agreement_id: 'pa-1',
        order_defaults: expect.objectContaining({ first_pickup_date: '2030-01-04', default_cleaner_id: 'cleaner-1' }),
      })
    );
    expect(result).toEqual({ redirectUrl: 'https://vipps.example/redirect', agreementId: 'agr-1' });
  });

  it('surfaces a failure to create the subscription', async () => {
    happyPathMocks();
    m(createSubscription).mockResolvedValue(null);

    const result = await createSubscriptionAction(baseInput);
    expect(result.error).toBe('Failed to create subscription');
  });
});

describe('createSubscriptionAction — one-time orders', () => {
  const oneTimeInput: CreateSubscriptionInput = { ...baseInput, isRecurring: false, frequency: undefined };

  it('stores order_defaults on the agreement, uses a monthly Vipps interval, and creates no subscription', async () => {
    happyPathMocks();

    const result = await createSubscriptionAction(oneTimeInput);

    // Vipps requires an interval; one-time orders borrow 'monthly'
    expect(createVippsAgreement).toHaveBeenCalledWith(expect.objectContaining({ frequency: 'monthly' }));
    // no duplicate-subscription check for one-time orders
    expect(getActiveSubscriptionByCustomerId).not.toHaveBeenCalled();
    expect(createPaymentAgreement).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_metadata: expect.objectContaining({
          order_defaults: expect.objectContaining({ location_city: 'Oslo' }),
        }),
      })
    );
    expect(createSubscription).not.toHaveBeenCalled();
    expect(result.redirectUrl).toBe('https://vipps.example/redirect');
  });

  it('surfaces a failure to create the payment agreement', async () => {
    happyPathMocks();
    m(createPaymentAgreement).mockResolvedValue(null);

    const result = await createSubscriptionAction(oneTimeInput);
    expect(result.error).toBe('Failed to create payment agreement');
  });
});

describe('validatePromoCodeAction', () => {
  it('requires authentication', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await validatePromoCodeAction('WELCOME')).toEqual({ valid: false, error: 'Ikke autentisert' });
  });

  it('returns the validation error for an invalid code', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
    m(validatePromoCode).mockResolvedValue({ valid: false, error: 'Rabattkoden har utløpt' });

    expect(await validatePromoCodeAction('OLD')).toEqual({ valid: false, error: 'Rabattkoden har utløpt' });
  });

  it('builds a percentage discount label', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
    m(validatePromoCode).mockResolvedValue({ valid: true, promo: PROMO });

    expect(await validatePromoCodeAction('WELCOME')).toEqual({ valid: true, discountLabel: '20% rabatt' });
  });

  it('builds a fixed-amount discount label in kroner', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
    m(validatePromoCode).mockResolvedValue({
      valid: true,
      promo: { ...PROMO, discount_type: 'fixed', discount_value: 10000 }, // 10000 øre = 100 kr
    });

    expect(await validatePromoCodeAction('HUNDRED')).toEqual({ valid: true, discountLabel: '100 kr rabatt' });
  });
});

describe('getCheckoutStatusAction', () => {
  const getAgreement = vi.fn();

  /** Authenticate a customer with one pending agreement; tests set the Vipps status. */
  function withLatestAgreement(dbStatus = 'pending') {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
    m(getPaymentAgreementsByCustomerId).mockResolvedValue([
      { id: 'pa-1', provider_agreement_id: 'agr-1', status: dbStatus },
    ]);
    m(createVippsRecurringClient).mockReturnValue({ getAgreement });
  }

  it('returns "unknown" for an unauthenticated user', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getCheckoutStatusAction()).toEqual({ status: 'unknown' });
    expect(getPaymentAgreementsByCustomerId).not.toHaveBeenCalled();
  });

  it('returns "unknown" when no customer record exists', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue(null);
    expect(await getCheckoutStatusAction()).toEqual({ status: 'unknown' });
  });

  it('returns "unknown" when the customer has no agreements', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
    m(getPaymentAgreementsByCustomerId).mockResolvedValue([]);
    expect(await getCheckoutStatusAction()).toEqual({ status: 'unknown' });
  });

  it('maps Vipps ACTIVE to "active"', async () => {
    withLatestAgreement();
    getAgreement.mockResolvedValue({ status: 'ACTIVE' });
    expect(await getCheckoutStatusAction()).toEqual({ status: 'active' });
    expect(getAgreement).toHaveBeenCalledWith('agr-1');
  });

  it('maps Vipps PENDING to "pending"', async () => {
    withLatestAgreement();
    getAgreement.mockResolvedValue({ status: 'PENDING' });
    expect(await getCheckoutStatusAction()).toEqual({ status: 'pending' });
  });

  it('maps Vipps STOPPED (user aborted) to "cancelled"', async () => {
    withLatestAgreement();
    getAgreement.mockResolvedValue({ status: 'STOPPED' });
    expect(await getCheckoutStatusAction()).toEqual({ status: 'cancelled' });
  });

  it('maps Vipps EXPIRED to "cancelled"', async () => {
    withLatestAgreement();
    getAgreement.mockResolvedValue({ status: 'EXPIRED' });
    expect(await getCheckoutStatusAction()).toEqual({ status: 'cancelled' });
  });

  it('checks the most recently created agreement', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    m(getCustomerByUserId).mockResolvedValue({ id: 'cust-1' });
    // getPaymentAgreementsByCustomerId returns newest-first; the latest is [0]
    m(getPaymentAgreementsByCustomerId).mockResolvedValue([
      { id: 'pa-2', provider_agreement_id: 'agr-2', status: 'pending' },
      { id: 'pa-1', provider_agreement_id: 'agr-1', status: 'active' },
    ]);
    m(createVippsRecurringClient).mockReturnValue({ getAgreement });
    getAgreement.mockResolvedValue({ status: 'STOPPED' });

    expect(await getCheckoutStatusAction()).toEqual({ status: 'cancelled' });
    expect(getAgreement).toHaveBeenCalledWith('agr-2');
  });

  it('falls back to the DB status when Vipps is unreachable', async () => {
    withLatestAgreement('active');
    getAgreement.mockRejectedValue(new Error('network down'));
    expect(await getCheckoutStatusAction()).toEqual({ status: 'active' });
  });

  it('maps a stopped DB status to "cancelled" on the Vipps-error fallback', async () => {
    withLatestAgreement('stopped');
    getAgreement.mockRejectedValue(new Error('network down'));
    expect(await getCheckoutStatusAction()).toEqual({ status: 'cancelled' });
  });
});
