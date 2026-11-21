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
}));

import { getOrderForCustomerEmail } from '@/lib/database/orders';
import { sendEmail } from '@/lib/email/send';
import { buildOrderConfirmationEmail } from '@/lib/email/customer-emails';
import { sendOrderConfirmationEmail } from './customer-emails';

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
