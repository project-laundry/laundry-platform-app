// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE / MOCK DATA ONLY — backs /prototype/vaskerom.
//
// A realistic mid-shift snapshot for a cleaner with ONE washing machine:
//   • The washer is busy (cycle finishing in ~15s → triggers the "needs action"
//     flow), so queued loads can't start until it's free — shows the constraint.
//   • One load hanging to dry, one being folded, one ready.
// No server, no auth, no DB. Field names echo `Order`. Delete the folder to remove.
// ─────────────────────────────────────────────────────────────────────────────

import { type LaundryLoad } from './washroom';

export const DEFAULT_WASHER_COUNT = 1;

export const INITIAL_LOADS: LaundryLoad[] = [
  {
    id: '1',
    order_number: 'NC-2041',
    customer_name: 'Kari Nordmann',
    bags: 2,
    needs_ironing: false,
    notes: 'Ull-plagg vaskes kaldt.',
    stage: 'mottatt',
    machineLabel: null,
    remainingSec: null,
    totalSec: null,
  },
  {
    id: '2',
    order_number: 'NC-2052',
    customer_name: 'Mette Larsen',
    bags: 1,
    needs_ironing: true,
    notes: null,
    stage: 'mottatt',
    machineLabel: null,
    remainingSec: null,
    totalSec: null,
  },
  {
    id: '3',
    order_number: 'NC-2017',
    customer_name: 'Ola Hansen',
    bags: 3,
    needs_ironing: false,
    notes: null,
    stage: 'vask',
    machineLabel: 'Vaskemaskin',
    remainingSec: 15, // about to finish — shows the alert flow live during a test
    totalSec: 60 * 60, // started on a 60-min program
  },
  {
    id: '4',
    order_number: 'NC-2009',
    customer_name: 'Lars Olsen',
    bags: 4,
    needs_ironing: true,
    notes: 'Henges luftig – tar tid å tørke.',
    stage: 'tork',
    machineLabel: null,
    remainingSec: null,
    totalSec: null,
  },
  {
    id: '5',
    order_number: 'NC-2048',
    customer_name: 'Ingrid Berg',
    bags: 2,
    needs_ironing: false,
    notes: null,
    stage: 'bretting',
    machineLabel: null,
    remainingSec: null,
    totalSec: null,
  },
  {
    id: '6',
    order_number: 'NC-2023',
    customer_name: 'Per Johansen',
    bags: 2,
    needs_ironing: true,
    notes: null,
    stage: 'klar',
    machineLabel: null,
    remainingSec: null,
    totalSec: null,
  },
];
