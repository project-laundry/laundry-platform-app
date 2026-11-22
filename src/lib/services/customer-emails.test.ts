import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ getOrderForCustomerEmail: vi.fn(), getActiveOrdersBySubscriptionId: vi.fn() }));
vi.mock('@/lib/database/evaluations', () => ({ countCompletedOrdersByCustomerId: vi.fn() }));
vi.mock('@/lib/database/payments', () => ({ getPaymentById: vi.fn(), getPaymentsByOrderId: vi.fn() }));
vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
  CUSTOMER_EMAIL_FROM: 'NooraCare <no-reply@nooracare.no>',
}));
vi.mock('@/lib/email/customer-emails', () => ({
  buildOrderConfirmationEmail: vi.fn(() => ({ subject: 'Bekreftet', text: 'tekst', html: '<p>html</p>' })),
  buildPriceReceiptEmail: vi.fn(() => ({ subject: 'Pris', text: 'tekst', html: '<p>html</p>' })),
  buildOrderDeliveredEmail: vi.fn(() => ({ subject: 'Levert', text: 'tekst', html: '<p>html</p>' })),
  buildOrderPickedUpEmail: vi.fn(() => ({ subject: 'Hentet', text: 'tekst', html: '<p>html</p>' })),
  buildPaymentFailedEmail: vi.fn(() => ({ subject: 'Feilet', text: 'tekst', html: '<p>html</p>' })),
  buildPickupReminderEmail: vi.fn(() => ({ subject: 'Påminnelse', text: 'tekst', html: '<p>html</p>' })),
  buildOrderCancelledEmail: vi.fn(() => ({ subject: 'Kansellert', text: 'tekst', html: '<p>html</p>' })),
  buildPickupRescheduledEmail: vi.fn(() => ({ subject: 'Ny dato', text: 'tekst', html: '<p>html</p>' })),
  buildCleanerConfirmedEmail: vi.fn(() => ({ subject: 'Renser bekreftet', text: 'tekst', html: '<p>html</p>' })),
  buildEvaluationRequestEmail: vi.fn(() => ({ subject: 'Evaluering', text: 'tekst', html: '<p>html</p>' })),
}));

import { getActiveOrdersBySubscriptionId, getOrderForCustomerEmail } from '@/lib/database/orders';
import { countCompletedOrdersByCustomerId } from '@/lib/database/evaluations';
import { getPaymentById, getPaymentsByOrderId } from '@/lib/database/payments';
import { sendEmail } from '@/lib/email/send';
import { buildEvaluationRequestEmail, buildCleanerConfirmedEmail, buildOrderCancelledEmail, buildPickupRescheduledEmail, buildOrderConfirmationEmail, buildOrderDeliveredEmail, buildOrderPickedUpEmail, buildPaymentFailedEmail, buildPickupReminderEmail, buildPriceReceiptEmail } from '@/lib/email/customer-emails';
import { sendEvaluationRequestEmail, sendCleanerConfirmedEmail, sendOrderCancelledEmail, sendPickupRescheduledEmail, sendOrderConfirmationEmail, sendOrderDeliveredEmail, sendOrderPickedUpEmail, sendPaymentFailedEmail, sendPickupReminderEmail, sendPriceReceiptEmail } from './customer-emails';
import type { OrderForCustomerEmail } from '@/lib/database/orders';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

