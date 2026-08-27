// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE / MOCK DATA ONLY — backs /prototype/vaskerom.
//
// The cleaner's order list at the start of the day, lined up with today's route
// (../kjoreplan/mockData.ts):
//   • Today's PICKUPS (Kari, Nora) have just been collected → "Mottatt",
//     prefilled from what each customer ordered, awaiting the cleaner.
//   • Two earlier pickups (Jonas, Selma) are "I arbeid" — Jonas shows the
//     edit case: the customer guessed one clothes load, the cleaner found two.
//   • Today's DELIVERIES (Ola, Lars, Per) are done & charged → "Klar til henting"
//     — that section IS the delivery queue on the route.
//
// No server, no auth, no DB. Delete the prototype folder to remove.
// ─────────────────────────────────────────────────────────────────────────────

import { type OrderContents, type OrderStatus, type WashOrder } from './washroom';

// Positional helper: (klesvask, sengetøy, vanlige plagg, skjorter/kjoler, sengetøy-stryk)
const contents = (
  washClothes = 0,
  washBedding = 0,
  ironEveryday = 0,
  ironFormal = 0,
  ironBedding = 0
): OrderContents => ({ washClothes, washBedding, ironEveryday, ironFormal, ironBedding });

interface OrderSeed {
  id: string;
  order_number: string;
  customer_name: string;
  notes: string | null;
  requested: OrderContents;
  status: OrderStatus;
  adjust?: Partial<OrderContents>; // cleaner's edits away from the customer's order
  charged_at?: string | null;
}

function makeOrder(s: OrderSeed): WashOrder {
  return {
    id: s.id,
    order_number: s.order_number,
    customer_name: s.customer_name,
    notes: s.notes,
    requested: s.requested,
    registered: { ...s.requested, ...(s.adjust ?? {}) },
    status: s.status,
    charged_at: s.charged_at ?? null,
  };
}

export const INITIAL_ORDERS: WashOrder[] = [
  // ── Mottatt: just picked up, prefilled from the customer order ──────────────
  makeOrder({
    id: '2052',
    order_number: 'NC-2052',
    customer_name: 'Kari Nilsen',
    notes: 'Ringeklokka virker ikke – ring på mobil.',
    requested: contents(2, 0, 5, 2, 0),
    status: 'mottatt',
  }),
  makeOrder({
    id: '2031',
    order_number: 'NC-2031',
    customer_name: 'Nora Wold',
    notes: 'Ull-plagg vaskes kaldt.',
    requested: contents(1, 1, 0, 0, 0),
    status: 'mottatt',
  }),

  // ── I arbeid: started; Jonas adjusted up from what the customer guessed ─────
  makeOrder({
    id: '2037',
    order_number: 'NC-2037',
    customer_name: 'Jonas Lie',
    notes: null,
    requested: contents(1, 1, 0, 0, 1),
    adjust: { washClothes: 2 },
    status: 'arbeid',
  }),
  makeOrder({
    id: '2044',
    order_number: 'NC-2044',
    customer_name: 'Selma Berg',
    notes: null,
    requested: contents(1, 0, 8, 0, 0),
    status: 'arbeid',
  }),

  // ── Klar til henting: done & charged — these are today's delivery stops ─────
  makeOrder({
    id: '2017',
    order_number: 'NC-2017',
    customer_name: 'Ola Hansen',
    notes: null,
    requested: contents(1, 0, 0, 0, 0),
    status: 'klar',
    charged_at: '08:20',
  }),
  makeOrder({
    id: '2009',
    order_number: 'NC-2009',
    customer_name: 'Lars Olsen',
    notes: null,
    requested: contents(2, 1, 0, 0, 0),
    status: 'klar',
    charged_at: '08:35',
  }),
  makeOrder({
    id: '2023',
    order_number: 'NC-2023',
    customer_name: 'Per Johansen',
    notes: null,
    requested: contents(1, 0, 3, 0, 0),
    status: 'klar',
    charged_at: '09:05',
  }),
];
