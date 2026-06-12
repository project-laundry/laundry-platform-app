// ─────────────────────────────────────────────────────────────────────────────
// Washroom helpers — PURE (no React, no I/O).
//
// The unit of work is a WASH LOAD, not an order: one order can have several
// loads (e.g. a clothes load and a bedding load) that are washed separately and
// move through the stages independently. Each load advances manually — no
// machine limits, no timers.
//
// Loads mirror what the customer actually orders — clothes ("Klær") and bedding
// ("Sengetøy", always its own wash). We do NOT track colour (whites vs darks):
// the order flow never asks, so sorting is the cleaner's own call at the machine.
//   Mottatt → Vask → Henger til tørk (air-dry) → Bretting/Stryk → Klar
// In the real version, an order maps to `orders` and its loads to a child table.
// ─────────────────────────────────────────────────────────────────────────────

export type Stage = 'mottatt' | 'vask' | 'tork' | 'bretting' | 'klar';

export type LoadType = 'Klær' | 'Sengetøy';

export interface WashLoad {
  id: string; // unique per wash load
  orderId: string; // groups loads belonging to the same order
  order_number: string;
  customer_name: string;
  loadType: LoadType;
  notes: string | null;
  stage: Stage;
}

export interface StageConfig {
  key: Stage;
  label: string;
}

/** Loads of one order that currently sit in the same stage. */
export interface OrderGroup {
  orderId: string;
  order_number: string;
  customer_name: string;
  loads: WashLoad[];
}

export const STAGES: StageConfig[] = [
  { key: 'mottatt', label: 'Mottatt' },
  { key: 'vask', label: 'Vask' },
  { key: 'tork', label: 'Henger til tørk' },
  { key: 'bretting', label: 'Bretting / Stryk' },
  { key: 'klar', label: 'Klar til levering' },
];

/** Forward transition for each stage (null = terminal). */
export const NEXT_STAGE: Record<Stage, Stage | null> = {
  mottatt: 'vask',
  vask: 'tork',
  tork: 'bretting',
  bretting: 'klar',
  klar: null,
};

/** Label for the button that advances a load out of its current stage. */
export const ADVANCE_LABEL: Record<Stage, string> = {
  mottatt: 'Start vask',
  vask: 'Heng til tørk',
  tork: 'Til bretting',
  bretting: 'Marker klar',
  klar: '',
};

export function loadsInStage(loads: WashLoad[], stage: Stage): WashLoad[] {
  return loads.filter((l) => l.stage === stage);
}

/** Group loads by order, preserving first-seen order. */
export function groupByOrder(loads: WashLoad[]): OrderGroup[] {
  const groups = new Map<string, OrderGroup>();
  for (const load of loads) {
    let group = groups.get(load.orderId);
    if (!group) {
      group = {
        orderId: load.orderId,
        order_number: load.order_number,
        customer_name: load.customer_name,
        loads: [],
      };
      groups.set(load.orderId, group);
    }
    group.loads.push(load);
  }
  return [...groups.values()];
}