const ORDER = { id: 'ord-1', customer_id: 'cust-1', customer: { user: { email: 'kari@example.com', full_name: 'Kari' } } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://nooracare.no');
  m(getOrderForCustomerEmail).mockResolvedValue(ORDER);
  m(sendEmail).mockResolvedValue({ ok: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sendOrderConfirmationEmail', () => {
  it('builds and sends the confirmation to the customer with reply-to and an idempotency key', async () => {
    await sendOrderConfirmationEmail('ord-1');

    expect(getOrderForCustomerEmail).toHaveBeenCalledWith('ord-1');
    expect(buildOrderConfirmationEmail).toHaveBeenCalledWith(ORDER, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <no-reply@nooracare.no>',
      to: ['kari@example.com'],
      replyTo: ['post@nooracare.no'],
      subject: 'Bekreftet',
      text: 'tekst',
      html: '<p>html</p>',
      idempotencyKey: 'order-confirmation/ord-1',
    });
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(null);

    await sendOrderConfirmationEmail('ord-x');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when NEXT_PUBLIC_APP_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    await sendOrderConfirmationEmail('ord-1');

    expect(getOrderForCustomerEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the database helper rejects', async () => {
    m(getOrderForCustomerEmail).mockRejectedValue(new Error('db down'));

    await expect(sendOrderConfirmationEmail('ord-1')).resolves.toBeUndefined();
  });

  it('never throws when the send is rejected', async () => {
    m(sendEmail).mockResolvedValue({ ok: false, error: 'Resend responded 500' });

    await expect(sendOrderConfirmationEmail('ord-1')).resolves.toBeUndefined();
  });
});

describe('sendPriceReceiptEmail', () => {
  it('loads the payment and sends the receipt keyed on the payment id', async () => {
    const payment = { id: 'pay-1', provider_reference: 'chr-1' };
    m(getPaymentById).mockResolvedValue(payment);

    await sendPriceReceiptEmail('ord-1', 'pay-1');

    expect(getPaymentById).toHaveBeenCalledWith('pay-1');
    expect(buildPriceReceiptEmail).toHaveBeenCalledWith(ORDER, payment, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Pris', idempotencyKey: 'price-receipt/pay-1' }));
  });

  it('sends a 0-total receipt without a payment, keyed on the order', async () => {
    await sendPriceReceiptEmail('ord-1', null);

    expect(getPaymentById).not.toHaveBeenCalled();
    expect(buildPriceReceiptEmail).toHaveBeenCalledWith(ORDER, null, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ idempotencyKey: 'price-receipt/order-ord-1' }));
  });

  it('still sends when the payment row cannot be read', async () => {
    m(getPaymentById).mockResolvedValue(null);

    await sendPriceReceiptEmail('ord-1', 'pay-1');

    expect(buildPriceReceiptEmail).toHaveBeenCalledWith(ORDER, null, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('never throws when the send rejects', async () => {
    m(sendEmail).mockRejectedValue(new Error('boom'));

    await expect(sendPriceReceiptEmail('ord-1', null)).resolves.toBeUndefined();
  });
});

describe('sendPaymentFailedEmail', () => {
  const PAYMENT = { id: 'pay-1', order_id: 'ord-1', amount_ore: 46424, provider_reference: 'chr-1' };

  it('loads the payment and its order and sends keyed on the payment id', async () => {
    m(getPaymentById).mockResolvedValue(PAYMENT);

    await sendPaymentFailedEmail('pay-1');

    expect(getOrderForCustomerEmail).toHaveBeenCalledWith('ord-1');
    expect(buildPaymentFailedEmail).toHaveBeenCalledWith(ORDER, PAYMENT, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: 'Feilet', idempotencyKey: 'payment-failed/pay-1' }));
  });

  it('sends nothing for a payment without an order', async () => {
    m(getPaymentById).mockResolvedValue({ ...PAYMENT, order_id: null });

    await sendPaymentFailedEmail('pay-1');

    expect(getOrderForCustomerEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing for an unknown payment', async () => {
    m(getPaymentById).mockResolvedValue(null);

    await sendPaymentFailedEmail('pay-x');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the payment lookup rejects', async () => {
    m(getPaymentById).mockRejectedValue(new Error('db down'));

    await expect(sendPaymentFailedEmail('pay-1')).resolves.toBeUndefined();
  });
});

describe('sendOrderDeliveredEmail', () => {
  const PAYMENTS = [{ id: 'pay-1', status: 'pending', amount_ore: 46424, provider_reference: 'chr-1' }];

  beforeEach(() => {
    m(getPaymentsByOrderId).mockResolvedValue(PAYMENTS);
  });

  it('loads the order and its payments and sends keyed on the order id', async () => {
    await sendOrderDeliveredEmail('ord-1');

    expect(getOrderForCustomerEmail).toHaveBeenCalledWith('ord-1');
    expect(getPaymentsByOrderId).toHaveBeenCalledWith('ord-1');
    expect(buildOrderDeliveredEmail).toHaveBeenCalledWith(ORDER, PAYMENTS, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <no-reply@nooracare.no>',
      to: ['kari@example.com'],
      replyTo: ['post@nooracare.no'],
      subject: 'Levert',
      text: 'tekst',
      html: '<p>html</p>',
      idempotencyKey: 'order-delivered/ord-1',
    });
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(null);

    await sendOrderDeliveredEmail('ord-x');

    expect(getPaymentsByOrderId).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when NEXT_PUBLIC_APP_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    await sendOrderDeliveredEmail('ord-1');

    expect(getOrderForCustomerEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the payments lookup rejects', async () => {
    m(getPaymentsByOrderId).mockRejectedValue(new Error('db down'));

    await expect(sendOrderDeliveredEmail('ord-1')).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the send is rejected', async () => {
    m(sendEmail).mockResolvedValue({ ok: false, error: 'Resend responded 500' });

    await expect(sendOrderDeliveredEmail('ord-1')).resolves.toBeUndefined();
  });
});

describe('sendEvaluationRequestEmail', () => {
  beforeEach(() => {
    m(countCompletedOrdersByCustomerId).mockResolvedValue(1);
  });

  it('sends for the first completed order, keyed on the order id', async () => {
    await sendEvaluationRequestEmail('ord-1');

    expect(countCompletedOrdersByCustomerId).toHaveBeenCalledWith('cust-1');
    expect(buildEvaluationRequestEmail).toHaveBeenCalledWith(ORDER, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['kari@example.com'],
        subject: 'Evaluering',
        idempotencyKey: 'evaluation-request/ord-1',
      })
    );
  });

  it('sends nothing for a later order', async () => {
    m(countCompletedOrdersByCustomerId).mockResolvedValue(2);

    await sendEvaluationRequestEmail('ord-1');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the count failed', async () => {
    m(countCompletedOrdersByCustomerId).mockResolvedValue(null);

    await sendEvaluationRequestEmail('ord-1');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing and does not count when the order is not found', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(null);

    await sendEvaluationRequestEmail('ord-x');

    expect(countCompletedOrdersByCustomerId).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the count rejects', async () => {
    m(countCompletedOrdersByCustomerId).mockRejectedValue(new Error('db down'));

    await expect(sendEvaluationRequestEmail('ord-1')).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('sendOrderPickedUpEmail', () => {
  it('builds and sends the picked-up e-mail once per order, passing the time flag through', async () => {
    await sendOrderPickedUpEmail('ord-1', { showPickupTime: true });

    expect(getOrderForCustomerEmail).toHaveBeenCalledWith('ord-1');
    expect(buildOrderPickedUpEmail).toHaveBeenCalledWith(
      ORDER,
      { showPickupTime: true },
      { appUrl: 'https://nooracare.no' }
    );
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <no-reply@nooracare.no>',
      to: ['kari@example.com'],
      replyTo: ['post@nooracare.no'],
      subject: 'Hentet',
      text: 'tekst',
      html: '<p>html</p>',
      idempotencyKey: 'order-picked-up/ord-1',
    });
  });

  it('uses the same idempotency key for the admin fallback', async () => {
    await sendOrderPickedUpEmail('ord-1', { showPickupTime: false });

    expect(buildOrderPickedUpEmail).toHaveBeenCalledWith(
      ORDER,
      { showPickupTime: false },
      { appUrl: 'https://nooracare.no' }
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'order-picked-up/ord-1' })
    );
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(null);

    await sendOrderPickedUpEmail('ord-x', { showPickupTime: true });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the database helper rejects or the send is rejected', async () => {
    m(getOrderForCustomerEmail).mockRejectedValueOnce(new Error('db down'));
    await expect(sendOrderPickedUpEmail('ord-1', { showPickupTime: true })).resolves.toBeUndefined();

    m(sendEmail).mockResolvedValue({ ok: false, error: 'Resend responded 500' });
    await expect(sendOrderPickedUpEmail('ord-1', { showPickupTime: true })).resolves.toBeUndefined();
  });
});

