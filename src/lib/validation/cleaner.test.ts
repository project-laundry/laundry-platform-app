import { describe, it, expect } from 'vitest';
import {
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

describe('validateBankAccount', () => {
  it('accepts exactly 11 digits, ignoring spaces', () => {
    expect(validateBankAccount('12345678901')).toBe(true);
    expect(validateBankAccount('1234 56 78901')).toBe(true);
  });

  it('rejects non-11-digit input', () => {
    expect(validateBankAccount('1234567890')).toBe(false);
    expect(validateBankAccount('123456789012')).toBe(false);
  });
});

describe('validateTaxId', () => {
  it('accepts 11 digits for individuals', () => {
    expect(validateTaxId('12345678901', 'individual')).toBe(true);
    expect(validateTaxId('123456789', 'individual')).toBe(false);
  });

  it('accepts 9 digits for businesses', () => {
    expect(validateTaxId('123456789', 'business')).toBe(true);
    expect(validateTaxId('12345678901', 'business')).toBe(false);
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
