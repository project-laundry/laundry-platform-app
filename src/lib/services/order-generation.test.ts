import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { SubscriptionOrderDefaults } from '@/types/database';
import { addDays, toISODateString, getWeekdayFromDate, getNextOccurrenceOfWeekday } from '@/lib/utils/date';

// The service dynamically imports these — vi.mock applies to dynamic imports too.
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/database/orders', () => ({ createOrder: vi.fn() }));

import { createAdminClient } from '@/lib/supabase/admin';
import { createOrder } from '@/lib/database/orders';
import { checkAndGenerateNextOrders, buildOrderData } from './order-generation';

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
    latitude: 59.9139,
    longitude: 10.7522,
  },
  special_instructions: 'Hentes kl 09',
  location_city: 'Oslo',
  default_needs_ironing: true,
  default_cleaner_id: 'cleaner-1',
  first_pickup_date: '2026-06-10',
  customer_estimate: {
    bags: 2,
    bedding_sets: 1,
    iron_everyday_items: 0,
    iron_formal_items: 3,
    iron_bedding: false,
    estimated_total_ore: 73530,
  },
} satisfies SubscriptionOrderDefaults;

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
    // coordinates from order_defaults must propagate onto the generated order
    expect(arg.latitude).toBe(ORDER_DEFAULTS.initial_address.latitude);
    expect(arg.longitude).toBe(ORDER_DEFAULTS.initial_address.longitude);
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

describe('buildOrderData — shared order_defaults -> order mapping', () => {
  const pickupDate = new Date('2026-06-10');
  const deliveryDate = new Date('2026-06-12');

  it('copies all address fields, coordinates, and service prefs from order_defaults', () => {
    const data = buildOrderData(ORDER_DEFAULTS, {
      customerId: 'cust-1',
      subscriptionId: SUB_ID,
      paymentAgreementId: 'pa-1',
      pickupDate,
      deliveryDate,
    });

    expect(data).toMatchObject({
      customer_id: 'cust-1',
      subscription_id: SUB_ID,
      payment_agreement_id: 'pa-1',
      cleaner_id: 'cleaner-1',
      status: 'pickup_scheduled',
      street: 'Storgata 1',
      postal_code: '0150',
      city: 'Oslo',
      country: 'Norge',
      special_instructions_address: 'Ring på',
      special_instructions: 'Hentes kl 09',
      needs_ironing: true,
      customer_estimate: ORDER_DEFAULTS.customer_estimate,
      total_cost_ore: null,
      // The field that originally drifted between paths:
      latitude: 59.9139,
      longitude: 10.7522,
    });
    expect(data.scheduled_date).toBe(toISODateString(pickupDate));
    expect(data.delivery_date).toBe(toISODateString(deliveryDate));
  });

  it('defaults coordinates to null when order_defaults has none', () => {
    const { initial_address, ...rest } = ORDER_DEFAULTS;
    const withoutCoords = {
      ...rest,
      initial_address: {
        street: initial_address.street,
        postal_code: initial_address.postal_code,
        city: initial_address.city,
        country: initial_address.country,
        special_instructions: initial_address.special_instructions,
      },
    };

    const data = buildOrderData(withoutCoords, {
      customerId: 'cust-1',
      pickupDate,
      deliveryDate,
    });

    expect(data.latitude).toBeNull();
    expect(data.longitude).toBeNull();
  });

  it('defaults customer_estimate to null for legacy subscriptions without one', () => {
    const { customer_estimate, ...legacyDefaults } = ORDER_DEFAULTS;
    void customer_estimate;

    const data = buildOrderData(legacyDefaults, {
      customerId: 'cust-1',
      pickupDate,
      deliveryDate,
    });

    expect(data.customer_estimate).toBeNull();
  });

  it('marks the order pending_assignment when no default cleaner is set', () => {
    const data = buildOrderData(
      { ...ORDER_DEFAULTS, default_cleaner_id: null },
      { customerId: 'cust-1', pickupDate, deliveryDate }
    );

    expect(data.status).toBe('pending_assignment');
    expect(data.cleaner_id).toBeNull();
  });

  it('only stamps a promo when one is provided', () => {
    const promo = {
      code: 'WELCOME',
      promo_code_id: 'promo-1',
      discount_type: 'percentage' as const,
      discount_value: 10,
      max_discount_ore: null,
    };

    const withPromo = buildOrderData(ORDER_DEFAULTS, {
      customerId: 'cust-1',
      pickupDate,
      deliveryDate,
      promo,
    });
    const withoutPromo = buildOrderData(ORDER_DEFAULTS, {
      customerId: 'cust-1',
      pickupDate,
      deliveryDate,
    });

    expect(withPromo.promo).toEqual(promo);
    expect(withoutPromo.promo).toBeNull();
  });
});
