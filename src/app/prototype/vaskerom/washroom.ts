// ─────────────────────────────────────────────────────────────────────────────
// Washroom helpers — PURE (no React, no I/O).
//
// Models the cleaning workflow as stages a laundry load moves through. It's a
// parallel process: many loads sit in different stages at once. Every stage is
// advanced manually by the cleaner — no machine limits, no timers.
//   Mottatt → Vask → Henger til tørk (air-dry) → Bretting/Stryk → Klar
// In the real version, loads map to `orders` and stage maps to `order.status`.
// ─────────────────────────────────────────────────────────────────────────────

export type Stage = 'mottatt' | 'vask' | 'tork' | 'bretting' | 'klar';

export interface LaundryLoad {
  id: string;
  order_number: string;
  customer_name: string;
  bags: number;
  needs_ironing: boolean;
  notes: string | null;
  stage: Stage;
}

export interface StageConfig {
  key: Stage;
  label: string;
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
  tork: 'Tørr – til bretting',
  bretting: 'Marker klar',
  klar: '',
};

export function loadsInStage(loads: LaundryLoad[], stage: Stage): LaundryLoad[] {
  return loads.filter((l) => l.stage === stage);
}
