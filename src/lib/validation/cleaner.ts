import type { WeeklySchedule } from '@/types/database';

/**
 * Validates Norwegian phone number format
 * Accepts: +47 followed by 8 digits, or just 8 digits
 */
export function validateNorwegianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');

  // Accept +47 followed by 8 digits
  if (cleaned.startsWith('+47')) {
    return /^\+47\d{8}$/.test(cleaned);
  }

  // Accept 8 digits
  return /^\d{8}$/.test(cleaned);
}

/**
 * Validates Norwegian bank account number
 * Must be exactly 11 digits
 */
export function validateBankAccount(account: string): boolean {
  const cleaned = account.replace(/\s/g, '');
  return /^\d{11}$/.test(cleaned);
}

/**
 * Validates tax ID based on business type
 * Individual: 11 digits (fødselsnummer)
 * Business: 9 digits (organisasjonsnummer)
 */
export function validateTaxId(id: string, type: 'individual' | 'business'): boolean {
  const cleaned = id.replace(/\s/g, '');

  if (type === 'individual') {
    return /^\d{11}$/.test(cleaned);
  }

  if (type === 'business') {
    return /^\d{9}$/.test(cleaned);
  }

  return false;
}

/**
 * Validates Norwegian postal code
 * Must be exactly 4 digits
 */
export function validatePostalCode(code: string): boolean {
  return /^\d{4}$/.test(code);
}

/**
 * Validates machine year
 * Must be 4 digits and in reasonable range (1900-2024)
 */
export function validateYear(year: string): boolean {
  if (!/^\d{4}$/.test(year)) {
    return false;
  }

  const yearNum = parseInt(year, 10);
  const currentYear = new Date().getFullYear();

  return yearNum >= 1900 && yearNum <= currentYear;
}

/**
 * Error shown when the tax id is already on another cleaner's row
 * (cleaners.tax_id is UNIQUE). Used by the step-1 pre-check in the business
 * form and by createCleanerProfileAction's fallback, so both say the same.
 */
export function taxIdTakenMessage(type: 'individual' | 'business'): string {
  return type === 'individual'
    ? 'Fødselsnummeret er allerede registrert på en annen renserkonto. Ta kontakt med oss hvis du mener dette er feil.'
    : 'Organisasjonsnummeret er allerede registrert på en annen renserkonto. Ta kontakt med oss hvis du mener dette er feil.';
}

/**
 * Rebuild a client-supplied weekly schedule key-by-key so extra/missing keys
 * never reach the jsonb column, and coerce every value to a real boolean.
 * Accepts anything (undefined, null, partial object) — a missing key is false.
 * Used by createCleanerProfileAction and updateCleanerSettingsAction.
 */
export function normalizeWeeklySchedule(
  input: Partial<Record<keyof WeeklySchedule, unknown>> | null | undefined
): WeeklySchedule {
  return {
    mon: input?.mon === true,
    tue: input?.tue === true,
    wed: input?.wed === true,
    thu: input?.thu === true,
    fri: input?.fri === true,
    sat: input?.sat === true,
    sun: input?.sun === true,
  };
}

/** True when at least one weekday is selected. */
export function hasAnyWeekday(schedule: WeeklySchedule): boolean {
  return Object.values(schedule).some(Boolean);
}

/**
 * Max length of the reason an admin writes when rejecting a cleaner
 * application (cleaners.rejection_reason, DB CHECK of the same size).
 * Shared by rejectCleanerAction and the admin textarea's maxLength.
 */
export const CLEANER_REJECTION_REASON_MAX = 500;
