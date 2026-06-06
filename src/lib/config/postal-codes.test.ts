import { describe, it, expect } from 'vitest';
import {
  getCityFromPostalCode,
  isPostalCodeInServiceArea,
  isValidPostalCodeFormat,
} from './postal-codes';

describe('getCityFromPostalCode', () => {
  it('maps Oslo postal codes', () => {
    expect(getCityFromPostalCode('0001')).toBe('Oslo');
    expect(getCityFromPostalCode('0150')).toBe('Oslo'); // leading zero
    expect(getCityFromPostalCode('1299')).toBe('Oslo'); // upper bound
  });

  it('maps both Bergen ranges', () => {
    expect(getCityFromPostalCode('5000')).toBe('Bergen');
    expect(getCityFromPostalCode('5399')).toBe('Bergen');
    expect(getCityFromPostalCode('5802')).toBe('Bergen');
    expect(getCityFromPostalCode('5899')).toBe('Bergen');
  });

  it('returns null for codes in the gap between Bergen ranges', () => {
    expect(getCityFromPostalCode('5400')).toBeNull();
    expect(getCityFromPostalCode('5801')).toBeNull();
  });

  it('returns null outside any service area', () => {
    expect(getCityFromPostalCode('1300')).toBeNull();
    expect(getCityFromPostalCode('9999')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(getCityFromPostalCode('abcd')).toBeNull();
    expect(getCityFromPostalCode('')).toBeNull();
  });
});

describe('isPostalCodeInServiceArea', () => {
  it('is true within a service area and false outside', () => {
    expect(isPostalCodeInServiceArea('0150')).toBe(true);
    expect(isPostalCodeInServiceArea('9999')).toBe(false);
  });
});

describe('isValidPostalCodeFormat', () => {
  it('accepts exactly four digits', () => {
    expect(isValidPostalCodeFormat('0150')).toBe(true);
  });

  it('rejects anything that is not four digits', () => {
    expect(isValidPostalCodeFormat('150')).toBe(false);
    expect(isValidPostalCodeFormat('01500')).toBe(false);
    expect(isValidPostalCodeFormat('015a')).toBe(false);
  });
});
