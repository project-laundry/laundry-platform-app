import { describe, it, expect } from 'vitest';
import { cleanEmailPreferences, wantsEmail } from './email-preferences';

const ALL_OPTIONAL = {
  cleaner_confirmed: true,
  pickup_reminder: false,
  picked_up: true,
  delivered: true,
  evaluation: false,
};

describe('wantsEmail', () => {
  it('always sends a kind that cannot be turned off, whatever is stored', () => {
    expect(wantsEmail({ order_confirmation: false, price_receipt: false }, 'order_confirmation')).toBe(true);
    expect(wantsEmail({ price_receipt: false }, 'price_receipt')).toBe(true);
  });

  it('sends an optional kind when nothing or true is stored', () => {
    expect(wantsEmail({}, 'delivered')).toBe(true);
    expect(wantsEmail(null, 'delivered')).toBe(true);
    expect(wantsEmail(undefined, 'delivered')).toBe(true);
    expect(wantsEmail({ delivered: true }, 'delivered')).toBe(true);
  });

  it('skips an optional kind stored as false', () => {
    expect(wantsEmail({ delivered: false }, 'delivered')).toBe(false);
  });
});

describe('cleanEmailPreferences', () => {
  it('returns exactly the five optional keys and drops everything else', () => {
    const result = cleanEmailPreferences({ ...ALL_OPTIONAL, order_confirmation: false, bogus: true });

    expect(result).toEqual(ALL_OPTIONAL);
    expect(Object.keys(result ?? {})).toHaveLength(5);
  });

  it('returns null when an optional kind is missing', () => {
    const { evaluation, ...rest } = ALL_OPTIONAL;
    void evaluation;
    expect(cleanEmailPreferences(rest)).toBeNull();
  });

  it('returns null when a value is not a boolean', () => {
    expect(cleanEmailPreferences({ ...ALL_OPTIONAL, delivered: 'yes' })).toBeNull();
  });

  it('returns null for a non-object', () => {
    expect(cleanEmailPreferences(null)).toBeNull();
    expect(cleanEmailPreferences('x')).toBeNull();
    expect(cleanEmailPreferences([true])).toBeNull();
    expect(cleanEmailPreferences(undefined)).toBeNull();
  });
});
