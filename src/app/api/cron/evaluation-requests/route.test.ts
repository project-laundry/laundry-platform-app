import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/database/orders', () => ({ getOrdersDeliveredOn: vi.fn() }));
vi.mock('@/lib/database/evaluations', () => ({ getEvaluatedOrderIds: vi.fn() }));
vi.mock('@/lib/services/customer-emails', () => ({ sendEvaluationRequestEmail: vi.fn() }));

import { getEvaluatedOrderIds } from '@/lib/database/evaluations';
import { getOrdersDeliveredOn } from '@/lib/database/orders';
import { sendEvaluationRequestEmail } from '@/lib/services/customer-emails';
import { GET } from './route';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

const URL_ = 'https://nooracare.no/api/cron/evaluation-requests';
const call = (authorization?: string) =>
  GET(new Request(URL_, { headers: authorization ? { authorization } : {} }));

const ORDERS = [{ id: 'ord-1' }, { id: 'ord-2' }, { id: 'ord-3' }];

beforeEach(() => {
  vi.clearAllMocks();
  // Wednesday 25 November 2026, 10:00 in Oslo — the moment the cron fires.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-25T09:00:00Z'));
  vi.stubEnv('CRON_SECRET', 'secret');
  vi.stubEnv('RESEND_API_KEY', 're_test');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://nooracare.no');
  m(getOrdersDeliveredOn).mockResolvedValue(ORDERS);
  m(getEvaluatedOrderIds).mockResolvedValue(new Set());
  m(sendEvaluationRequestEmail).mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('GET /api/cron/evaluation-requests', () => {
  it('answers 401 without the cron secret and sends nothing', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    expect(getOrdersDeliveredOn).not.toHaveBeenCalled();
    expect(sendEvaluationRequestEmail).not.toHaveBeenCalled();
  });

  it('answers 401 when CRON_SECRET is not configured at all', async () => {
    vi.stubEnv('CRON_SECRET', '');

    expect((await call('Bearer ')).status).toBe(401);
  });

  it('answers 500 when the Resend key or the app URL is missing', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    expect((await call('Bearer secret')).status).toBe(500);

    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect((await call('Bearer secret')).status).toBe(500);

    expect(getOrdersDeliveredOn).not.toHaveBeenCalled();
  });

  it("asks every order delivered on yesterday's Oslo date", async () => {
    const res = await call('Bearer secret');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ date: '2026-11-24', sent: 3, skipped: 0, failed: 0 });
    expect(getOrdersDeliveredOn).toHaveBeenCalledWith('2026-11-24');
    expect(getEvaluatedOrderIds).toHaveBeenCalledWith(['ord-1', 'ord-2', 'ord-3']);
    expect(m(sendEvaluationRequestEmail).mock.calls.map(([order]) => order)).toEqual(ORDERS);
  });

  it('skips the orders that already have an evaluation', async () => {
    m(getEvaluatedOrderIds).mockResolvedValue(new Set(['ord-2']));

    const res = await call('Bearer secret');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ date: '2026-11-24', sent: 2, skipped: 1, failed: 0 });
    expect(m(sendEvaluationRequestEmail).mock.calls.map(([order]) => order)).toEqual([ORDERS[0], ORDERS[2]]);
  });

  it('answers 200 with zero counts when nothing was delivered yesterday', async () => {
    m(getOrdersDeliveredOn).mockResolvedValue([]);

    const res = await call('Bearer secret');

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ date: '2026-11-24', sent: 0, skipped: 0, failed: 0 });
    expect(sendEvaluationRequestEmail).not.toHaveBeenCalled();
  });

  it('keeps going after a failed send and answers 502 with the counts', async () => {
    m(sendEvaluationRequestEmail)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const res = await call('Bearer secret');

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ date: '2026-11-24', sent: 2, skipped: 0, failed: 1 });
    expect(sendEvaluationRequestEmail).toHaveBeenCalledTimes(3);
  });

  it('answers 500 when the orders or the evaluations could not be loaded', async () => {
    m(getOrdersDeliveredOn).mockResolvedValue(null);
    expect((await call('Bearer secret')).status).toBe(500);

    m(getOrdersDeliveredOn).mockResolvedValue(ORDERS);
    m(getEvaluatedOrderIds).mockResolvedValue(null);
    expect((await call('Bearer secret')).status).toBe(500);

    expect(sendEvaluationRequestEmail).not.toHaveBeenCalled();
  });
});
