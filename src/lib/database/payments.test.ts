import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { hasUnsettledVippsPaymentForSubscription } from './payments';

const m = (fn: unknown) => fn as Mock;

describe('hasUnsettledVippsPaymentForSubscription', () => {
  // orders: from('orders').select('id').eq('subscription_id', id)
  const ordersEq = vi.fn();
  const ordersSelect = vi.fn(() => ({ eq: ordersEq }));
  // payments: from('payments').select('id').in(...).eq(...).in(...).or(...).limit(1)
  const limit = vi.fn();
  const or = vi.fn(() => ({ limit }));
  const statusIn = vi.fn(() => ({ or }));
  const providerEq = vi.fn(() => ({ in: statusIn }));
  const orderIn = vi.fn(() => ({ eq: providerEq }));
  const paymentsSelect = vi.fn(() => ({ in: orderIn }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T12:00:00.000Z'));
    m(createAdminClient).mockReturnValue({
      from: vi.fn((table: string) =>
        table === 'orders' ? { select: ordersSelect } : { select: paymentsSelect }
      ),
    });
    ordersEq.mockResolvedValue({ data: [{ id: 'ord-1' }], error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ignores orphan pending rows: requires a provider_reference or a row younger than 15 minutes', async () => {
    limit.mockResolvedValue({ data: [], error: null });

    const result = await hasUnsettledVippsPaymentForSubscription('sub-1');

    expect(result).toBe(false);
    expect(orderIn).toHaveBeenCalledWith('order_id', ['ord-1']);
    expect(providerEq).toHaveBeenCalledWith('payment_provider', 'vipps');
    expect(statusIn).toHaveBeenCalledWith('status', ['pending', 'authorized']);
    expect(or).toHaveBeenCalledWith('provider_reference.not.is.null,created_at.gte.2026-10-16T11:45:00.000Z');
  });

  it('returns true when a real unsettled charge exists', async () => {
    limit.mockResolvedValue({ data: [{ id: 'pay-1' }], error: null });

    await expect(hasUnsettledVippsPaymentForSubscription('sub-1')).resolves.toBe(true);
  });

  it('returns false without querying payments when the subscription has no orders', async () => {
    ordersEq.mockResolvedValue({ data: [], error: null });

    await expect(hasUnsettledVippsPaymentForSubscription('sub-1')).resolves.toBe(false);
    expect(paymentsSelect).not.toHaveBeenCalled();
  });

  it('fails safe (true) when the payments query errors', async () => {
    limit.mockResolvedValue({ data: null, error: { message: 'boom' } });

    await expect(hasUnsettledVippsPaymentForSubscription('sub-1')).resolves.toBe(true);
  });
});
