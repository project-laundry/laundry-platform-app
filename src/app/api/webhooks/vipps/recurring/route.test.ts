import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { NextRequest } from 'next/server';

// --- Mock the auth boundary (no real signatures needed; verification is unit-tested elsewhere) ---
vi.mock('@/lib/payments/vipps/webhook-auth', () => ({
  validateVippsWebhook: vi.fn(() => true),
  getVippsWebhookSecret: vi.fn(() => 'test-secret'),
}));

// --- Mock every side-effecting dependency ---
vi.mock('@/lib/database/payment-agreements', () => ({
  getPaymentAgreementByProviderId: vi.fn(),
  activatePaymentAgreement: vi.fn(),
  stopPaymentAgreement: vi.fn(),
  expirePaymentAgreement: vi.fn(),
  getSubscriptionByPaymentAgreementId: vi.fn(),
}));
vi.mock('@/lib/database/subscriptions', () => ({
  activateSubscriptionOnAgreementActivation: vi.fn(),
  cancelSubscription: vi.fn(),
  expireSubscription: vi.fn(),
}));
vi.mock('@/lib/database/payments', () => ({
  getPaymentByReference: vi.fn(),
  capturePaymentWithMetadata: vi.fn(),
  failPaymentWithMetadata: vi.fn(),
  updatePaymentWithMetadata: vi.fn(),
}));
vi.mock('@/lib/payments/vipps/service', () => ({ cancelVippsAgreement: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({ createOrder: vi.fn() }));
vi.mock('@/lib/database/promo-codes', () => ({ recordPromoRedemption: vi.fn() }));

import { validateVippsWebhook } from '@/lib/payments/vipps/webhook-auth';
import {
  getPaymentAgreementByProviderId,
  activatePaymentAgreement,
  stopPaymentAgreement,
  expirePaymentAgreement,
  getSubscriptionByPaymentAgreementId,
} from '@/lib/database/payment-agreements';
import {
  activateSubscriptionOnAgreementActivation,
  cancelSubscription,
  expireSubscription,
} from '@/lib/database/subscriptions';
import {
  getPaymentByReference,
  capturePaymentWithMetadata,
  failPaymentWithMetadata,
  updatePaymentWithMetadata,
} from '@/lib/database/payments';
import { cancelVippsAgreement } from '@/lib/payments/vipps/service';
import { createOrder } from '@/lib/database/orders';
import { recordPromoRedemption } from '@/lib/database/promo-codes';
import { POST } from './route';

// Cast helpers
const m = (fn: unknown) => fn as Mock;

const ORDER_DEFAULTS = {
  initial_address: {
    street: 'Storgata 1',
    postal_code: '0150',
    city: 'Oslo',
    country: 'Norge',
    special_instructions: 'Ring på',
  },
  special_instructions: 'Hentes kl 09',
  location_city: 'Oslo',
  default_needs_ironing: true,
  default_cleaner_id: 'cleaner-1',
  first_pickup_date: '2030-01-04', // future, so the chosen date is used directly
  customer_estimate: {
    bags: 2,
    bedding_sets: 1,
    iron_everyday_items: 0,
    iron_formal_items: 3,
    iron_bedding: false,
    estimated_total_ore: 73530,
  },
};

const PROMO = {
  promo_code_id: 'promo-1',
  code: 'WELCOME',
  discount_type: 'percentage' as const,
  discount_value: 20,
  max_discount_ore: null,
};

/** POST a webhook payload. The request only needs `.text()`; auth is mocked. */
function post(payload: Record<string, unknown>) {
  const request = {
    method: 'POST',
    url: 'https://hooks.example.com/api/webhooks/vipps/recurring',
    headers: { get: () => null },
    text: async () => JSON.stringify(payload),
  } as unknown as NextRequest;
  return POST(request);
}

const chargePayload = (overrides: Record<string, unknown> = {}) => ({
  agreementId: 'agr-1',
  chargeId: 'chr-1',
  amount: 50000,
  chargeType: 'RECURRING',
  currency: 'NOK',
  occurred: '2026-06-07T10:00:00Z',
  msn: '123456',
  ...overrides,
});

const agreementPayload = (overrides: Record<string, unknown> = {}) => ({
  agreementId: 'agr-1',
  agreementUUID: 'uuid-1',
  occurred: '2026-06-07T10:00:00Z',
  msn: '123456',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  m(validateVippsWebhook).mockReturnValue(true);
});

describe('POST /api/webhooks/vipps/recurring — authentication', () => {
  it('returns 401 when the signature is invalid', async () => {
    m(validateVippsWebhook).mockReturnValue(false);
    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));
    expect(res.status).toBe(401);
    expect(getPaymentAgreementByProviderId).not.toHaveBeenCalled();
  });

  it('acknowledges (200) but does nothing when the agreement is unknown', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue(null);
    const res = await post(chargePayload({ eventType: 'recurring.charge-captured.v1' }));
    expect(res.status).toBe(200);
    expect(getPaymentByReference).not.toHaveBeenCalled();
  });
});

