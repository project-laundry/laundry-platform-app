// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE / MOCK DATA ONLY — backs /prototype/vaskerom.
//
// Wash loads grouped by order. Note NC-2017 (Ola): its Farge load is washing
// while its Hvitt load already hangs to dry — one order, two loads, two stages.
// No server, no auth, no DB. Delete the prototype folder to remove.
// ─────────────────────────────────────────────────────────────────────────────

import { type WashLoad } from './washroom';

export const INITIAL_LOADS: WashLoad[] = [
  // NC-2041 Kari — two loads, both waiting
  {
    id: '2041-h',
    orderId: '2041',
    order_number: 'NC-2041',
    customer_name: 'Kari Nordmann',
    loadType: 'Hvitt',
    needs_ironing: false,
    notes: null,
    stage: 'mottatt',
  },
  {
    id: '2041-k',
    orderId: '2041',
    order_number: 'NC-2041',
    customer_name: 'Kari Nordmann',
    loadType: 'Farge',
    needs_ironing: false,
    notes: 'Ull-plagg vaskes kaldt.',
    stage: 'mottatt',
  },
  // NC-2017 Ola — Farge washing, Hvitt already hanging to dry
  {
    id: '2017-k',
    orderId: '2017',
    order_number: 'NC-2017',
    customer_name: 'Ola Hansen',
    loadType: 'Farge',
    needs_ironing: false,
    notes: null,
    stage: 'vask',
  },
  {
    id: '2017-h',
    orderId: '2017',
    order_number: 'NC-2017',
    customer_name: 'Ola Hansen',
    loadType: 'Hvitt',
    needs_ironing: true,
    notes: 'Henges luftig – tar tid å tørke.',
    stage: 'tork',
  },
  // NC-2052 Mette — single finvask load, being folded/ironed
  {
    id: '2052-f',
    orderId: '2052',
    order_number: 'NC-2052',
    customer_name: 'Mette Larsen',
    loadType: 'Finvask',
    needs_ironing: true,
    notes: null,
    stage: 'bretting',
  },
  // NC-2023 Per — single load, ready
  {
    id: '2023-h',
    orderId: '2023',
    order_number: 'NC-2023',
    customer_name: 'Per Johansen',
    loadType: 'Hvitt',
    needs_ironing: true,
    notes: null,
    stage: 'klar',
  },
];
