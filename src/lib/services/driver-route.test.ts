import { describe, it, expect } from 'vitest';
import type { Cleaner, Customer, User } from '@/types/database';
import type { DriverRouteOrder } from '@/lib/database/orders';
import { buildDriverStops } from './driver-route';

const TODAY = '2026-08-29';

function baseUser(over: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'kunde@example.com',
    phone: '+47 400 00 001',
    full_name: 'Kari Nordmann',
    role: 'customer',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    last_login_at: null,
    deleted_at: null,
    ...over,
  };
}

function baseCustomer(over: Partial<Customer & { user: User }> = {}): Customer & { user: User } {
  return {
    id: 'customer-1',
    user_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    deleted_at: null,
    user: baseUser(),
    ...over,
  };
}

function baseCleaner(over: Partial<Cleaner & { user: User }> = {}): Cleaner & { user: User } {
  return {
    id: 'cleaner-1',
    user_id: 'user-9',
    display_name: 'Sofie Vask',
    profile_image_url: null,
    bio: null,
    verification_status: 'approved',
    business_type: 'individual',
    tax_id: '12345678901',
    business_name: null,
    business_address: null,
    bank_account: '12345678901',
    base_street: 'Nøstegaten 58',
    base_postal_code: '5011',
    base_city: 'Bergen',
    base_country: 'Norway',
    base_special_instructions: null,
    latitude: 60.394,
    longitude: 5.317,
    experience_level: 'experienced',
    weekly_schedule: { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
    is_accepting_orders: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    approved_at: '2026-01-01T00:00:00Z',
    suspended_at: null,
    deleted_at: null,
    user: baseUser({ id: 'user-9', full_name: 'Sofie Vask', phone: '+47 400 00 009' }),
    ...over,
  };
}

let orderSeq = 0;
function makeOrder(over: Partial<DriverRouteOrder> = {}): DriverRouteOrder {
  orderSeq += 1;
  return {
    id: `order-${orderSeq}`,
    order_number: `A7K2X${orderSeq}`,
    customer_id: 'customer-1',
    subscription_id: null,
    payment_agreement_id: null,
    cleaner_id: 'cleaner-1',
    status: 'pickup_scheduled',
    street: 'Fjøsangerveien 12',
    postal_code: '5054',
    city: 'Bergen',
    country: 'Norway',
    special_instructions_address: null,
    latitude: 60.3686,
    longitude: 5.338,
    scheduled_date: TODAY,
    delivery_date: '2026-08-31',
    special_instructions: null,
    needs_ironing: false,
    customer_estimate: null,
    wash_loads: 0,
    ironing_details: null,
    actual_weight_kg: null,
    pricing_notes: null,
    price_calculated_at: null,
    total_cost_ore: null,
    promo: null,
    declined_by_cleaner_ids: null,
    assigned_at: null,
    picked_up_at: null,
    in_cleaning_at: null,
    ready_for_delivery_at: null,
    out_for_delivery_at: null,
    completed_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    mission_accepted_at: null,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-20T00:00:00Z',
    customer: baseCustomer(),
    cleaner: baseCleaner(),
    ...over,
  };
}

describe('buildDriverStops', () => {
  it('maps a scheduled pickup to a customer_pickup stop with no dependencies', () => {
    const order = makeOrder({ status: 'pickup_scheduled' });
    const { stops } = buildDriverStops([order], TODAY);

    const pickup = stops.find((s) => s.type === 'customer_pickup');
    expect(pickup).toBeDefined();
    expect(pickup!.id).toBe(`pickup:${order.id}`);
    expect(pickup!.dependsOn).toEqual([]);
    expect(pickup!.contact_name).toBe('Kari Nordmann');
    expect(pickup!.overdue).toBe(false);
    expect(pickup!.estimated_delivery).toBeNull();
  });

  it('marks pickups scheduled before today as overdue', () => {
    const order = makeOrder({ status: 'pickup_scheduled', scheduled_date: '2026-08-27' });
    const { stops } = buildDriverStops([order], TODAY);
    expect(stops.find((s) => s.type === 'customer_pickup')!.overdue).toBe(true);
  });

  it('groups drop-off orders for the same cleaner into one stop', () => {
    const a = makeOrder({ status: 'picked_up' });
    const b = makeOrder({ status: 'picked_up' });
    const { stops } = buildDriverStops([a, b], TODAY);

    const dropoffs = stops.filter((s) => s.type === 'cleaner_dropoff');
    expect(dropoffs).toHaveLength(1);
    expect(dropoffs[0].id).toBe('dropoff:cleaner-1');
    expect(dropoffs[0].orders.map((o) => o.id).sort()).toEqual([a.id, b.id].sort());
    expect(dropoffs[0].dependsOn).toEqual([]);
    expect(dropoffs[0].street).toBe('Nøstegaten 58');
  });

  it('gates an anticipated drop-off on its not-yet-collected pickups', () => {
    const collected = makeOrder({ status: 'picked_up' });
    const scheduled = makeOrder({ status: 'pickup_scheduled' });
    const { stops } = buildDriverStops([collected, scheduled], TODAY);

    const dropoff = stops.find((s) => s.type === 'cleaner_dropoff')!;
    expect(dropoff.orders).toHaveLength(2);
    expect(dropoff.dependsOn).toEqual([`pickup:${scheduled.id}`]);
  });

  it('creates collect + dependent delivery stops as soon as an order is ready — even before the estimated delivery date', () => {
    // delivery_date is in the future relative to TODAY: an estimate, never a gate.
    const order = makeOrder({ status: 'ready_for_delivery', delivery_date: '2026-08-31' });
    const { stops } = buildDriverStops([order], TODAY);

    const collect = stops.find((s) => s.type === 'cleaner_collect');
    const delivery = stops.find((s) => s.type === 'customer_delivery');
    expect(collect).toBeDefined();
    expect(collect!.id).toBe('collect:cleaner-1');
    expect(collect!.overdue).toBe(false);
    expect(collect!.estimated_delivery).toBe('2026-08-31');
    expect(delivery).toBeDefined();
    expect(delivery!.dependsOn).toEqual(['collect:cleaner-1']);
    expect(delivery!.overdue).toBe(false);
    expect(delivery!.estimated_delivery).toBe('2026-08-31');
  });

  it('never marks delivery legs overdue, even past the estimated date', () => {
    const order = makeOrder({ status: 'ready_for_delivery', delivery_date: '2026-08-20' });
    const { stops } = buildDriverStops([order], TODAY);

    expect(stops.find((s) => s.type === 'cleaner_collect')!.overdue).toBe(false);
    expect(stops.find((s) => s.type === 'customer_delivery')!.overdue).toBe(false);
  });

  it('uses the earliest estimate for a grouped collect stop', () => {
    const later = makeOrder({ status: 'ready_for_delivery', delivery_date: '2026-09-02' });
    const sooner = makeOrder({ status: 'ready_for_delivery', delivery_date: '2026-08-30' });
    const { stops } = buildDriverStops([later, sooner], TODAY);

    expect(stops.find((s) => s.type === 'cleaner_collect')!.estimated_delivery).toBe('2026-08-30');
  });

  it('creates only an independent delivery stop for out_for_delivery orders', () => {
    const order = makeOrder({ status: 'out_for_delivery' });
    const { stops } = buildDriverStops([order], TODAY);

    expect(stops.filter((s) => s.type === 'cleaner_collect')).toHaveLength(0);
    const delivery = stops.find((s) => s.type === 'customer_delivery')!;
    expect(delivery.dependsOn).toEqual([]);
  });

  it('reports picked_up and ready orders without a cleaner instead of routing them', () => {
    const inVan = makeOrder({ status: 'picked_up', cleaner: null, cleaner_id: null });
    const ready = makeOrder({ status: 'ready_for_delivery', cleaner: null, cleaner_id: null });
    const { stops, skippedOrderNumbers } = buildDriverStops([inVan, ready], TODAY);

    expect(stops).toHaveLength(0);
    expect(skippedOrderNumbers.sort()).toEqual([inVan.order_number, ready.order_number].sort());
  });

  it('builds a contents label from the customer estimate', () => {
    const order = makeOrder({
      status: 'pickup_scheduled',
      customer_estimate: {
        bags: 2,
        bedding_sets: 1,
        iron_everyday_items: 0,
        iron_formal_items: 0,
        iron_bedding: false,
        estimated_total_ore: 60000,
      },
    });
    const { stops } = buildDriverStops([order], TODAY);
    expect(stops[0].orders[0].contents_label).toBe('2 poser · 1 sett sengetøy');
  });

  it('joins address and pickup instructions for customer stops', () => {
    const order = makeOrder({
      status: 'pickup_scheduled',
      special_instructions_address: 'Kode 1934',
      special_instructions: 'Ring på',
    });
    const { stops } = buildDriverStops([order], TODAY);
    expect(stops[0].special_instructions).toBe('Kode 1934 — Ring på');
  });
});
