// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE / MOCK DATA ONLY — backs /prototype/vaskerom.
//
// A mid-shift snapshot with loads spread across every stage, to show the
// parallel board. No server, no auth, no DB. Field names echo `Order`.
// Delete the prototype folder to remove.
// ─────────────────────────────────────────────────────────────────────────────

import { type LaundryLoad } from './washroom';

export const INITIAL_LOADS: LaundryLoad[] = [
  {
    id: '1',
    order_number: 'NC-2041',
    customer_name: 'Kari Nordmann',
    bags: 2,
    needs_ironing: false,
    notes: 'Ull-plagg vaskes kaldt.',
    stage: 'mottatt',
  },
  {
    id: '2',
    order_number: 'NC-2052',
    customer_name: 'Mette Larsen',
    bags: 1,
    needs_ironing: true,
    notes: null,
    stage: 'mottatt',
  },
  {
    id: '3',
    order_number: 'NC-2017',
    customer_name: 'Ola Hansen',
    bags: 3,
    needs_ironing: false,
    notes: null,
    stage: 'vask',
  },
  {
    id: '4',
    order_number: 'NC-2009',
    customer_name: 'Lars Olsen',
    bags: 4,
    needs_ironing: true,
    notes: 'Henges luftig – tar tid å tørke.',
    stage: 'tork',
  },
  {
    id: '5',
    order_number: 'NC-2048',
    customer_name: 'Ingrid Berg',
    bags: 2,
    needs_ironing: false,
    notes: null,
    stage: 'bretting',
  },
  {
    id: '6',
    order_number: 'NC-2023',
    customer_name: 'Per Johansen',
    bags: 2,
    needs_ironing: true,
    notes: null,
    stage: 'klar',
  },
];
