// Driver route building — PURE functions, no I/O. Translates today's orders
// into the driver's stops (customer pickups, cleaner drop-offs, cleaner
// collections, customer deliveries), grouping cleaner visits per cleaner and
// wiring precedence between dependent stops. See PLAN_DRIVER_ROLE.md §2 for
// the stop-type table.

import type { CustomerEstimate, OrderStatus } from '@/types/database';
import type { DriverRouteOrder } from '@/lib/database/orders';

export type DriverStopType =
  | 'customer_pickup' // dirty laundry at the customer's door
  | 'cleaner_dropoff' // dirty laundry handed to the cleaner
  | 'cleaner_collect' // clean laundry picked up from the cleaner
  | 'customer_delivery'; // clean laundry delivered; charges the customer

export interface DriverStopOrder {
  id: string;
  order_number: string;
  customer_name: string;
  contents_label: string | null; // e.g. "2 poser · 1 sett sengetøy"
  // No money fields on purpose — the driver never touches payment (decision 5).
}

export interface DriverStop {
  id: string;
  type: DriverStopType;
  latitude: number | null;
  longitude: number | null;
  street: string;
  postal_code: string;
  city: string;
  contact_name: string;
  phone: string | null;
  special_instructions: string | null;
  orders: DriverStopOrder[];
  dependsOn: string[];
  /** True only for customer pickups later than their scheduled date (the date
   * the customer chose). NEVER derived from delivery_date — that's an estimate. */
  overdue: boolean;
  /** The order's delivery ESTIMATE (earliest in the group for cleaner stops).
   * Informational only — shown as "Estimert levering", never a gate. */
  estimated_delivery: string | null;
}

/**
 * Status transition performed when the driver completes a stop of each type.
 * customer_delivery is absent — it goes through completeDeliveredOrder.
 */
export const STOP_TRANSITIONS: Record<
  Exclude<DriverStopType, 'customer_delivery'>,
  { from: OrderStatus; to: OrderStatus }
> = {
  customer_pickup: { from: 'pickup_scheduled', to: 'picked_up' },
  cleaner_dropoff: { from: 'picked_up', to: 'in_cleaning' },
  cleaner_collect: { from: 'ready_for_delivery', to: 'out_for_delivery' },
};

/**
 * Reverse transitions for undoing a mistaken tap. customer_delivery is
 * deliberately absent — completing it charges the customer.
 */
export const STOP_UNDO_TRANSITIONS: Record<
  Exclude<DriverStopType, 'customer_delivery'>,
  { from: OrderStatus; to: OrderStatus }
> = {
  customer_pickup: { from: 'picked_up', to: 'pickup_scheduled' },
  cleaner_dropoff: { from: 'in_cleaning', to: 'picked_up' },
  cleaner_collect: { from: 'out_for_delivery', to: 'ready_for_delivery' },
};

