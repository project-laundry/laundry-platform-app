import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { isUndeliverableTestAddress, sendEmail } from './send';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

const MESSAGE = {
  from: 'NooraCare <no-reply@nooracare.no>',
  to: ['kari@nooracare.no'],
  subject: 'Emne',
  text: 'Innhold',
};

beforeEach(() => {
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '' }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('sendEmail', () => {
  it('posts to Resend with the bearer key and exactly the fields given', async () => {
    const result = await sendEmail(MESSAGE);

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = m(fetch).mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ Authorization: 'Bearer re_test', 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual(MESSAGE);
  });

  it('adds html, reply_to and the Idempotency-Key header when given', async () => {
    await sendEmail({
      ...MESSAGE,
      html: '<p>Innhold</p>',
      replyTo: ['post@nooracare.no'],
      idempotencyKey: 'order-confirmation/ord-1',
    });

    const [, init] = m(fetch).mock.calls[0];
    expect(init.headers['Idempotency-Key']).toBe('order-confirmation/ord-1');
    expect(JSON.parse(init.body)).toEqual({
      ...MESSAGE,
      html: '<p>Innhold</p>',
      reply_to: ['post@nooracare.no'],
    });
  });

  it('reports a rejected send without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => '{"message":"bad from"}' })
    );

    await expect(sendEmail(MESSAGE)).resolves.toEqual({ ok: false, error: 'Resend responded 422' });
  });

  it('reports a network failure without throwing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')));

    await expect(sendEmail(MESSAGE)).resolves.toEqual({ ok: false, error: 'ECONNRESET' });
  });

  it('sends nothing when RESEND_API_KEY is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');

    const result = await sendEmail(MESSAGE);

    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('skips a test address and reports success without calling Resend', async () => {
    const result = await sendEmail({ ...MESSAGE, to: ['kari.larsen.1732556789123.4567@test.no'] });

    expect(result).toEqual({ ok: true, skipped: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('drops the test addresses and sends to the remaining recipients', async () => {
    const result = await sendEmail({
      ...MESSAGE,
      to: ['kari@example.com', 'kari@nooracare.no'],
    });

    expect(result).toEqual({ ok: true });
    const [, init] = m(fetch).mock.calls[0];
    expect(JSON.parse(init.body).to).toEqual(['kari@nooracare.no']);
  });

  it('sends to the Resend test inbox the seed scripts use', async () => {
    const result = await sendEmail({ ...MESSAGE, to: ['delivered+kari.larsen.1.2@resend.dev'] });

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('isUndeliverableTestAddress', () => {
  it('blocks the example domains, test.no and their subdomains', () => {
    expect(isUndeliverableTestAddress('kari.larsen.1732556789123.4567@test.no')).toBe(true);
    expect(isUndeliverableTestAddress('a@example.com')).toBe(true);
    expect(isUndeliverableTestAddress('a@EXAMPLE.org')).toBe(true);
    expect(isUndeliverableTestAddress('a@mail.example.net')).toBe(true);
    expect(isUndeliverableTestAddress('Kari <kari@test.no>')).toBe(true);
  });

  it('blocks the reserved top-level domains', () => {
    expect(isUndeliverableTestAddress('a@foo.test')).toBe(true);
    expect(isUndeliverableTestAddress('a@foo.example')).toBe(true);
    expect(isUndeliverableTestAddress('a@foo.invalid')).toBe(true);
    expect(isUndeliverableTestAddress('a@localhost')).toBe(true);
    expect(isUndeliverableTestAddress('a@app.localhost')).toBe(true);
  });

  it('lets real mailboxes and the Resend test inbox through', () => {
    expect(isUndeliverableTestAddress('delivered+kari.larsen.1.2@resend.dev')).toBe(false);
    expect(isUndeliverableTestAddress('post@nooracare.no')).toBe(false);
    expect(isUndeliverableTestAddress('a@gmail.com')).toBe(false);
    // Look-alikes: only the exact domain or a subdomain of it is blocked.
    expect(isUndeliverableTestAddress('a@contest.no')).toBe(false);
    expect(isUndeliverableTestAddress('a@mytest.no')).toBe(false);
    expect(isUndeliverableTestAddress('a@test.nooracare.no')).toBe(false);
    expect(isUndeliverableTestAddress('a@example.no')).toBe(false);
    expect(isUndeliverableTestAddress('not-an-address')).toBe(false);
  });
});
