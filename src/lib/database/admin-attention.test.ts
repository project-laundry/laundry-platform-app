import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminAttention, paymentIssueLabel } from './admin-attention';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});

// 2026-10-17 13:00 in Oslo (CEST, UTC+2).
const NOW = new Date('2026-10-17T11:00:00.000Z');

/**
 * All eight queries share one chain mock; `.limit()` is the awaited terminal
 * call and pops the next result. Order (see getAdminAttention):
 * 1 pickups today, 2 deliveries today, 3 overdue pickups, 4 ready too long,
 * 5 pending assignment, 6 payments, 7 subscriptions, 8 payment agreements.
 */
const limit = vi.fn();
const chain: Record<string, unknown> = { limit };
for (const method of ['select', 'eq', 'neq', 'in', 'lt', 'or', 'order']) {
  chain[method] = vi.fn(() => chain);
}
const from = vi.fn(() => chain);

const empty = { data: [], error: null };
const failed = { data: null, error: { message: 'boom' } };

function queue(results: { data: unknown; error: unknown }[]) {
  limit.mockReset();
  for (const result of results) limit.mockResolvedValueOnce(result);
}

const order = (overrides: Record<string, unknown> = {}) => ({
  id: 'ord-1',
  order_number: 'ABC123',
  status: 'pickup_scheduled',
  scheduled_date: '2026-10-15',
  delivery_date: '2026-10-17',
  city: 'Oslo',
  created_at: '2026-10-10T08:00:00.000Z',
  ready_for_delivery_at: null,
  customer: { user: { full_name: 'Kari Nordmann' } },
  cleaner: null,
  ...overrides,
});

describe('getAdminAttention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m(createAdminClient).mockReturnValue({ from });
  });

  it('filters by today in Oslo and the configured cutoffs', async () => {
    queue([empty, empty, empty, empty, empty, empty, empty, empty]);

    const result = await getAdminAttention(NOW);

    expect(result.today).toBe('2026-10-17');
    expect(chain.eq).toHaveBeenCalledWith('scheduled_date', '2026-10-17');
    expect(chain.eq).toHaveBeenCalledWith('delivery_date', '2026-10-17');
    expect(chain.lt).toHaveBeenCalledWith('scheduled_date', '2026-10-17');
    // ready_for_delivery_at older than 2 days
    expect(chain.or).toHaveBeenCalledWith(
      'ready_for_delivery_at.lt.2026-10-15T11:00:00.000Z,and(ready_for_delivery_at.is.null,updated_at.lt.2026-10-15T11:00:00.000Z)'
    );
    // failed + orphan pending (15 min) + stale pending (3 days)
    expect(chain.or).toHaveBeenCalledWith(
      'status.eq.failed,and(status.eq.pending,provider_reference.is.null,created_at.lt.2026-10-17T10:45:00.000Z),and(status.eq.pending,provider_reference.not.is.null,created_at.lt.2026-10-14T11:00:00.000Z)'
    );
    // activation grace (15 min) on subscriptions and agreements
    expect(chain.lt).toHaveBeenCalledWith('started_at', '2026-10-17T10:45:00.000Z');
    expect(chain.lt).toHaveBeenCalledWith('activated_at', '2026-10-17T10:45:00.000Z');
    expect(chain.in).toHaveBeenCalledWith('orders.status', [
      'pending_assignment',
      'pickup_scheduled',
      'picked_up',
      'in_cleaning',
      'ready_for_delivery',
      'out_for_delivery',
    ]);
    expect(from).toHaveBeenCalledTimes(8);
  });

  it('returns the rows of each list', async () => {
    const overdue = order();
    queue([empty, empty, { data: [overdue], error: null }, empty, empty, empty, empty, empty]);

    const result = await getAdminAttention(NOW);

    expect(result.overduePickups).toEqual([overdue]);
    expect(result.pickupsToday).toEqual([]);
  });

  it('keeps only subscriptions and agreements with no (active) order', async () => {
    const subWithOrder = { id: 'sub-1', orders: [{ id: 'ord-1' }] };
    const subWithout = { id: 'sub-2', orders: [] };
    const paWithOrder = { id: 'pa-1', orders: [{ id: 'ord-2' }] };
    const paWithout = { id: 'pa-2', orders: [] };
    queue([
      empty,
      empty,
      empty,
      empty,
      empty,
      empty,
      { data: [subWithOrder, subWithout], error: null },
      { data: [paWithOrder, paWithout], error: null },
    ]);

    const result = await getAdminAttention(NOW);

    expect(result.subscriptionsWithoutOrder).toEqual([subWithout]);
    expect(result.agreementsWithoutOrder).toEqual([paWithout]);
  });

  it('reports a failed query as null, never as an empty list', async () => {
    queue([empty, failed, empty, empty, empty, failed, empty, empty]);

    const result = await getAdminAttention(NOW);

    expect(result.pickupsToday).toEqual([]);
    expect(result.deliveriesToday).toBeNull();
    expect(result.paymentsToFollowUp).toBeNull();
    expect(result.subscriptionsWithoutOrder).toEqual([]);
  });
});

describe('paymentIssueLabel', () => {
  it('describes failed rows with the reason when there is one', () => {
    expect(
      paymentIssueLabel({ status: 'failed', provider_reference: 'chr-1', failure_reason: 'Avvist' })
    ).toBe('Feilet: Avvist');
    expect(paymentIssueLabel({ status: 'failed', provider_reference: null, failure_reason: null })).toBe(
      'Feilet'
    );
  });

  it('distinguishes orphan pending from stale pending', () => {
    expect(
      paymentIssueLabel({ status: 'pending', provider_reference: null, failure_reason: null })
    ).toBe('Belastningen ble aldri opprettet hos Vipps');
    expect(
      paymentIssueLabel({ status: 'pending', provider_reference: 'chr-1', failure_reason: null })
    ).toBe('Venter på Vipps i over 3 dager');
  });
});
