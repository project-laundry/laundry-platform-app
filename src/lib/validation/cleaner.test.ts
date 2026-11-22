import { describe, it, expect } from 'vitest';
import {
  bankAccountError,
  hasAnyWeekday,
  normalizeWeeklySchedule,
  stripNumberFormatting,
  taxIdError,
  validateNorwegianPhone,
  validateBankAccount,
  validateTaxId,
  validatePostalCode,
  validateYear,
} from './cleaner';

describe('validateNorwegianPhone', () => {
  it('accepts +47 followed by 8 digits', () => {
    expect(validateNorwegianPhone('+4712345678')).toBe(true);
    expect(validateNorwegianPhone('+47 123 45 678')).toBe(true); // spaces stripped
  });

  it('accepts a bare 8-digit number', () => {
    expect(validateNorwegianPhone('12345678')).toBe(true);
  });

  it('rejects wrong lengths or prefixes', () => {
    expect(validateNorwegianPhone('1234567')).toBe(false);
    expect(validateNorwegianPhone('+4712345')).toBe(false);
    expect(validateNorwegianPhone('+4612345678')).toBe(false);
    expect(validateNorwegianPhone('abcdefgh')).toBe(false);
  });
});

// MOD11 written independently of the implementation, so the tests do not
// just repeat the code under test. null = the check digit would be 10, i.e.
// no valid number starts with these digits.
function checkDigit(base: string, weights: number[]): number | null {
  const sum = base.split('').reduce((acc, digit, i) => acc + Number(digit) * weights[i], 0);
  const check = (11 - (sum % 11)) % 11;
  return check === 10 ? null : check;
}

const BANK_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
const ORG_WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];
const K1_WEIGHTS = [3, 7, 6, 1, 8, 9, 4, 5, 2];
const K2_WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

describe('stripNumberFormatting', () => {
  it('removes spaces and dots and nothing else', () => {
    expect(stripNumberFormatting('1234.56.78903')).toBe('12345678903');
    expect(stripNumberFormatting(' 836 788 842 ')).toBe('836788842');
    expect(stripNumberFormatting('1234-56-78903')).toBe('1234-56-78903');
  });
});

describe('validateBankAccount', () => {
  it('accepts an account number with the right check digit, ignoring spaces and dots', () => {
    expect(validateBankAccount('12345678903')).toBe(true);
    expect(validateBankAccount('1234 56 78903')).toBe(true);
    expect(validateBankAccount('1234.56.78903')).toBe(true);
  });

  it('accepts a check digit of 0', () => {
    expect(checkDigit('1234567897', BANK_WEIGHTS)).toBe(0);
    expect(validateBankAccount('12345678970')).toBe(true);
  });

  it('rejects a wrong check digit and swapped digits', () => {
    expect(validateBankAccount('12345678901')).toBe(false);
    expect(validateBankAccount('12345687903')).toBe(false); // 7 and 8 swapped
  });

  it('rejects every final digit when MOD11 has no check digit for the number', () => {
    expect(checkDigit('1234567813', BANK_WEIGHTS)).toBeNull();
    for (let digit = 0; digit <= 9; digit++) {
      expect(validateBankAccount(`1234567813${digit}`)).toBe(false);
    }
  });

  it('agrees with an independently computed check digit', () => {
    for (let n = 1234567800; n < 1234567860; n++) {
      const base = String(n);
      const check = checkDigit(base, BANK_WEIGHTS);
      for (let digit = 0; digit <= 9; digit++) {
        expect(validateBankAccount(`${base}${digit}`)).toBe(digit === check);
      }
    }
  });

  it('rejects wrong lengths and non-digits', () => {
    expect(validateBankAccount('1234567890')).toBe(false);
    expect(validateBankAccount('123456789033')).toBe(false);
    expect(validateBankAccount('1234567890a')).toBe(false);
    expect(validateBankAccount('')).toBe(false);
  });
});

describe('validateTaxId — organisasjonsnummer', () => {
  it('accepts real organisation numbers', () => {
    expect(validateTaxId('836788842', 'business')).toBe(true); // NooraCare AS (lib/config/company.ts)
    expect(validateTaxId('974760673', 'business')).toBe(true); // Brønnøysundregistrene
    expect(validateTaxId('923609016', 'business')).toBe(true); // Equinor ASA
    expect(validateTaxId('836 788 842', 'business')).toBe(true);
  });

  it('rejects a wrong check digit and swapped digits', () => {
    expect(validateTaxId('123456789', 'business')).toBe(false);
    expect(validateTaxId('836788824', 'business')).toBe(false); // last two swapped
  });

  it('rejects every final digit when MOD11 has no check digit for the number', () => {
    expect(checkDigit('12345684', ORG_WEIGHTS)).toBeNull();
    for (let digit = 0; digit <= 9; digit++) {
      expect(validateTaxId(`12345684${digit}`, 'business')).toBe(false);
    }
  });

  it('rejects wrong lengths', () => {
    expect(validateTaxId('12345678', 'business')).toBe(false);
    expect(validateTaxId('01819000553', 'business')).toBe(false);
  });
});

