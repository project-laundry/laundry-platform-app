// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE / MOCK DATA ONLY — backs /prototype/vaskerom.
//
// The board models the cleaner's WIP at the start of the day, and it lines up
// with today's route (../kjoreplan/mockData.ts) instead of contradicting it:
//   • Today's PICKUPS (Kari, Ingrid, Mette) aren't here yet — they enter the
//     board as "Mottatt" only once collected, so they're absent for now.
//   • Today's DELIVERIES (Ola, Lars, Per) are finished, so they sit in the
//     "Klar til levering" column — that column IS the delivery queue.
//   • The in-process loads (Mottatt→Bretting) belong to EARLIER pickups that
//     aren't on today's route (Nora, Jonas, Selma).
//
// Jonas (NC-2037) is the parallel-stage example: his bedding load is washing
// while his clothes load already hangs to dry — one order, two loads, two stages.
// No server, no auth, no DB. Delete the prototype folder to remove.
// ─────────────────────────────────────────────────────────────────────────────

import { type WashLoad } from './washroom';

export const INITIAL_LOADS: WashLoad[] = [
  // ── In-process: earlier pickups, not on today's route ──────────────────────

  // NC-2031 Nora — clothes + bedding, both just received
  {
    id: '2031-c',
    orderId: '2031',
    order_number: 'NC-2031',
    customer_name: 'Nora Wold',
    loadType: 'Klær',
    notes: 'Ull-plagg vaskes kaldt.',
    stage: 'mottatt',
  },
  {
    id: '2031-s',
    orderId: '2031',
    order_number: 'NC-2031',
    customer_name: 'Nora Wold',
    loadType: 'Sengetøy',
    notes: null,
    stage: 'mottatt',
  },
  // NC-2037 Jonas — bedding washing, clothes already hanging to dry
  {
    id: '2037-s',
    orderId: '2037',
    order_number: 'NC-2037',
    customer_name: 'Jonas Lie',
    loadType: 'Sengetøy',
    notes: null,
    stage: 'vask',
  },
  {
    id: '2037-c',
    orderId: '2037',
    order_number: 'NC-2037',
    customer_name: 'Jonas Lie',
    loadType: 'Klær',
    notes: 'Henges luftig – tar tid å tørke.',
    stage: 'tork',
  },
  // NC-2044 Selma — single clothes load, being folded/ironed
  {
    id: '2044-c',
    orderId: '2044',
    order_number: 'NC-2044',
    customer_name: 'Selma Berg',
    loadType: 'Klær',
    notes: null,
    stage: 'bretting',
  },

  // ── Klar til levering: these ARE today's delivery stops on the route ────────

  // NC-2017 Ola — delivery today (matches Kjøreplan stop)
  {
    id: '2017-c',
    orderId: '2017',
    order_number: 'NC-2017',
    customer_name: 'Ola Hansen',
    loadType: 'Klær',
    notes: null,
    stage: 'klar',
  },
  // NC-2009 Lars — delivery today (matches Kjøreplan stop)
  {
    id: '2009-c',
    orderId: '2009',
    order_number: 'NC-2009',
    customer_name: 'Lars Olsen',
    loadType: 'Klær',
    notes: null,
    stage: 'klar',
  },
  // NC-2023 Per — delivery today (matches Kjøreplan stop)
  {
    id: '2023-c',
    orderId: '2023',
    order_number: 'NC-2023',
    customer_name: 'Per Johansen',
    loadType: 'Klær',
    notes: null,
    stage: 'klar',
  },
];