const PICKUP_REMINDER_ORDER = {
  id: 'ord-9',
  scheduled_date: '2026-11-24',
  customer: { user: { email: 'kari@example.com', full_name: 'Kari' } },
  cleaner: { display_name: 'Anna' },
} as unknown as OrderForCustomerEmail;

describe('sendPickupReminderEmail', () => {
  it('sends the reminder with a key that contains the pickup date and reports true', async () => {
    await expect(sendPickupReminderEmail(PICKUP_REMINDER_ORDER)).resolves.toBe(true);

    expect(buildPickupReminderEmail).toHaveBeenCalledWith(PICKUP_REMINDER_ORDER, { appUrl: 'https://nooracare.no' });
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <no-reply@nooracare.no>',
      to: ['kari@example.com'],
      replyTo: ['post@nooracare.no'],
      subject: 'Påminnelse',
      text: 'tekst',
      html: '<p>html</p>',
      idempotencyKey: 'pickup-reminder/ord-9/2026-11-24',
    });
  });

  it('reports false when Resend rejects the send', async () => {
    m(sendEmail).mockResolvedValue({ ok: false, error: 'Resend responded 429' });

    await expect(sendPickupReminderEmail(PICKUP_REMINDER_ORDER)).resolves.toBe(false);
  });

  it('reports false and sends nothing when NEXT_PUBLIC_APP_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');

    await expect(sendPickupReminderEmail(PICKUP_REMINDER_ORDER)).resolves.toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws: a row without a customer reports false', async () => {
    const broken = { ...PICKUP_REMINDER_ORDER, customer: null } as unknown as OrderForCustomerEmail;

    await expect(sendPickupReminderEmail(broken)).resolves.toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('sendOrderCancelledEmail', () => {
  const CANCELLED = { ...ORDER, status: 'cancelled', subscription_id: null, subscription: null };

  it('sends the cancellation keyed on the order id, without a subscription lookup for a one-time order', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(CANCELLED);

    await sendOrderCancelledEmail('ord-1');

    expect(getActiveOrdersBySubscriptionId).not.toHaveBeenCalled();
    expect(buildOrderCancelledEmail).toHaveBeenCalledWith(
      CANCELLED,
      { nextPickupDate: null },
      { appUrl: 'https://nooracare.no' }
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['kari@example.com'],
        subject: 'Kansellert',
        idempotencyKey: 'order-cancelled/ord-1',
      })
    );
  });

  it('passes the next not-yet-picked-up pickup of an active subscription', async () => {
    const order = {
      ...CANCELLED,
      subscription_id: 'sub-1',
      subscription: { frequency: 'weekly', status: 'active' },
    };
    m(getOrderForCustomerEmail).mockResolvedValue(order);
    m(getActiveOrdersBySubscriptionId).mockResolvedValue([
      { id: 'ord-0', status: 'in_cleaning', scheduled_date: '2026-10-17' },
      { id: 'ord-2', status: 'pickup_scheduled', scheduled_date: '2026-10-31' },
    ]);

    await sendOrderCancelledEmail('ord-1');

    expect(getActiveOrdersBySubscriptionId).toHaveBeenCalledWith('sub-1');
    expect(buildOrderCancelledEmail).toHaveBeenCalledWith(
      order,
      { nextPickupDate: '2026-10-31' },
      { appUrl: 'https://nooracare.no' }
    );
  });

  it('does not look for a next pickup when the subscription was cancelled too', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue({
      ...CANCELLED,
      subscription_id: 'sub-1',
      subscription: { frequency: 'weekly', status: 'cancelled' },
    });

    await sendOrderCancelledEmail('ord-1');

    expect(getActiveOrdersBySubscriptionId).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when the order is not cancelled in the database', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue({ ...CANCELLED, status: 'pickup_scheduled' });

    await sendOrderCancelledEmail('ord-1');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(null);

    await sendOrderCancelledEmail('ord-x');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the next-pickup lookup rejects', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue({
      ...CANCELLED,
      subscription_id: 'sub-1',
      subscription: { frequency: 'weekly', status: 'active' },
    });
    m(getActiveOrdersBySubscriptionId).mockRejectedValue(new Error('db down'));

    await expect(sendOrderCancelledEmail('ord-1')).resolves.toBeUndefined();
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe('sendPickupRescheduledEmail', () => {
  const BEFORE = { scheduled_date: '2026-10-24', updated_at: '2026-10-20T10:00:00+00:00' };
  const MOVED = { ...ORDER, scheduled_date: '2026-10-27' };

  it('sends old → new, keyed on the row version that was changed', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(MOVED);

    await sendPickupRescheduledEmail('ord-1', BEFORE, 'customer');

    expect(buildPickupRescheduledEmail).toHaveBeenCalledWith(
      MOVED,
      { previousPickupDate: '2026-10-24', changedBy: 'customer' },
      { appUrl: 'https://nooracare.no' }
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Ny dato',
        idempotencyKey: 'pickup-rescheduled/ord-1/2026-10-20T10:00:00+00:00',
      })
    );
  });

  it('gives a later change of the same order its own key, so A → B → A → B is never swallowed', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(MOVED);

    await sendPickupRescheduledEmail('ord-1', BEFORE, 'customer');
    await sendPickupRescheduledEmail('ord-1', { ...BEFORE, updated_at: '2026-10-20T11:30:00+00:00' }, 'customer');

    const keys = m(sendEmail).mock.calls.map(([message]) => message.idempotencyKey);
    expect(keys).toEqual([
      'pickup-rescheduled/ord-1/2026-10-20T10:00:00+00:00',
      'pickup-rescheduled/ord-1/2026-10-20T11:30:00+00:00',
    ]);
  });

  it('passes changedBy "admin" through to the builder', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(MOVED);

    await sendPickupRescheduledEmail('ord-1', BEFORE, 'admin');

    expect(buildPickupRescheduledEmail).toHaveBeenCalledWith(
      MOVED,
      { previousPickupDate: '2026-10-24', changedBy: 'admin' },
      { appUrl: 'https://nooracare.no' }
    );
  });

  it('sends nothing when the same date was saved again', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue({ ...ORDER, scheduled_date: '2026-10-24' });

    await sendPickupRescheduledEmail('ord-1', BEFORE, 'customer');

    expect(buildPickupRescheduledEmail).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(null);

    await sendPickupRescheduledEmail('ord-x', BEFORE, 'customer');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the database helper rejects', async () => {
    m(getOrderForCustomerEmail).mockRejectedValue(new Error('db down'));

    await expect(sendPickupRescheduledEmail('ord-1', BEFORE, 'customer')).resolves.toBeUndefined();
  });
});

