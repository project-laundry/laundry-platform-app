import { describe, it, expect } from 'vitest';
import { COMPANY, formatOrgNumber, formatPostalAddress, phoneHref } from './company';

describe('COMPANY', () => {
  it('has a 9-digit organisasjonsnummer without spaces', () => {
    expect(COMPANY.orgNumber).toMatch(/^\d{9}$/);
  });

  it('has a Norwegian phone number: +47 followed by 8 digits once spaces are removed', () => {
    expect(COMPANY.phoneDisplay.replace(/\s/g, '')).toMatch(/^\+47\d{8}$/);
  });

  it('has a 4-digit postal code', () => {
    expect(COMPANY.address.postalCode).toMatch(/^\d{4}$/);
  });

  it('links social profiles over https, or not at all', () => {
    expect(COMPANY.instagramUrl).toMatch(/^https:\/\//);
    expect(COMPANY.facebookUrl === null || /^https:\/\//.test(COMPANY.facebookUrl)).toBe(true);
  });
});

describe('formatOrgNumber', () => {
  it('groups the digits in threes', () => {
    expect(formatOrgNumber('836788842')).toBe('836 788 842');
  });

  it('defaults to the configured org number', () => {
    expect(formatOrgNumber()).toBe(formatOrgNumber(COMPANY.orgNumber));
  });
});

describe('phoneHref', () => {
  it('strips the spaces so tapping the number dials exactly what is displayed', () => {
    expect(phoneHref('+47 976 16 468')).toBe('tel:+4797616468');
  });

  it('defaults to the configured phone', () => {
    expect(phoneHref()).toBe(phoneHref(COMPANY.phoneDisplay));
  });
});

describe('formatPostalAddress', () => {
  it('renders street, postal code and city on one line', () => {
    expect(
      formatPostalAddress({ street: 'Breimyra 232', postalCode: '5134', city: 'Flaktveit' })
    ).toBe('Breimyra 232, 5134 Flaktveit');
  });
});
