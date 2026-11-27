import { describe, it, expect } from 'vitest';
import {
  DELIVERY_IF_ABSENT_OPTIONS,
  DELIVERY_INSTRUCTIONS_MAX_LENGTH,
  deliveryCleanerText,
  deliveryEmailSentence,
  deliveryIfAbsentLabel,
  deliveryInputError,
  isDeliveryIfAbsent,
} from './delivery';

describe('isDeliveryIfAbsent', () => {
  it('accepts exactly the two stored values', () => {
    expect(isDeliveryIfAbsent('leave_at_door')).toBe(true);
    expect(isDeliveryIfAbsent('call_customer')).toBe(true);
    expect(DELIVERY_IF_ABSENT_OPTIONS.map((option) => option.value)).toEqual([
      'leave_at_door',
      'call_customer',
    ]);
  });

  it.each([undefined, null, '', 'neighbour', 1, true, {}])('rejects %j', (value) => {
    expect(isDeliveryIfAbsent(value)).toBe(false);
  });
});

describe('deliveryInputError', () => {
  it('accepts a valid choice with no note, an empty note and a note at the limit', () => {
    expect(deliveryInputError('leave_at_door', undefined)).toBeNull();
    expect(deliveryInputError('call_customer', '')).toBeNull();
    expect(deliveryInputError('call_customer', 'x'.repeat(DELIVERY_INSTRUCTIONS_MAX_LENGTH))).toBeNull();
  });

  it('requires a choice', () => {
    expect(deliveryInputError(undefined, undefined)).toBe(
      'Velg hva vi gjør hvis du ikke er hjemme ved levering'
    );
    expect(deliveryInputError('neighbour', undefined)).toBe(
      'Velg hva vi gjør hvis du ikke er hjemme ved levering'
    );
  });

  it('rejects a too-long or non-string note', () => {
    expect(deliveryInputError('leave_at_door', 'x'.repeat(DELIVERY_INSTRUCTIONS_MAX_LENGTH + 1))).toBe(
      'Beskjed om levering kan ikke være mer enn 500 tegn'
    );
    expect(deliveryInputError('leave_at_door', 42)).toBe(
      'Beskjed om levering kan ikke være mer enn 500 tegn'
    );
  });
});

describe('delivery texts', () => {
  it('labels the choice for the customer, with a fallback when there is none', () => {
    expect(deliveryIfAbsentLabel('leave_at_door')).toBe('Sett tøyet utenfor døra');
    expect(deliveryIfAbsentLabel('call_customer')).toBe('Ring meg, så avtaler vi levering');
    expect(deliveryIfAbsentLabel(null)).toBe('Ikke valgt');
    expect(deliveryIfAbsentLabel(undefined)).toBe('Ikke valgt');
  });

  it('tells the cleaner what to do, and to call first when the customer never chose', () => {
    expect(deliveryCleanerText('leave_at_door')).toBe('Sett tøyet utenfor døra.');
    expect(deliveryCleanerText('call_customer')).toBe(
      'Ring kunden og avtal levering. Ikke sett tøyet igjen uten avtale.'
    );
    expect(deliveryCleanerText(null)).toBe(
      'Kunden har ikke valgt hva som skal skje hvis ingen er hjemme. Ring kunden før du setter tøyet igjen.'
    );
  });

  it('has one e-mail sentence per choice', () => {
    expect(deliveryEmailSentence('leave_at_door')).toContain('setter renseren tøyet utenfor døra');
    expect(deliveryEmailSentence('call_customer')).toContain('ringer renseren deg');
  });
});
