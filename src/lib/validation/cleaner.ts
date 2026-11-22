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
 * Removes the formatting people type into number fields: spaces and dots
 * ('1234.56.78903', '836 788 842'). Letters and other characters are left
 * in place, so they still fail validation.
 */
export function stripNumberFormatting(value: string): string {
  return value.replace(/[\s.]/g, '');
}

const BANK_ACCOUNT_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const ORG_NUMBER_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];
const BIRTH_NUMBER_K1_WEIGHTS = [3, 7, 6, 1, 8, 9, 4, 5, 2];
const BIRTH_NUMBER_K2_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

/**
 * MOD11 check digit for the first `weights.length` digits of `digits`.
 * Returns null when the remainder is 1: the check digit would be 10, so no
 * valid number starts with those digits.
 */
function mod11CheckDigit(digits: string, weights: readonly number[]): number | null {
  let sum = 0;
  for (let i = 0; i < weights.length; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const remainder = sum % 11;
  if (remainder === 0) return 0;
  if (remainder === 1) return null;
  return 11 - remainder;
}

/**
 * Validates a Norwegian bank account number: 11 digits, the last one a
 * MOD11 check digit. Spaces and dots are ignored.
 */
export function validateBankAccount(account: string): boolean {
  const cleaned = stripNumberFormatting(account);
  if (!/^\d{11}$/.test(cleaned)) return false;
  return mod11CheckDigit(cleaned, BANK_ACCOUNT_WEIGHTS) === Number(cleaned[10]);
}

/** Organisasjonsnummer: 9 digits, the last one a MOD11 check digit. */
function isValidOrgNumber(cleaned: string): boolean {
  if (!/^\d{9}$/.test(cleaned)) return false;
  return mod11CheckDigit(cleaned, ORG_NUMBER_WEIGHTS) === Number(cleaned[8]);
}

/**
 * Fødselsnummer: 11 digits, the last two are MOD11 control digits (the
 * second one covers the first). Only the control digits are checked, not
 * the date: a D-number (day + 40) uses the same control digits and is valid.
 */
function isValidBirthNumber(cleaned: string): boolean {
  if (!/^\d{11}$/.test(cleaned)) return false;
  return (
    mod11CheckDigit(cleaned, BIRTH_NUMBER_K1_WEIGHTS) === Number(cleaned[9]) &&
    mod11CheckDigit(cleaned, BIRTH_NUMBER_K2_WEIGHTS) === Number(cleaned[10])
  );
}

/**
 * Validates tax ID based on business type
 * Individual: fødselsnummer (11 digits, two control digits)
 * Business: organisasjonsnummer (9 digits, one check digit)
 * Spaces and dots are ignored.
 */
export function validateTaxId(id: string, type: 'individual' | 'business'): boolean {
  const cleaned = stripNumberFormatting(id);

  if (type === 'individual') {
    return isValidBirthNumber(cleaned);
  }

  if (type === 'business') {
    return isValidOrgNumber(cleaned);
  }

  return false;
}

/**
 * The error to show for a bank account number, or null when it is valid.
 * Used by the onboarding business step, the cleaner settings form and both
 * server actions, so all four say the same.
 */
export function bankAccountError(account: string): string | null {
  if (!/^\d{11}$/.test(stripNumberFormatting(account))) {
    return 'Kontonummer må være 11 siffer';
  }
  if (!validateBankAccount(account)) {
    return 'Kontonummeret er ikke gyldig. Sjekk at du har skrevet det riktig.';
  }
  return null;
}

/**
 * The error to show for a fødselsnummer (individual) or organisasjonsnummer
 * (business), or null when it is valid. Used by the onboarding business step
 * and createCleanerProfileAction.
 */
export function taxIdError(id: string, type: 'individual' | 'business'): string | null {
  const cleaned = stripNumberFormatting(id);

  if (type === 'individual') {
    if (!/^\d{11}$/.test(cleaned)) return 'Fødselsnummer må være 11 siffer';
    return validateTaxId(cleaned, type)
      ? null
      : 'Fødselsnummeret er ikke gyldig. Sjekk at du har skrevet det riktig.';
  }

  if (!/^\d{9}$/.test(cleaned)) return 'Organisasjonsnummer må være 9 siffer';
  return validateTaxId(cleaned, type)
    ? null
    : 'Organisasjonsnummeret er ikke gyldig. Sjekk at du har skrevet det riktig.';
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
