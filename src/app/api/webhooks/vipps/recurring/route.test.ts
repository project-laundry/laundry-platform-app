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
  cancelPaymentWithMetadata: vi.fn(),
  refundPaymentWithMetadata: vi.fn(),
}));
vi.mock('@/lib/payments/vipps/service', () => ({
  cancelVippsAgreement: vi.fn(),
  stopVippsAgreementForCancelledSubscription: vi.fn(),
}));
vi.mock('@/lib/database/orders', () => ({ createOrder: vi.fn(), getOrderByPaymentAgreementId: vi.fn() }));
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
  cancelPaymentWithMetadata,
  refundPaymentWithMetadata,
} from '@/lib/database/payments';
import { cancelVippsAgreement, stopVippsAgreementForCancelledSubscription } from '@/lib/payments/vipps/service';
import { createOrder, getOrderByPaymentAgreementId } from '@/lib/database/orders';
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
  // Every DB write succeeds by default: the handlers now throw (and the route
  // answers 500) when a write returns null. Failure tests override per case.
  // vi.clearAllMocks only clears calls, so these must be re-set here every time.
  m(activatePaymentAgreement).mockResolvedValue({ id: 'pa-1', status: 'active' });
  m(stopPaymentAgreement).mockResolvedValue({ id: 'pa-1', status: 'stopped' });
  m(expirePaymentAgreement).mockResolvedValue({ id: 'pa-1', status: 'expired' });
  m(activateSubscriptionOnAgreementActivation).mockResolvedValue({ id: 'sub-1', status: 'active' });
  m(cancelSubscription).mockResolvedValue({ id: 'sub-1', status: 'cancelled' });
  m(expireSubscription).mockResolvedValue({ id: 'sub-1', status: 'expired' });
  m(capturePaymentWithMetadata).mockResolvedValue({ id: 'pay-1', status: 'captured' });
  m(failPaymentWithMetadata).mockResolvedValue({ id: 'pay-1', status: 'failed' });
  m(getOrderByPaymentAgreementId).mockResolvedValue(null);
});

