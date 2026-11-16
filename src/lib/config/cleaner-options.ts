// Human-readable (bokmål) labels for the cleaner onboarding select options.
// Single source for the onboarding forms, the confirm summary and the admin
// cleaner list, so labels can't drift.

import type {
  CleanerExperienceLevel,
  CleanerMachineCondition,
  WeeklySchedule,
} from '@/types/database';

export const EXPERIENCE_LEVEL_OPTIONS: { value: CleanerExperienceLevel; label: string }[] = [
  { value: 'beginner', label: 'Nybegynner – jeg vasker mest for meg selv' },
  { value: 'some', label: 'Noe erfaring – 1–2 år' },
  { value: 'experienced', label: 'Erfaren – 3–5 år' },
  { value: 'expert', label: 'Ekspert – over 5 år' },
  { value: 'professional', label: 'Profesjonell – jeg driver eget vaskeri' },
];

export const MACHINE_CONDITION_OPTIONS: { value: CleanerMachineCondition; label: string }[] = [
  { value: 'excellent', label: 'Utmerket – som ny' },
  { value: 'very_good', label: 'Meget bra – minimal slitasje' },
  { value: 'good', label: 'Bra – normal slitasje' },
  { value: 'fair', label: 'Tilfredsstillende – noe synlig slitasje' },
];

export function experienceLevelLabel(value: CleanerExperienceLevel): string {
  return EXPERIENCE_LEVEL_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Accepts null because profiles created before machine data was stored have none. */
export function machineConditionLabel(value: CleanerMachineCondition | null): string {
  if (value === null) return '';
  return MACHINE_CONDITION_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/**
 * Weekday order and labels for every weekly_schedule UI: onboarding step 4,
 * the confirm summary, the settings page and the dashboard strip.
 * `label` is the full name for checkboxes, `short` the 3-letter form for
 * compact summaries.
 */
export const WEEKDAY_OPTIONS: { key: keyof WeeklySchedule; label: string; short: string }[] = [
  { key: 'mon', label: 'Mandag', short: 'Man' },
  { key: 'tue', label: 'Tirsdag', short: 'Tir' },
  { key: 'wed', label: 'Onsdag', short: 'Ons' },
  { key: 'thu', label: 'Torsdag', short: 'Tor' },
  { key: 'fri', label: 'Fredag', short: 'Fre' },
  { key: 'sat', label: 'Lørdag', short: 'Lør' },
  { key: 'sun', label: 'Søndag', short: 'Søn' },
];

/** Mon–Fri — the same as the cleaners.weekly_schedule column default. */
export const DEFAULT_WEEKLY_SCHEDULE: WeeklySchedule = {
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: false,
  sun: false,
};

/** "Alle dager", "Man, Tir, Ons" or "Ingen dager valgt" — for the dashboard strip and the confirm summary. */
export function formatActiveDays(schedule: WeeklySchedule): string {
  const active = WEEKDAY_OPTIONS.filter(({ key }) => schedule[key]).map(({ short }) => short);
  if (active.length === 7) return 'Alle dager';
  if (active.length === 0) return 'Ingen dager valgt';
  return active.join(', ');
}
