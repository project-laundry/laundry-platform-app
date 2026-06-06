import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { addDays, toISODateString, getWeekdayFromDate, getNextOccurrenceOfWeekday } from '@/lib/utils/date';

// The service dynamically imports these — vi.mock applies to dynamic imports too.
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({ createOrder: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { createOrder } from '@/lib/database/orders';
import { checkAndGenerateNextOrders } from './order-generation';

/**
 * Minimal chainable Supabase stand-in. The service issues a fixed, ordered
 * sequence of queries; each terminal (`await` on the chain, `.single()`,
 * `.maybeSingle()`) shifts the next configured response off the queue.
 */
function makeClient(responses: unknown[]) {
  const queue = [...responses];
  const next = () => (queue.length ? queue.shift() : { data: null, error: null });

  const builder: Record<string, unknown> = {};
  for (const method of ['from', 'select', 'insert', 'update', 'eq', 'not', 'gte', 'order', 'limit']) {
    builder[method] = () => builder;
  }
  builder.single = () => Promise.resolve(next());
  builder.maybeSingle = () => Promise.resolve(next());
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(next()).then(resolve, reject);

  return { from: () => builder };
}

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
  first_pickup_date: '2026-06-10',
};

const SUB_ID = 'sub-1';
const LAST_PICKUP = '2026-06-10';

function activeSubscription(frequency: string) {
  return {
    data: {
      id: SUB_ID,
      status: 'active',
      frequency,
      customer_id: 'cust-1',
      order_defaults: ORDER_DEFAULTS,
    },
    error: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('checkAndGenerateNextOrders — guards', () => {
  it('does nothing when the subscription is not active', async () => {
    (createAdminClient as Mock).mockReturnValue(makeClient([{ data: { status: 'paused' }, error: null }]));
    await checkAndGenerateNextOrders(SUB_ID);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('does nothing when an upcoming order already exists', async () => {
    (createAdminClient as Mock).mockReturnValue(
      makeClient([activeSubscription('weekly'), { count: 1 }])
    );
    await checkAndGenerateNextOrders(SUB_ID);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('skips when an order already exists for the computed date', async () => {
    (createAdminClient as Mock).mockReturnValue(
      makeClient([
        activeSubscription('weekly'),
        { count: 0 },
        { data: { scheduled_date: LAST_PICKUP } },
        { data: { id: 'existing-order' } }, // duplicate found
      ])
    );
    await checkAndGenerateNextOrders(SUB_ID);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('does not generate recurring orders for on_demand subscriptions', async () => {
    (createAdminClient as Mock).mockReturnValue(
      makeClient([
        activeSubscription('on_demand'),
        { count: 0 },
        { data: { scheduled_date: LAST_PICKUP } },
      ])
    );
    await checkAndGenerateNextOrders(SUB_ID);
    expect(createOrder).not.toHaveBeenCalled();
  });
});

describe('checkAndGenerateNextOrders — next pickup date by frequency', () => {
  function expectGeneratedOn(expectedDate: Date) {
    expect(createOrder).toHaveBeenCalledTimes(1);
    const arg = (createOrder as Mock).mock.calls[0][0];
    expect(arg.scheduled_date).toBe(toISODateString(expectedDate));
    expect(arg.subscription_id).toBe(SUB_ID);
    expect(arg.total_cost_ore).toBeNull();
    // cleaner default present -> pre-scheduled
    expect(arg.status).toBe('pickup_scheduled');
  }

  it('weekly advances the pickup by 7 days', async () => {
    (createAdminClient as Mock).mockReturnValue(
      makeClient([
        activeSubscription('weekly'),
        { count: 0 },
        { data: { scheduled_date: LAST_PICKUP } },
        { data: null }, // no duplicate
      ])
    );
    await checkAndGenerateNextOrders(SUB_ID);
    expectGeneratedOn(addDays(new Date(LAST_PICKUP), 7));
  });

  it('biweekly advances the pickup by 14 days', async () => {
    (createAdminClient as Mock).mockReturnValue(
      makeClient([
        activeSubscription('biweekly'),
        { count: 0 },
        { data: { scheduled_date: LAST_PICKUP } },
        { data: null },
      ])
    );
    await checkAndGenerateNextOrders(SUB_ID);
    expectGeneratedOn(addDays(new Date(LAST_PICKUP), 14));
  });

  it('monthly advances ~30 days to the next matching weekday', async () => {
    (createAdminClient as Mock).mockReturnValue(
      makeClient([
        activeSubscription('monthly'),
        { count: 0 },
        { data: { scheduled_date: LAST_PICKUP } },
        { data: null },
      ])
    );
    await checkAndGenerateNextOrders(SUB_ID);

    const weekday = getWeekdayFromDate(ORDER_DEFAULTS.first_pickup_date);
    const expected = getNextOccurrenceOfWeekday(addDays(new Date(LAST_PICKUP), 30), weekday);
    expectGeneratedOn(expected);
  });
});
