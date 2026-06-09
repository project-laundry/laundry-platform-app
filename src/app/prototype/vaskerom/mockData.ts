// ─────────────────────────────────────────────────────────────────────────────
// PROTOTYPE / MOCK DATA ONLY — backs /prototype/vaskerom.
//
// A realistic mid-shift snapshot, chosen to demo the parallel workflow:
//   • Both washers busy (one finishing in ~15s → triggers the "needs action" flow)
//   • One dryer running, one free
//   • A load waiting in queue, one being folded
// No server, no auth, no DB. Field names echo `Order`. Delete the folder to remove.
// ─────────────────────────────────────────────────────────────────────────────

import { DRY_SEC, WASH_SEC, type LaundryLoad } from './washroom';

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
    machineLabel: 'Vaskemaskin 1',
    remainingSec: 15, // about to finish — shows the alert flow live during a test
    totalSec: WASH_SEC,
  },
  {
    id: '4',
    order_number: 'NC-2048',
    customer_name: 'Ingrid Berg',
    bags: 2,
    needs_ironing: false,
    notes: null,
    stage: 'vask',
    machineLabel: 'Vaskemaskin 2',
    remainingSec: 25 * 60,
    totalSec: WASH_SEC,
  },
  {
    id: '5',
    order_number: 'NC-2009',
    customer_name: 'Lars Olsen',
    bags: 4,
    needs_ironing: true,
    notes: 'Stryk skjortene på medium varme.',
    stage: 'tork',
    machineLabel: 'Tørketrommel 1',
    remainingSec: 12 * 60,
    totalSec: DRY_SEC,
  },
  {
    id: '6',
    order_number: 'NC-2023',
    customer_name: 'Per Johansen',
    bags: 2,
    needs_ironing: true,
    notes: null,
    stage: 'bretting',
    machineLabel: null,
    remainingSec: null,
    totalSec: null,
  },
];
