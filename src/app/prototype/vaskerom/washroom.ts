// ─────────────────────────────────────────────────────────────────────────────
// Washroom helpers — PURE (no React, no I/O).
//
// The unit of work is a WASH LOAD, not an order: one order can have several
// loads (e.g. a Hvitt bag and a Farge bag) that are washed separately and move
// through the stages independently. Each load advances manually — no machine
// limits, no timers.
//   Mottatt → Vask → Henger til tørk (air-dry) → Bretting/Stryk → Klar
// In the real version, an order maps to `orders` and its loads to a child table.
// ─────────────────────────────────────────────────────────────────────────────

export type Stage = 'mottatt' | 'vask' | 'tork' | 'bretting' | 'klar';

export type LoadType = 'Hvitt' | 'Farge' | 'Finvask' | 'Mørkt';

export interface WashLoad {
  id: string; // unique per wash load
  orderId: string; // groups loads belonging to the same order
  order_number: string;
  customer_name: string;
  loadType: LoadType;
  needs_ironing: boolean;
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

/** Colour dot for each wash-load type (Tailwind classes). */
export const LOAD_TYPE_DOT: Record<LoadType, string> = {
  Hvitt: 'bg-white border border-gray-300',
  Farge: 'bg-gradient-to-br from-pink-400 via-amber-400 to-sky-400',
  Finvask: 'bg-sky-400',
  Mørkt: 'bg-slate-600',
};

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