describe('POST /api/webhooks/vipps/recurring — authentication & response codes', () => {
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

  it('acknowledges (200) a body that is not JSON instead of letting Vipps retry it', async () => {
    const request = {
      method: 'POST',
      url: 'https://hooks.example.com/api/webhooks/vipps/recurring',
      headers: { get: () => null },
      text: async () => 'not json',
    } as unknown as NextRequest;
    const res = await POST(request);
    expect(res.status).toBe(200);
    expect(getPaymentAgreementByProviderId).not.toHaveBeenCalled();
  });

  it('returns 500 when a handler fails on a DB write, so Vipps retries', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', customer_id: 'cust-1', status: 'pending', provider_metadata: null });
    m(activatePaymentAgreement).mockResolvedValue(null);
    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));
    expect(res.status).toBe(500);
    expect(createOrder).not.toHaveBeenCalled();
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
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ id: 'sub-1' }); // recurring, still active

    await post(chargePayload({ eventType: 'recurring.charge-captured.v1' }));

    expect(capturePaymentWithMetadata).toHaveBeenCalledOnce();
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
    expect(stopVippsAgreementForCancelledSubscription).not.toHaveBeenCalled();
  });

  it('triggers the deferred agreement stop after capture when the linked subscription is cancelled', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active', customer_id: 'cust-1' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ id: 'sub-1', status: 'cancelled' });

    await post(chargePayload({ eventType: 'recurring.charge-captured.v1' }));

    expect(stopVippsAgreementForCancelledSubscription).toHaveBeenCalledWith('sub-1');
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
    expect(stopPaymentAgreement).not.toHaveBeenCalled();
  });

  it('marks payment failed on charge-failed', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });

    await post(chargePayload({ eventType: 'recurring.charge-failed.v1', failureReason: 'Insufficient funds', failureCode: 42 }));

    expect(failPaymentWithMetadata).toHaveBeenCalledWith('pay-1', 'Insufficient funds', expect.objectContaining({ vipps_status: 'FAILED' }));
  });

  it('acknowledges (200) a captured charge with no payment row — a retry cannot fix that', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue(null);

    const res = await post(chargePayload({ eventType: 'recurring.charge-captured.v1' }));

    expect(res.status).toBe(200);
    expect(capturePaymentWithMetadata).not.toHaveBeenCalled();
  });

  it('returns 500 when the captured write fails', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });
    m(capturePaymentWithMetadata).mockResolvedValue(null);

    const res = await post(chargePayload({ eventType: 'recurring.charge-captured.v1' }));

    expect(res.status).toBe(500);
    expect(cancelVippsAgreement).not.toHaveBeenCalled();
  });

  it('returns 500 when the failed write fails', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1' });
    m(failPaymentWithMetadata).mockResolvedValue(null);

    const res = await post(chargePayload({ eventType: 'recurring.charge-failed.v1', failureReason: 'Insufficient funds', failureCode: 42 }));

    expect(res.status).toBe(500);
  });

  it('marks the payment cancelled on charge-canceled', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1', amount_ore: 50000 });

    await post(chargePayload({ eventType: 'recurring.charge-canceled.v1', amountCanceled: 50000 }));

    expect(cancelPaymentWithMetadata).toHaveBeenCalledWith(
      'pay-1',
      expect.objectContaining({ vipps_status: 'CANCELLED', vipps_amount_canceled: 50000 })
    );
  });

  it('marks the payment refunded on a full charge-refunded', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1', amount_ore: 50000 });

    await post(chargePayload({ eventType: 'recurring.charge-refunded.v1', amountRefunded: 50000 }));

    expect(refundPaymentWithMetadata).toHaveBeenCalledWith(
      'pay-1',
      50000,
      true,
      expect.objectContaining({ vipps_status: 'REFUNDED' })
    );
  });

  it('records a partial refund without flipping the status', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1', amount_ore: 50000 });

    await post(chargePayload({ eventType: 'recurring.charge-refunded.v1', amountRefunded: 20000 }));

    expect(refundPaymentWithMetadata).toHaveBeenCalledWith('pay-1', 20000, false, expect.anything());
  });

  it('falls back to the charge amount when amountRefunded is missing', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1', status: 'active' });
    m(getPaymentByReference).mockResolvedValue({ id: 'pay-1', amount_ore: 50000 });

    await post(chargePayload({ eventType: 'recurring.charge-refunded.v1' }));

    expect(refundPaymentWithMetadata).toHaveBeenCalledWith('pay-1', 50000, true, expect.anything());
  });
});