describe('sendCleanerConfirmedEmail', () => {
  // Far-future pickup so the "past pickup date" guard never depends on today's date.
  const ASSIGNED_ORDER = {
    id: 'ord-1',
    status: 'pickup_scheduled',
    scheduled_date: '2099-01-05',
    declined_by_cleaner_ids: null,
    customer: { user: { email: 'kari@example.com', full_name: 'Kari' } },
  };

  beforeEach(() => {
    m(getOrderForCustomerEmail).mockResolvedValue(ASSIGNED_ORDER);
  });

  it('builds and sends the confirmation, keyed on the order and assignment round 0', async () => {
    await sendCleanerConfirmedEmail('ord-1', 'Ola Hansen');

    expect(getOrderForCustomerEmail).toHaveBeenCalledWith('ord-1');
    expect(buildCleanerConfirmedEmail).toHaveBeenCalledWith(ASSIGNED_ORDER, 'Ola Hansen', {
      appUrl: 'https://nooracare.no',
    });
    expect(sendEmail).toHaveBeenCalledWith({
      from: 'NooraCare <no-reply@nooracare.no>',
      to: ['kari@example.com'],
      replyTo: ['post@nooracare.no'],
      subject: 'Renser bekreftet',
      text: 'tekst',
      html: '<p>html</p>',
      idempotencyKey: 'cleaner-confirmed/ord-1/0',
    });
  });

  it('uses a new key after each decline, so a re-assignment is sent again', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue({
      ...ASSIGNED_ORDER,
      declined_by_cleaner_ids: ['cl-1', 'cl-2'],
    });

    await sendCleanerConfirmedEmail('ord-1', 'Per');

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: 'cleaner-confirmed/ord-1/2' })
    );
  });

  it('sends nothing when the order is no longer pickup_scheduled', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue({ ...ASSIGNED_ORDER, status: 'cancelled' });

    await sendCleanerConfirmedEmail('ord-1', 'Ola');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the pickup date has already passed', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue({ ...ASSIGNED_ORDER, scheduled_date: '2000-01-01' });

    await sendCleanerConfirmedEmail('ord-1', 'Ola');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('sends nothing when the order is not found', async () => {
    m(getOrderForCustomerEmail).mockResolvedValue(null);

    await sendCleanerConfirmedEmail('ord-x', 'Ola');

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('never throws when the database helper rejects', async () => {
    m(getOrderForCustomerEmail).mockRejectedValue(new Error('db down'));

    await expect(sendCleanerConfirmedEmail('ord-1', 'Ola')).resolves.toBeUndefined();
  });
});
