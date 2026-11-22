import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { getAdminAttention, paymentIssueLabel, unchargedOrderLabel } from './admin-attention';

const m = (fn: unknown) => fn as Mock;

vi.spyOn(console, 'error').mockImplementation(() => {});

// 2026-10-17 13:00 in Oslo (CEST, UTC+2).
const NOW = new Date('2026-10-17T11:00:00.000Z');

/**
 * All ten queries share one chain mock; `.limit()` is the awaited terminal
 * call and pops the next result. Order (see getAdminAttention):
 * 1 pickups today, 2 deliveries today, 3 overdue pickups, 4 ready too long,
 * 5 pending assignment, 6 payments, 7 subscriptions, 8 payment agreements,
 * 9 cancelled payments, 10 uncharged orders.
 */
const limit = vi.fn();
const chain: Record<string, unknown> = { limit };
for (const method of ['select', 'eq', 'neq', 'in', 'lt', 'gt', 'is', 'or', 'order']) {
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
    queue([empty, empty, empty, empty, empty, empty, empty, empty, empty, empty]);

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
    // cancelled charges, and priced orders with no payment row
    expect(chain.eq).toHaveBeenCalledWith('status', 'cancelled');
    expect(chain.in).toHaveBeenCalledWith('status', ['ready_for_delivery', 'out_for_delivery', 'completed']);
    expect(chain.gt).toHaveBeenCalledWith('total_cost_ore', 0);
    expect(chain.is).toHaveBeenCalledWith('payments', null);
    expect(from).toHaveBeenCalledTimes(10);
  });

  it('returns the rows of each list', async () => {
    const overdue = order();
    queue([empty, empty, { data: [overdue], error: null }, empty, empty, empty, empty, empty, empty, empty]);

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
      empty,
      empty,
    ]);

    const result = await getAdminAttention(NOW);

    expect(result.subscriptionsWithoutOrder).toEqual([subWithout]);
    expect(result.agreementsWithoutOrder).toEqual([paWithout]);
  });

  it('reports a failed query as null, never as an empty list', async () => {
    queue([empty, failed, empty, empty, empty, failed, empty, empty, empty, empty]);

    const result = await getAdminAttention(NOW);

    expect(result.pickupsToday).toEqual([]);
    expect(result.deliveriesToday).toBeNull();
    expect(result.paymentsToFollowUp).toBeNull();
    expect(result.subscriptionsWithoutOrder).toEqual([]);
    expect(result.ordersNotCharged).toEqual([]);
  });

  it('reports the payment list as null when only the cancelled-payments query failed', async () => {
    queue([empty, empty, empty, empty, empty, empty, empty, empty, failed, failed]);

    const result = await getAdminAttention(NOW);

    expect(result.paymentsToFollowUp).toBeNull();
    expect(result.ordersNotCharged).toBeNull();
  });

  it('adds a cancelled charge to the payment list only while its order is unpaid', async () => {
    const failedRow = {
      id: 'pay-failed',
      status: 'failed',
      amount_ore: 59900,
      provider_reference: 'chr-9',
      failure_reason: 'Avvist',
      created_at: '2026-10-16T08:00:00.000Z',
      customer: { user: { full_name: 'Per Hansen' } },
      order: { id: 'ord-9', order_number: 'PAY999' },
    };
    const cancelledRow = (id: string, createdAt: string, order: Record<string, unknown> | null) => ({
      id,
      status: 'cancelled',
      amount_ore: 59800,
      provider_reference: `chr-${id}`,
      failure_reason: null,
      created_at: createdAt,
      customer: { user: { full_name: 'Kari Nordmann' } },
      order,
    });
    const sibling = (status: string, createdAt: string, reference: string | null = 'chr-x') => ({
      status,
      provider_reference: reference,
      created_at: createdAt,
    });

    // Unpaid: the cancelled row is the order's only payment.
    const unpaid = cancelledRow('pay-unpaid', '2026-10-16T10:00:00.000Z', {
      id: 'ord-1',
      order_number: 'ABC123',
      total_cost_ore: 59800,
      payments: [sibling('cancelled', '2026-10-16T10:00:00.000Z')],
    });
    // Paid afterwards: a newer captured charge exists.
    const recharged = cancelledRow('pay-recharged', '2026-10-15T10:00:00.000Z', {
      id: 'ord-2',
      order_number: 'DEF456',
      total_cost_ore: 59800,
      payments: [
        sibling('cancelled', '2026-10-15T10:00:00.000Z'),
        sibling('captured', '2026-10-16T09:00:00.000Z'),
      ],
    });
    // A newer failed row replaced it: that row is listed by query 6 already.
    const replacedByFailed = cancelledRow('pay-replaced', '2026-10-14T10:00:00.000Z', {
      id: 'ord-3',
      order_number: 'GHI789',
      total_cost_ore: 59800,
      payments: [
        sibling('cancelled', '2026-10-14T10:00:00.000Z'),
        sibling('failed', '2026-10-15T09:00:00.000Z'),
      ],
    });
    // Nothing to collect: 0 kr order, and a payment without an order.
    const zeroTotal = cancelledRow('pay-zero', '2026-10-13T10:00:00.000Z', {
      id: 'ord-4',
      order_number: 'JKL012',
      total_cost_ore: 0,
      payments: [sibling('cancelled', '2026-10-13T10:00:00.000Z')],
    });
    const noOrder = cancelledRow('pay-no-order', '2026-10-12T10:00:00.000Z', null);

    queue([
      empty,
      empty,
      empty,
      empty,
      empty,
      { data: [failedRow], error: null },
      empty,
      empty,
      { data: [unpaid, recharged, replacedByFailed, zeroTotal, noOrder], error: null },
      empty,
    ]);

    const result = await getAdminAttention(NOW);

    // Newest first; the cancelled row is reduced to the AttentionPayment shape.
    expect(result.paymentsToFollowUp).toEqual([
      {
        id: 'pay-unpaid',
        status: 'cancelled',
        amount_ore: 59800,
        provider_reference: 'chr-pay-unpaid',
        failure_reason: null,
        created_at: '2026-10-16T10:00:00.000Z',
        customer: { user: { full_name: 'Kari Nordmann' } },
        order: { id: 'ord-1', order_number: 'ABC123' },
      },
      failedRow,
    ]);
  });

  it('lists priced orders that have no payment row and marks the ones held by the price guard', async () => {
    const estimate = (estimatedTotalOre: number) => ({
      bags: 1,
      bedding_sets: 0,
      iron_everyday_items: 0,
      iron_formal_items: 0,
      iron_bedding: false,
      estimated_total_ore: estimatedTotalOre,
    });
    const row = (overrides: Record<string, unknown>) => ({
      id: 'ord-5',
      order_number: 'HELD01',
      status: 'ready_for_delivery',
      total_cost_ore: 59800,
      promo: null,
      customer_estimate: estimate(20000), // 598 kr is more than 2 × 200 kr → held
      ready_for_delivery_at: '2026-10-17T09:00:00.000Z',
      created_at: '2026-10-10T08:00:00.000Z',
      customer: { user: { full_name: 'Kari Nordmann' } },
      payments: [],
      ...overrides,
    });
    const held = row({});
    // Price within 2 × the estimate: no payment row for another reason.
    const neverCharged = row({ id: 'ord-6', order_number: 'NOROW1', customer_estimate: estimate(50000) });
    // Would only come back if the embedded `payments is null` filter were ignored.
    const charged = row({ id: 'ord-7', order_number: 'PAID01', payments: [{ id: 'pay-1' }] });
    queue([
      empty,
      empty,
      empty,
      empty,
      empty,
      empty,
      empty,
      empty,
      empty,
      { data: [held, neverCharged, charged], error: null },
    ]);

    const result = await getAdminAttention(NOW);

    const expected = (id: string, orderNumber: string, chargeHeld: boolean) => ({
      id,
      order_number: orderNumber,
      status: 'ready_for_delivery',
      total_cost_ore: 59800,
      ready_for_delivery_at: '2026-10-17T09:00:00.000Z',
      created_at: '2026-10-10T08:00:00.000Z',
      customer: { user: { full_name: 'Kari Nordmann' } },
      charge_held: chargeHeld,
    });
    expect(result.ordersNotCharged).toEqual([
      expected('ord-5', 'HELD01', true),
      expected('ord-6', 'NOROW1', false),
    ]);
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

  it('describes a cancelled charge', () => {
    expect(
      paymentIssueLabel({ status: 'cancelled', provider_reference: 'chr-1', failure_reason: null })
    ).toBe('Kansellert hos Vipps – ordren er ikke betalt');
  });

  it('labels an uncharged order as held by the price guard, or as simply not charged', () => {
    expect(unchargedOrderLabel({ charge_held: true })).toBe(
      'Holdt tilbake: pris over 2 ganger estimatet – godkjenn med «Belast på nytt»'
    );
    expect(unchargedOrderLabel({ charge_held: false })).toBe('Ikke belastet – trykk «Belast på nytt»');
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
