// Human-readable (bokmål) labels for the cleaner onboarding select options.
// Single source for the onboarding forms, the confirm summary and the admin
// cleaner list, so labels can't drift.

import type { CleanerExperienceLevel, CleanerMachineCondition } from '@/types/database';

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
