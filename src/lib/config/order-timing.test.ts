import { describe, expect, it } from 'vitest';
import { MIN_DAYS_NOTICE, SAME_DAY_CUTOFF, earliestPickupDate, pickupNoticeText } from './order-timing';

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
