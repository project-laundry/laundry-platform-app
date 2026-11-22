import { describe, expect, it } from 'vitest';
import {
  MIN_DAYS_NOTICE,
  RESCHEDULE_CLOSED_TEXT,
  SAME_DAY_CUTOFF,
  canCancelOrderSelf,
  canReschedulePickupSelf,
  earliestPickupDate,
  lastSelfCancelDate,
  pickupNoticeText,
  selfCancelClosedText,
  selfCancelOpenText,
} from './order-timing';

// Sunday 22 November 2026. Norway is UTC+1 in winter.
const at = (osloHHMM: string) => {
  const [h, m] = osloHHMM.split(':').map(Number);
  return new Date(Date.UTC(2026, 10, 22, h - 1, m));
};

describe('earliestPickupDate', () => {
  it('with 0 days notice: today until the cutoff, tomorrow from the cutoff on', () => {
    expect(earliestPickupDate(at('09:00'), 0, '15:00')).toBe('2026-11-22');
    expect(earliestPickupDate(at('14:59'), 0, '15:00')).toBe('2026-11-22');
    expect(earliestPickupDate(at('15:00'), 0, '15:00')).toBe('2026-11-23');
    expect(earliestPickupDate(at('23:30'), 0, '15:00')).toBe('2026-11-23');
  });

  it('with 1 or 2 days notice the time of day does not matter', () => {
    expect(earliestPickupDate(at('09:00'), 1, '15:00')).toBe('2026-11-23');
    expect(earliestPickupDate(at('18:00'), 1, '15:00')).toBe('2026-11-23');
    expect(earliestPickupDate(at('09:00'), 2, '15:00')).toBe('2026-11-24');
    expect(earliestPickupDate(at('23:30'), 2, '15:00')).toBe('2026-11-24');
  });

  it('uses the Norwegian calendar day, not the UTC one', () => {
    // 00:30 in Norway on the 23rd is still the 22nd in UTC.
    const justAfterMidnight = new Date(Date.UTC(2026, 10, 22, 23, 30));
    expect(earliestPickupDate(justAfterMidnight, 0, '15:00')).toBe('2026-11-23');
    expect(earliestPickupDate(justAfterMidnight, 2, '15:00')).toBe('2026-11-25');
  });

  it('crosses month and year boundaries', () => {
    expect(earliestPickupDate(new Date(Date.UTC(2026, 11, 31, 16, 0)), 0, '15:00')).toBe('2027-01-01');
    expect(earliestPickupDate(new Date(Date.UTC(2026, 10, 30, 10, 0)), 2, '15:00')).toBe('2026-12-02');
  });

  it('is configured for same-day pickup until the pickup window opens', () => {
    expect(MIN_DAYS_NOTICE).toBe(0);
    expect(SAME_DAY_CUTOFF).toBe('15:00');
  });
});

describe('pickupNoticeText', () => {
  it('describes each setting in Norwegian', () => {
    expect(pickupNoticeText(0, '15:00')).toBe('Henting samme dag kan velges frem til kl. 15:00.');
    expect(pickupNoticeText(1, '15:00')).toBe('Hentedatoen må være minst én dag frem i tid.');
    expect(pickupNoticeText(2, '15:00')).toBe('Hentedatoen må være minst 2 dager frem i tid.');
  });
});

// Pickup on Wednesday 25 November 2026. Norway is UTC+1 in winter, so
// 23:00 UTC is midnight in Norway.
describe('canCancelOrderSelf', () => {
  const PICKUP = '2026-11-25';

  it('is open through the whole day two days before the pickup day', () => {
    expect(lastSelfCancelDate(PICKUP)).toBe('2026-11-23');
    expect(canCancelOrderSelf(PICKUP, new Date('2026-11-20T12:00:00Z'))).toBe(true);
    // Monday 23:59 in Norway.
    expect(canCancelOrderSelf(PICKUP, new Date('2026-11-23T22:59:00Z'))).toBe(true);
  });

  it('closes at midnight Norwegian time at the start of the day before the pickup day', () => {
    // Tuesday 00:00 in Norway is still Monday 23:00 in UTC.
    expect(canCancelOrderSelf(PICKUP, new Date('2026-11-23T23:00:00Z'))).toBe(false);
    expect(canCancelOrderSelf(PICKUP, new Date('2026-11-24T12:00:00Z'))).toBe(false);
    expect(canCancelOrderSelf(PICKUP, new Date('2026-11-25T08:00:00Z'))).toBe(false);
    expect(canCancelOrderSelf(PICKUP, new Date('2026-11-26T08:00:00Z'))).toBe(false);
  });

  it('follows summer time and crosses month boundaries', () => {
    // Pickup Wednesday 1 July 2026 (UTC+2): the last day is Monday 29 June.
    expect(lastSelfCancelDate('2026-07-01')).toBe('2026-06-29');
    expect(canCancelOrderSelf('2026-07-01', new Date('2026-06-29T21:59:00Z'))).toBe(true);
    expect(canCancelOrderSelf('2026-07-01', new Date('2026-06-29T22:00:00Z'))).toBe(false);
  });
});

describe('canReschedulePickupSelf', () => {
  const PICKUP = '2026-11-25';

  it('is open until midnight Norwegian time at the start of the pickup day', () => {
    expect(canReschedulePickupSelf(PICKUP, new Date('2026-11-20T12:00:00Z'))).toBe(true);
    // Tuesday 23:59 in Norway.
    expect(canReschedulePickupSelf(PICKUP, new Date('2026-11-24T22:59:00Z'))).toBe(true);
  });

  it('is closed on the pickup day and after it', () => {
    // Wednesday 00:00 in Norway is still Tuesday 23:00 in UTC.
    expect(canReschedulePickupSelf(PICKUP, new Date('2026-11-24T23:00:00Z'))).toBe(false);
    expect(canReschedulePickupSelf(PICKUP, new Date('2026-11-25T13:00:00Z'))).toBe(false);
    expect(canReschedulePickupSelf(PICKUP, new Date('2026-11-27T13:00:00Z'))).toBe(false);
  });
});

describe('self-service deadline texts', () => {
  it('names the last day to cancel while cancellation is open', () => {
    expect(selfCancelOpenText('2026-11-25')).toBe('Du kan avbestille selv til og med mandag 23. november.');
  });

  it('says when cancellation closed', () => {
    expect(selfCancelClosedText('2026-11-25')).toBe(
      'Du kan ikke lenger avbestille selv. Fristen var midnatt natt til tirsdag 24. november, dagen før hentedagen.'
    );
  });

  it('says that the pickup date can no longer be moved', () => {
    expect(RESCHEDULE_CLOSED_TEXT).toBe(
      'Du kan ikke lenger endre hentedatoen selv. Det er mulig til og med dagen før hentedagen.'
    );
  });
});