// Synthetic numbers only: month 81 (= January + 80) is Skatteetaten's range
// for test persons and can never belong to a real person.
describe('validateTaxId — fødselsnummer', () => {
  it('accepts a number with both control digits right', () => {
    expect(validateTaxId('01819000553', 'individual')).toBe(true);
    expect(validateTaxId('01819000200', 'individual')).toBe(true); // both control digits 0
    expect(validateTaxId('018190 00553', 'individual')).toBe(true);
  });

  it('rejects a wrong second control digit', () => {
    expect(validateTaxId('01819000554', 'individual')).toBe(false);
  });

  it('rejects a wrong first control digit even when the second one matches it', () => {
    // k1 should be 5; with k1 = 0 the matching k2 is 2.
    expect(checkDigit('0181900050', K2_WEIGHTS)).toBe(2);
    expect(validateTaxId('01819000502', 'individual')).toBe(false);
  });

  it('rejects every ending when the first control digit does not exist', () => {
    expect(checkDigit('018190008', K1_WEIGHTS)).toBeNull();
    for (let ending = 0; ending <= 99; ending++) {
      expect(validateTaxId(`018190008${String(ending).padStart(2, '0')}`, 'individual')).toBe(false);
    }
  });

  it('rejects every final digit when the second control digit does not exist', () => {
    expect(checkDigit('018190001', K1_WEIGHTS)).toBe(2);
    expect(checkDigit('0181900012', K2_WEIGHTS)).toBeNull();
    for (let digit = 0; digit <= 9; digit++) {
      expect(validateTaxId(`0181900012${digit}`, 'individual')).toBe(false);
    }
  });

  it('agrees with independently computed control digits', () => {
    for (let individ = 1; individ <= 60; individ++) {
      const base = `018190${String(individ).padStart(3, '0')}`;
      const k1 = checkDigit(base, K1_WEIGHTS);
      const k2 = k1 === null ? null : checkDigit(`${base}${k1}`, K2_WEIGHTS);
      for (let ending = 0; ending <= 99; ending++) {
        const expected = k1 !== null && k2 !== null && ending === k1 * 10 + k2;
        expect(validateTaxId(`${base}${String(ending).padStart(2, '0')}`, 'individual')).toBe(expected);
      }
    }
  });

  it('rejects wrong lengths', () => {
    expect(validateTaxId('0181900055', 'individual')).toBe(false);
    expect(validateTaxId('123456785', 'individual')).toBe(false);
  });
});

describe('bankAccountError', () => {
  it('returns null for a valid account number', () => {
    expect(bankAccountError('12345678903')).toBeNull();
    expect(bankAccountError('1234.56.78903')).toBeNull();
  });

  it('distinguishes a wrong length from a wrong check digit', () => {
    expect(bankAccountError('1234567890')).toBe('Kontonummer må være 11 siffer');
    expect(bankAccountError('')).toBe('Kontonummer må være 11 siffer');
    expect(bankAccountError('12345678901')).toBe(
      'Kontonummeret er ikke gyldig. Sjekk at du har skrevet det riktig.'
    );
  });
});

describe('taxIdError', () => {
  it('returns null for valid numbers', () => {
    expect(taxIdError('01819000553', 'individual')).toBeNull();
    expect(taxIdError('836788842', 'business')).toBeNull();
  });

  it('uses the fødselsnummer wording for individuals', () => {
    expect(taxIdError('123456789', 'individual')).toBe('Fødselsnummer må være 11 siffer');
    expect(taxIdError('01819000554', 'individual')).toBe(
      'Fødselsnummeret er ikke gyldig. Sjekk at du har skrevet det riktig.'
    );
  });

  it('uses the organisasjonsnummer wording for businesses', () => {
    expect(taxIdError('01819000553', 'business')).toBe('Organisasjonsnummer må være 9 siffer');
    expect(taxIdError('123456789', 'business')).toBe(
      'Organisasjonsnummeret er ikke gyldig. Sjekk at du har skrevet det riktig.'
    );
  });
});

describe('validatePostalCode', () => {
  it('requires exactly four digits', () => {
    expect(validatePostalCode('0150')).toBe(true);
    expect(validatePostalCode('150')).toBe(false);
  });
});

describe('validateYear', () => {
  it('accepts four-digit years within range', () => {
    expect(validateYear('1900')).toBe(true);
    expect(validateYear('2020')).toBe(true);
    expect(validateYear(String(new Date().getFullYear()))).toBe(true);
  });

  it('rejects out-of-range or malformed years', () => {
    expect(validateYear('1899')).toBe(false);
    expect(validateYear(String(new Date().getFullYear() + 1))).toBe(false);
    expect(validateYear('20')).toBe(false);
    expect(validateYear('abcd')).toBe(false);
  });
});

describe('normalizeWeeklySchedule', () => {
  it('coerces every key to a real boolean and drops unknown keys', () => {
    const result = normalizeWeeklySchedule({
      mon: true,
      tue: 'true',
      wed: 1,
      thu: undefined,
      sat: true,
      extra: true,
    } as unknown as Parameters<typeof normalizeWeeklySchedule>[0]);

    expect(result).toEqual({
      mon: true,
      tue: false,
      wed: false,
      thu: false,
      fri: false,
      sat: true,
      sun: false,
    });
    expect('extra' in result).toBe(false);
  });

  it('returns an all-false schedule for null or undefined input', () => {
    const allFalse = { mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false };
    expect(normalizeWeeklySchedule(null)).toEqual(allFalse);
    expect(normalizeWeeklySchedule(undefined)).toEqual(allFalse);
  });
});

describe('hasAnyWeekday', () => {
  it('is true when at least one day is selected and false otherwise', () => {
    expect(
      hasAnyWeekday({ mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: true })
    ).toBe(true);
    expect(
      hasAnyWeekday({ mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false })
    ).toBe(false);
  });
});
