// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE / MOCK DATA ONLY
//
// This file backs the "Dagens kjøreplan" UX prototype at /prototype/kjoreplan.
// It is intentionally self-contained: no Supabase, no server actions, no auth.
// In the real version this is replaced by a query for today's
//   - pickups:    orders where status = 'pickup_scheduled'    and scheduled_date = today
//   - deliveries: orders where status = 'ready_for_delivery'  and delivery_date  = today
// for the logged-in cleaner. Field names mirror `Order` in types/database.ts so
// the UI and route helpers carry over unchanged.
//
// Consistent with the Vaskerom board (../vaskerom/mockData.ts): today's delivery
// stops (Ola, Lars, Per) are exactly the orders sitting in its "Klar til
// levering" column. Today's pickups aren't on the board yet — they're collected
// on this route.
// ─────────────────────────────────────────────────────────────────────────────

import type { Coord } from './routeUtils';

export type StopType = 'pickup' | 'delivery';

export interface RouteStop extends Coord {
  id: string;
  type: StopType;
  order_number: string;
  customer_name: string;
  phone: string; // for the one-tap "Ring" action (mock)
  // Address (mirrors Order: pickup = delivery address)
  street: string;
  postal_code: string;
  city: string;
  special_instructions: string | null;
}

/**
 * Where the cleaner starts their route (their home / base address).
 * In the real version this comes from the `cleaners` row (latitude/longitude).
 */
export const MOCK_CLEANER_START: Coord & { label: string } = {
  label: 'Nøstegaten 58, Bergen',
  latitude: 60.394,
  longitude: 5.317,
};

/**
 * Mock stops for one day's route — real Bergen addresses with real coordinates
 * so the optimized order and the Google Maps link are geographically sensible.
 */
export const MOCK_STOPS: RouteStop[] = [
  {
    id: '1',
    type: 'pickup',
    order_number: 'NC-2041',
    customer_name: 'Kari Nordmann',
    phone: '+47 412 34 567',
    street: 'Fjøsangerveien 12',
    postal_code: '5054',
    city: 'Bergen',
    special_instructions: 'Ring på når du kommer – posene står i gangen.',
    latitude: 60.3686,
    longitude: 5.338,
  },
  {
    id: '2',
    type: 'delivery',
    order_number: 'NC-2017',
    customer_name: 'Ola Hansen',
    phone: '+47 901 22 333',
    street: 'Møllendalsveien 4',
    postal_code: '5009',
    city: 'Bergen',
    special_instructions: null,
    latitude: 60.3766,
    longitude: 5.349,
  },
  {
    id: '3',
    type: 'pickup',
    order_number: 'NC-2048',
    customer_name: 'Ingrid Berg',
    phone: '+47 988 11 220',
    street: 'Nygårdsgaten 30',
    postal_code: '5008',
    city: 'Bergen',
    special_instructions: null,
    latitude: 60.385,
    longitude: 5.327,
  },
  {
    id: '4',
    type: 'delivery',
    order_number: 'NC-2009',
    customer_name: 'Lars Olsen',
    phone: '+47 456 78 901',
    street: 'Sandviksveien 26',
    postal_code: '5035',
    city: 'Bergen',
    special_instructions: 'Leveres til naboen i 2. etasje hvis ikke hjemme.',
    latitude: 60.408,
    longitude: 5.322,
  },
  {
    id: '5',
    type: 'pickup',
    order_number: 'NC-2052',
    customer_name: 'Mette Larsen',
    phone: '+47 922 33 144',
    street: 'Landåsveien 15',
    postal_code: '5097',
    city: 'Bergen',
    special_instructions: 'Kode på porten: 1934.',
    latitude: 60.359,
    longitude: 5.365,
  },
  {
    id: '6',
    type: 'delivery',
    order_number: 'NC-2023',
    customer_name: 'Per Johansen',
    phone: '+47 478 55 012',
    street: 'Kong Oscars gate 45',
    postal_code: '5017',
    city: 'Bergen',
    special_instructions: null,
    latitude: 60.3935,
    longitude: 5.33,
  },
];