describe('agreement-activated', () => {
  const PENDING_AGREEMENT = {
    id: 'pa-1',
    customer_id: 'cust-1',
    status: 'pending',
    provider_metadata: { promo: PROMO },
  };
  const PENDING_SUBSCRIPTION = {
    id: 'sub-1',
    customer_id: 'cust-1',
    frequency: 'weekly',
    status: 'pending_payment',
    order_defaults: ORDER_DEFAULTS,
  };

  it('activates the subscription, generates the first order, and records the promo redemption', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue(PENDING_AGREEMENT);
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue(PENDING_SUBSCRIPTION);
    m(createOrder).mockResolvedValue({ id: 'ord-1', order_number: 'ABC123', scheduled_date: '2030-01-04' });

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(200);
    expect(activatePaymentAgreement).toHaveBeenCalledWith('pa-1');
    expect(activateSubscriptionOnAgreementActivation).toHaveBeenCalledWith('sub-1');
    expect(getOrderByPaymentAgreementId).toHaveBeenCalledWith('pa-1');
    expect(createOrder).toHaveBeenCalledOnce();
    const orderArg = m(createOrder).mock.calls[0][0];
    expect(orderArg).toMatchObject({
      subscription_id: 'sub-1',
      payment_agreement_id: 'pa-1',
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
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue(null); // one-time
    m(createOrder).mockResolvedValue({ id: 'ord-2', order_number: 'XYZ789', scheduled_date: '2030-01-04' });

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(200);
    expect(activateSubscriptionOnAgreementActivation).not.toHaveBeenCalled();
    expect(createOrder).toHaveBeenCalledOnce();
    const orderArg = m(createOrder).mock.calls[0][0];
    expect(orderArg).toMatchObject({ subscription_id: null, payment_agreement_id: 'pa-1' });
    expect(recordPromoRedemption).not.toHaveBeenCalled();
  });

  it('is a no-op on a duplicate delivery: agreement and subscription already active, order already exists', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ ...PENDING_AGREEMENT, status: 'active' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ ...PENDING_SUBSCRIPTION, status: 'active' });
    m(getOrderByPaymentAgreementId).mockResolvedValue({ id: 'ord-1', order_number: 'ABC123' });

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(200);
    expect(activatePaymentAgreement).not.toHaveBeenCalled();
    expect(activateSubscriptionOnAgreementActivation).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
    // The (idempotent) redemption is still recorded against the existing order.
    expect(recordPromoRedemption).toHaveBeenCalledWith(expect.objectContaining({ promoCodeId: 'promo-1', orderId: 'ord-1' }));
  });

  it('creates the missing first order on a retry after an earlier attempt died post-activation', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ ...PENDING_AGREEMENT, status: 'active' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ ...PENDING_SUBSCRIPTION, status: 'active' });
    m(getOrderByPaymentAgreementId).mockResolvedValue(null);
    m(createOrder).mockResolvedValue({ id: 'ord-1', order_number: 'ABC123', scheduled_date: '2030-01-04' });

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(200);
    expect(activatePaymentAgreement).not.toHaveBeenCalled();
    expect(activateSubscriptionOnAgreementActivation).not.toHaveBeenCalled();
    expect(createOrder).toHaveBeenCalledOnce();
  });

  it('returns 500 without creating an order when the guarded activation matches no row (lost race)', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue(PENDING_AGREEMENT);
    m(activatePaymentAgreement).mockResolvedValue(null);

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(500);
    expect(getSubscriptionByPaymentAgreementId).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('returns 500 without creating an order when the guarded subscription activation matches no row', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue(PENDING_AGREEMENT);
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue(PENDING_SUBSCRIPTION);
    m(activateSubscriptionOnAgreementActivation).mockResolvedValue(null);

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(500);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('returns 500 when the first order insert fails, so Vipps retries', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue(PENDING_AGREEMENT);
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue(PENDING_SUBSCRIPTION);
    m(createOrder).mockResolvedValue(null);

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(500);
    expect(recordPromoRedemption).not.toHaveBeenCalled();
  });

  it('returns 500 when the order existence check throws (never inserts blind)', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue(PENDING_AGREEMENT);
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue(PENDING_SUBSCRIPTION);
    m(getOrderByPaymentAgreementId).mockRejectedValue(new Error('db down'));

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(500);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('ignores (200) an activation for an agreement that was stopped while pending', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ ...PENDING_AGREEMENT, status: 'stopped' });

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(200);
    expect(activatePaymentAgreement).not.toHaveBeenCalled();
    expect(getSubscriptionByPaymentAgreementId).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('does not generate an order for a subscription that is no longer pending_payment or active', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue(PENDING_AGREEMENT);
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ ...PENDING_SUBSCRIPTION, status: 'cancelled' });

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-activated.v1' }));

    expect(res.status).toBe(200);
    expect(activateSubscriptionOnAgreementActivation).not.toHaveBeenCalled();
    expect(createOrder).not.toHaveBeenCalled();
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

  it('returns 500 when stopping the agreement fails on rejection, so Vipps retries', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1' });
    m(stopPaymentAgreement).mockResolvedValue(null);

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-rejected.v1' }));

    expect(res.status).toBe(500);
    expect(cancelSubscription).not.toHaveBeenCalled();
  });

  it('returns 500 when cancelling the subscription fails after a user stop', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1' });
    m(getSubscriptionByPaymentAgreementId).mockResolvedValue({ id: 'sub-1', status: 'active' });
    m(cancelSubscription).mockResolvedValue(null);

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-stopped.v1', actor: 'USER' }));

    expect(res.status).toBe(500);
  });

  it('returns 500 when expiring the agreement fails', async () => {
    m(getPaymentAgreementByProviderId).mockResolvedValue({ id: 'pa-1' });
    m(expirePaymentAgreement).mockResolvedValue(null);

    const res = await post(agreementPayload({ eventType: 'recurring.agreement-expired.v1' }));

    expect(res.status).toBe(500);
    expect(expireSubscription).not.toHaveBeenCalled();
  });
});