function contentsLabel(estimate: CustomerEstimate | null): string | null {
  if (!estimate) return null;
  const parts: string[] = [];
  if (estimate.bags > 0) {
    parts.push(`${estimate.bags} ${estimate.bags === 1 ? 'pose' : 'poser'}`);
  }
  if (estimate.bedding_sets > 0) {
    parts.push(`${estimate.bedding_sets} sett sengetøy`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

function joinInstructions(...parts: Array<string | null>): string | null {
  const filtered = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return filtered.length > 0 ? filtered.join(' — ') : null;
}

/**
 * Build the driver's stops from today's route orders (already filtered to one
 * city by the caller). Orders in picked_up/ready_for_delivery without a
 * cleaner cannot be routed — their order numbers are returned for a warning.
 */
export function buildDriverStops(
  orders: DriverRouteOrder[],
  todayISO: string
): { stops: DriverStop[]; skippedOrderNumbers: string[] } {
  const stops: DriverStop[] = [];
  const skippedOrderNumbers: string[] = [];

  const toStopOrder = (order: DriverRouteOrder): DriverStopOrder => ({
    id: order.id,
    order_number: order.order_number,
    customer_name: order.customer.user.full_name,
    contents_label: contentsLabel(order.customer_estimate),
  });

  // Customer pickups
  for (const order of orders) {
    if (order.status !== 'pickup_scheduled') continue;
    stops.push({
      id: `pickup:${order.id}`,
      type: 'customer_pickup',
      latitude: order.latitude,
      longitude: order.longitude,
      street: order.street,
      postal_code: order.postal_code,
      city: order.city,
      contact_name: order.customer.user.full_name,
      phone: order.customer.user.phone || null,
      special_instructions: joinInstructions(
        order.special_instructions_address,
        order.special_instructions
      ),
      orders: [toStopOrder(order)],
      dependsOn: [],
      overdue: order.scheduled_date < todayISO,
      estimated_delivery: null,
    });
  }

  // Cleaner drop-offs — one stop per cleaner. Includes bags already in the van
  // (picked_up) AND today's still-uncollected pickups (pickup_scheduled), so
  // the full day plan is visible up front; the latter gate the stop via
  // dependsOn until their pickups are completed.
  const dropoffByCleaner = new Map<string, DriverRouteOrder[]>();
  for (const order of orders) {
    if (order.status !== 'pickup_scheduled' && order.status !== 'picked_up') continue;
    if (!order.cleaner || !order.cleaner_id) {
      if (order.status === 'picked_up') skippedOrderNumbers.push(order.order_number);
      continue;
    }
    const group = dropoffByCleaner.get(order.cleaner_id) ?? [];
    group.push(order);
    dropoffByCleaner.set(order.cleaner_id, group);
  }
  for (const [cleanerId, group] of dropoffByCleaner) {
    const cleaner = group[0].cleaner!;
    stops.push({
      id: `dropoff:${cleanerId}`,
      type: 'cleaner_dropoff',
      latitude: cleaner.latitude,
      longitude: cleaner.longitude,
      street: cleaner.base_street,
      postal_code: cleaner.base_postal_code,
      city: cleaner.base_city,
      contact_name: cleaner.display_name,
      phone: cleaner.user?.phone || null,
      special_instructions: cleaner.base_special_instructions,
      orders: group.map(toStopOrder),
      dependsOn: group
        .filter((order) => order.status === 'pickup_scheduled')
        .map((order) => `pickup:${order.id}`),
      overdue: false,
      estimated_delivery: null,
    });
  }

  // Cleaner collections — one stop per cleaner.
  const collectByCleaner = new Map<string, DriverRouteOrder[]>();
  for (const order of orders) {
    if (order.status !== 'ready_for_delivery') continue;
    if (!order.cleaner || !order.cleaner_id) {
      skippedOrderNumbers.push(order.order_number);
      continue;
    }
    const group = collectByCleaner.get(order.cleaner_id) ?? [];
    group.push(order);
    collectByCleaner.set(order.cleaner_id, group);
  }
  for (const [cleanerId, group] of collectByCleaner) {
    const cleaner = group[0].cleaner!;
    stops.push({
      id: `collect:${cleanerId}`,
      type: 'cleaner_collect',
      latitude: cleaner.latitude,
      longitude: cleaner.longitude,
      street: cleaner.base_street,
      postal_code: cleaner.base_postal_code,
      city: cleaner.base_city,
      contact_name: cleaner.display_name,
      phone: cleaner.user?.phone || null,
      special_instructions: cleaner.base_special_instructions,
      orders: group.map(toStopOrder),
      dependsOn: [],
      overdue: false,
      estimated_delivery: group.reduce(
        (min, order) => (order.delivery_date < min ? order.delivery_date : min),
        group[0].delivery_date
      ),
    });
  }

  // Customer deliveries
  for (const order of orders) {
    if (order.status !== 'ready_for_delivery' && order.status !== 'out_for_delivery') continue;
    // A ready order without a cleaner was already reported above and has no
    // collect stop to depend on — skip its delivery stop too.
    if (order.status === 'ready_for_delivery' && !order.cleaner_id) continue;
    stops.push({
      id: `delivery:${order.id}`,
      type: 'customer_delivery',
      latitude: order.latitude,
      longitude: order.longitude,
      street: order.street,
      postal_code: order.postal_code,
      city: order.city,
      contact_name: order.customer.user.full_name,
      phone: order.customer.user.phone || null,
      special_instructions: joinInstructions(
        order.special_instructions_address,
        order.special_instructions
      ),
      orders: [toStopOrder(order)],
      dependsOn:
        order.status === 'ready_for_delivery' ? [`collect:${order.cleaner_id}`] : [],
      overdue: false,
      estimated_delivery: order.delivery_date,
    });
  }

  return { stops, skippedOrderNumbers };
}
