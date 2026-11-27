import { describe, it, expect } from 'vitest';
import {
  DELIVERY_IF_ABSENT_OPTIONS,
  DELIVERY_INSTRUCTIONS_MAX_LENGTH,
  deliveryCleanerText,
  deliveryEmailSentence,
  deliveryIfAbsentLabel,
  deliveryInputError,
  deliveryNote,
  isDeliveryIfAbsent,
} from './delivery';

describe('isDeliveryIfAbsent', () => {
  it('accepts exactly the two stored values', () => {
    expect(isDeliveryIfAbsent('leave_at_door')).toBe(true);
    expect(isDeliveryIfAbsent('other')).toBe(true);
    expect(DELIVERY_IF_ABSENT_OPTIONS.map((option) => option.value)).toEqual([
      'leave_at_door',
      'other',
    ]);
  });

  it.each([undefined, null, '', 'neighbour', 'call_customer', 1, true, {}])('rejects %j', (value) => {
    expect(isDeliveryIfAbsent(value)).toBe(false);
  });
});

describe('deliveryInputError', () => {
  it('accepts a valid choice with no note, an empty note and a note at the limit', () => {
    expect(deliveryInputError('leave_at_door', undefined)).toBeNull();
    expect(deliveryInputError('leave_at_door', '')).toBeNull();
    expect(deliveryInputError('other', 'x'.repeat(DELIVERY_INSTRUCTIONS_MAX_LENGTH))).toBeNull();
  });

  it('requires a note for «Annet»', () => {
    for (const note of [undefined, null, '', '   ']) {
      expect(deliveryInputError('other', note)).toBe('Skriv hva vi skal gjøre hvis du ikke er hjemme');
    }
    expect(deliveryInputError('other', 'Sett posen i boden')).toBeNull();
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

describe('deliveryNote', () => {
  it('keeps the trimmed note for «Annet» only', () => {
    expect(deliveryNote('other', '  Sett posen i boden  ')).toBe('Sett posen i boden');
    expect(deliveryNote('other', '   ')).toBeNull();
    expect(deliveryNote('other', undefined)).toBeNull();
    expect(deliveryNote('leave_at_door', 'Sett posen i boden')).toBeNull();
  });
});

describe('delivery texts', () => {
  it('labels the choice for the customer, with a fallback when there is none', () => {
    expect(deliveryIfAbsentLabel('leave_at_door')).toBe('Sett tøyet utenfor døra');
    expect(deliveryIfAbsentLabel('other')).toBe('Annet');
    expect(deliveryIfAbsentLabel(null)).toBe('Ikke valgt');
    expect(deliveryIfAbsentLabel(undefined)).toBe('Ikke valgt');
  });

  it('tells the cleaner what to do, and to call first when the customer never chose', () => {
    expect(deliveryCleanerText('leave_at_door')).toBe('Sett tøyet utenfor døra.');
    expect(deliveryCleanerText('other')).toBe('Følg kundens beskjed om levering.');
    expect(deliveryCleanerText(null)).toBe(
      'Kunden har ikke valgt hva som skal skje hvis ingen er hjemme. Ring kunden før du setter tøyet igjen.'
    );
  });

  it('has one e-mail sentence per choice', () => {
    expect(deliveryEmailSentence('leave_at_door')).toContain('setter renseren tøyet utenfor døra');
    expect(deliveryEmailSentence('other')).toContain('følger renseren beskjeden din');
  });
});
