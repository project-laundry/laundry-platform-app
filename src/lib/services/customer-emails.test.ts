import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ getOrderForCustomerEmail: vi.fn() }));
vi.mock('@/lib/database/payments', () => ({ getPaymentById: vi.fn() }));
vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn(),
  CUSTOMER_EMAIL_FROM: 'NooraCare <no-reply@nooracare.no>',
}));
vi.mock('@/lib/email/customer-emails', () => ({
  buildOrderConfirmationEmail: vi.fn(() => ({ subject: 'Bekreftet', text: 'tekst', html: '<p>html</p>' })),
  buildPriceReceiptEmail: vi.fn(() => ({ subject: 'Pris', text: 'tekst', html: '<p>html</p>' })),
  buildPaymentFailedEmail: vi.fn(() => ({ subject: 'Feilet', text: 'tekst', html: '<p>html</p>' })),
}));

import { getOrderForCustomerEmail } from '@/lib/database/orders';
import { getPaymentById } from '@/lib/database/payments';
import { sendEmail } from '@/lib/email/send';
import { buildOrderConfirmationEmail, buildPaymentFailedEmail, buildPriceReceiptEmail } from '@/lib/email/customer-emails';
import { sendOrderConfirmationEmail, sendPaymentFailedEmail, sendPriceReceiptEmail } from './customer-emails';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

const ORDER = { id: 'ord-1', customer: { user: { email: 'kari@example.com', full_name: 'Kari' } } };

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
