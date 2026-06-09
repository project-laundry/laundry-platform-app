// ─────────────────────────────────────────────────────────────────────────────
// Washroom helpers — PURE (no React, no I/O).
//
// Models the cleaning workflow as a set of stages a laundry load moves through.
// Unlike the route (sequential), this is parallel: many loads sit in different
// stages at once, and the machine stages (Vask/Tørk) run on a countdown.
// In the real version, loads map to `orders` and stage maps to `order.status`
// (picked_up → in_cleaning → ready_for_delivery …); machine state is local.
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
  // Machine state (only meaningful while stage is 'vask' or 'tork')
  machineLabel: string | null;
  remainingSec: number | null; // counts down; 0 = cycle finished; null = not in a machine
  totalSec: number | null; // full cycle length, for the progress bar
}

export interface StageConfig {
  key: Stage;
  label: string;
  kind: StageKind;
  capacity?: number; // machine count, for machine stages
  durationSec?: number; // default cycle length
  machineNames?: string[];
}

export const WASH_SEC = 45 * 60;
export const DRY_SEC = 60 * 60;

export const STAGES: StageConfig[] = [
  { key: 'mottatt', label: 'Mottatt', kind: 'queue' },
  {
    key: 'vask',
    label: 'Vask',
    kind: 'machine',
    capacity: 2,
    durationSec: WASH_SEC,
    machineNames: ['Vaskemaskin 1', 'Vaskemaskin 2'],
  },
  {
    key: 'tork',
    label: 'Tørk',
    kind: 'machine',
    capacity: 2,
    durationSec: DRY_SEC,
    machineNames: ['Tørketrommel 1', 'Tørketrommel 2'],
  },
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
  vask: 'Start tørk',
  tork: 'Til bretting',
  bretting: 'Marker klar',
  klar: '',
};

/** A load is "running" while its machine cycle is still counting down. */
export function isRunning(load: LaundryLoad): boolean {
  return load.remainingSec !== null && load.remainingSec > 0;
}

/** A load "needs action" when its machine cycle has finished but it's still inside. */
export function isFinished(load: LaundryLoad): boolean {
  return load.remainingSec === 0;
}

export function loadsInStage(loads: LaundryLoad[], stage: Stage): LaundryLoad[] {
  return loads.filter((l) => l.stage === stage);
}

/** How many machines are free in a machine stage right now. */
export function freeMachines(loads: LaundryLoad[], stage: Stage): number {
  const cfg = STAGE_BY_KEY[stage];
  if (cfg.kind !== 'machine' || cfg.capacity == null) return Infinity;
  return cfg.capacity - loadsInStage(loads, stage).length;
}

/** First unoccupied machine name in a stage, or null if all busy. */
export function pickFreeMachine(loads: LaundryLoad[], stage: Stage): string | null {
  const cfg = STAGE_BY_KEY[stage];
  if (!cfg.machineNames) return null;
  const used = new Set(
    loadsInStage(loads, stage).map((l) => l.machineLabel)
  );
  return cfg.machineNames.find((name) => !used.has(name)) ?? null;
}

/**
 * Whether a load can advance right now. Advancing INTO a machine stage requires
 * a free machine; everything else is always allowed. Returns a disabled reason
 * when blocked (shown on the button).
 */
export function advanceBlockedReason(
  load: LaundryLoad,
  loads: LaundryLoad[]
): string | null {
  const next = NEXT_STAGE[load.stage];
  if (!next) return null;
  const nextCfg = STAGE_BY_KEY[next];
  if (nextCfg.kind === 'machine' && freeMachines(loads, next) <= 0) {
    return nextCfg.label === 'Vask'
      ? 'Alle vaskemaskiner opptatt'
      : 'Alle tørketromler opptatt';
  }
  return null;
}

/** mm:ss for the countdown display. */
export function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
