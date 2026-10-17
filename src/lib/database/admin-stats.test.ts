import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminOverviewCounts } from './admin-stats';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});

/**
 * Every count query is a thenable chain. `results` is consumed in the order
 * getAdminOverviewCounts builds its Promise.all array:
 * pending assignment, active, pending cleaners, failed, orphan pending, customers.
 */
function mockClient(results: { count: number | null; error: unknown }[]) {
  const queue = [...results];
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'in', 'is', 'lt']) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = (resolve: (value: unknown) => void) => resolve(queue.shift());
  m(createAdminClient).mockReturnValue({ from: vi.fn(() => chain) });
}

const ok = (count: number) => ({ count, error: null });
const failed = { count: null, error: { message: 'boom' } };

describe('getAdminOverviewCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the counts and sums failed + orphan pending payments', async () => {
    mockClient([ok(2), ok(5), ok(1), ok(3), ok(1), ok(40)]);

    await expect(getAdminOverviewCounts()).resolves.toEqual({
      pendingAssignmentOrders: 2,
      activeOrders: 5,
      pendingCleaners: 1,
      failedPayments: 4,
      customers: 40,
    });
  });

  it('reports null (not 0) for a count whose query failed', async () => {
    mockClient([failed, ok(5), ok(1), ok(3), ok(1), ok(40)]);

    const counts = await getAdminOverviewCounts();

    expect(counts.pendingAssignmentOrders).toBeNull();
    expect(counts.activeOrders).toBe(5);
  });

  it('reports failedPayments as null when either of its two queries failed', async () => {
    mockClient([ok(2), ok(5), ok(1), ok(3), failed, ok(40)]);

    await expect(getAdminOverviewCounts()).resolves.toMatchObject({ failedPayments: null });
  });

  it('treats a null count on a successful query as 0', async () => {
    mockClient([ok(2), ok(5), ok(1), { count: null, error: null }, ok(0), ok(40)]);

    await expect(getAdminOverviewCounts()).resolves.toMatchObject({ failedPayments: 0 });
  });
});
