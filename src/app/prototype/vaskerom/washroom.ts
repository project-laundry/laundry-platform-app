// ─────────────────────────────────────────────────────────────────────────────
// Washroom helpers — PURE (no React, no I/O).
//
// Models the cleaning workflow as stages a laundry load moves through. It's a
// parallel process: many loads sit in different stages at once.
//   • Vask is the only machine stage. The number of washing machines is
//     configurable (most cleaners have 1) and the wash duration is set per load
//     when starting, since it depends on the machine's program.
//   • Tørk is "henger til tørk" (air-dry) — no machine, no countdown; the cleaner
//     marks it done when dry.
// In the real version, loads map to `orders` and stage maps to `order.status`.
// ─────────────────────────────────────────────────────────────────────────────

export type Stage = 'mottatt' | 'vask' | 'tork' | 'bretting' | 'klar';

export type StageKind = 'queue' | 'machine' | 'manual' | 'done';

export interface LaundryLoad {
  id: string;
  order_number: string;
  customer_name: string;
  bags: number;
  needs_ironing: boolean;
  notes: string | null;
  stage: Stage;
  // Machine state (only meaningful while stage is 'vask')
  machineLabel: string | null;
  remainingSec: number | null; // counts down; 0 = cycle finished; null = not washing
  totalSec: number | null; // chosen program length, for the progress bar
}

export interface StageConfig {
  key: Stage;
  label: string;
  kind: StageKind;
}

export const DEFAULT_WASH_MIN = 60;
export const WASH_PRESETS_MIN = [30, 45, 60, 90];
export const MAX_WASHERS = 6;

export const STAGES: StageConfig[] = [
  { key: 'mottatt', label: 'Mottatt', kind: 'queue' },
  { key: 'vask', label: 'Vask', kind: 'machine' },
  { key: 'tork', label: 'Henger til tørk', kind: 'manual' },
  { key: 'bretting', label: 'Bretting / Stryk', kind: 'manual' },
  { key: 'klar', label: 'Klar til levering', kind: 'done' },
];

export const STAGE_BY_KEY: Record<Stage, StageConfig> = Object.fromEntries(
  STAGES.map((s) => [s.key, s])
) as Record<Stage, StageConfig>;

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

/** A load is "running" while its wash cycle is still counting down. */
export function isRunning(load: LaundryLoad): boolean {
  return load.remainingSec !== null && load.remainingSec > 0;
}

/** A load "needs action" when its wash finished but it's still in the machine. */
export function isFinished(load: LaundryLoad): boolean {
  return load.remainingSec === 0;
}

export function loadsInStage(loads: LaundryLoad[], stage: Stage): LaundryLoad[] {
  return loads.filter((l) => l.stage === stage);
}

/** Machine names for a given washer count ("Vaskemaskin" when there's only one). */
export function washerNames(count: number): string[] {
  if (count <= 1) return ['Vaskemaskin'];
  return Array.from({ length: count }, (_, i) => `Vaskemaskin ${i + 1}`);
}

export function washersInUse(loads: LaundryLoad[]): number {
  return loadsInStage(loads, 'vask').length;
}

export function freeWashers(loads: LaundryLoad[], count: number): number {
  return count - washersInUse(loads);
}

export function canStartWash(loads: LaundryLoad[], count: number): boolean {
  return freeWashers(loads, count) > 0;
}

/** First unoccupied washer name, or null if all busy. */
export function pickFreeWasher(loads: LaundryLoad[], count: number): string | null {
  const used = new Set(loadsInStage(loads, 'vask').map((l) => l.machineLabel));
  return washerNames(count).find((name) => !used.has(name)) ?? null;
}

/** mm:ss for the countdown display. */
export function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