describe('charge events', () => {
  it('marks payment captured and stops the agreement for a one-time order', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active', customer_id: 'cust-1' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue(null); // one-time

    await post(chargePayload({ eventType: 'recurring.charge-captured.v1', amountCaptured: 50000 }));

    expect(capturePaymentWithMetadata).toHaveBeenCalledWith('pay-1', expect.objectContaining({ vipps_status: 'CHARGED' }));
    expect(cancelVippsAgreement).toHaveBeenCalledWith('agr-1');
    expect(stopPaymentAgreement).toHaveBeenCalledWith('pa-1');
  });

  it('does NOT stop the agreement for a recurring (subscription) order', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active', customer_id: 'cust-1' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ id: 'sub-1' }); // recurring

    await post(chargePayload({ eventType: 'recurring.charge-captured.v1' }));

    expect(capturePaymentWithMetadata).toHaveBeenCalledOnce();
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('marks payment failed on charge-failed', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });

    await post(chargePayload({ eventType: 'recurring.charge-failed.v1', failureReason: 'Insufficient funds', failureCode: 42 }));

    expect(failPaymentWithMetadata).toHaveBeenCalledWith('pay-1', 'Insufficient funds', expect.objectContaining({ vipps_status: 'FAILED' }));
  });

  it('records a cancellation on charge-canceled', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });

    await post(chargePayload({ eventType: 'recurring.charge-canceled.v1', amountCanceled: 50000 }));

    expect(updatePaymentWithMetadata).toHaveBeenCalledWith('pay-1', expect.objectContaining({ vipps_status: 'CANCELLED' }));
  });

  it('records a refund on charge-refunded', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });

    await post(chargePayload({ eventType: 'recurring.charge-refunded.v1', amountRefunded: 50000 }));

    expect(updatePaymentWithMetadata).toHaveBeenCalledWith('pay-1', expect.objectContaining({ vipps_status: 'REFUNDED' }));
  });
});

describe('agreement-activated', () => {
  it('activates the subscription, generates the first order, and records the promo redemption', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({
      id: 'pa-1',
      customer_id: 'cust-1',
      status: 'pending',
      provider_metadata: { promo: PROMO },
    });
    m(activatePaymentAgreement).mockResolvedValue({ id: 'pa-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ id: 'sub-1' });
    m(activateSubscriptionOnAgreementActivation).mockResolvedValue({
      id: 'sub-1',
      customer_id: 'cust-1',
      order_defaults: ORDER_DEFAULTS,
    });
    m(createOrder).mockResolvedValue({ id: 'ord-1', order_number: 'ABC123', scheduled_date: '2030-01-04' });

    await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(activatePaymentAgreement).toHaveBeenCalledWith('pa-1');
    expect(activateSubscriptionOnAgreementActivation).toHaveBeenCalledWith('sub-1');
    expect(createOrder).toHaveBeenCalledOnce();
    const orderArg = m(createOrder).mock.calls[0][0];
    expect(orderArg).toMatchObject({
      subscription_id: 'sub-1',
      customer_id: 'cust-1',
      total_cost_ore: null,
      scheduled_date: '2030-01-04',
      customer_estimate: ORDER_DEFAULTS.customer_estimate,
    });
    expect(recordPromoRedemption).toHaveBeenCalledWith(expect.objectContaining({ promoCodeId: 'promo-1', orderId: 'ord-1' }));
  });

  it('creates a one-time order from agreement metadata and records no promo when none is present', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({
      id: 'pa-1',
      customer_id: 'cust-1',
      status: 'pending',
      provider_metadata: { order_defaults: ORDER_DEFAULTS }, // no promo
    });
    m(activatePaymentAgreement).mockResolvedValue({ id: 'pa-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue(null); // one-time
    m(createOrder).mockResolvedValue({ id: 'ord-2', order_number: 'XYZ789', scheduled_date: '2030-01-04' });

    await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(activateSubscriptionOnAgreementActivation).not.toHaveBeenCalled();
    expect(createOrder).toHaveBeenCalledOnce();
    const orderArg = m(createOrder).mock.calls[0][0];
    expect(orderArg).toMatchObject({ subscription_id: null, payment_agreement_id: 'pa-1' });
    expect(recordPromoRedemption).not.toHaveBeenCalled();
  });
});

describe('agreement lifecycle events', () => {
  it('stops the agreement and cancels the subscription on rejection', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ id: 'sub-1', status: 'active' });

    await post(agreementPayload({ eventType: 'recurring.agreement-rejected.v1' }));

    expect(stopPaymentAgreement).toHaveBeenCalledWith('pa-1');
    expect(cancelSubscription).toHaveBeenCalledWith('sub-1', '2026-06-07T10:00:00Z', 'Agreement rejected by user');
  });

  it('is a no-op when WE stopped the agreement (actor=MERCHANT)', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1' });

    await post(agreementPayload({ eventType: 'recurring.agreement-stopped.v1', actor: 'MERCHANT' }));

    expect(stopPaymentAgreement).not.toHaveBeenCalled();
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it('stops the agreement and cancels an active subscription when the user stops it', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ id: 'sub-1', status: 'active' });

    await post(agreementPayload({ eventType: 'recurring.agreement-stopped.v1', actor: 'USER' }));

    expect(stopPaymentAgreement).toHaveBeenCalledWith('pa-1');
    expect(cancelSubscription).toHaveBeenCalledOnce();
  });

  it('expires both the agreement and the subscription on expiry', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ id: 'sub-1' });

    await post(agreementPayload({ eventType: 'recurring.agreement-expired.v1' }));

    expect(expirePaymentAgreement).toHaveBeenCalledWith('pa-1');
    expect(expireSubscription).toHaveBeenCalledWith('sub-1');
  });
});
