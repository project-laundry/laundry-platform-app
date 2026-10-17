import { describe, it, expect } from 'vitest';
import { hasLivePayment, isOrphanPendingPayment, orphanPendingCutoffIso } from './payment-status';

const NOW = new Date('2026-10-16T12:00:00.000Z');

describe('orphanPendingCutoffIso', () => {
  it('is 15 minutes before now', () => {
    expect(orphanPendingCutoffIso(NOW)).toBe('2026-10-16T11:45:00.000Z');
  });
});

describe('isOrphanPendingPayment', () => {
  it('is true for a pending row with no reference older than 15 minutes', () => {
    expect(
      isOrphanPendingPayment(
        { status: 'pending', provider_reference: null, created_at: '2026-10-16T11:30:00.000Z' },
        NOW
      )
    ).toBe(true);
  });

  it('is false while the row is younger than 15 minutes (charge may still be in flight)', () => {
    expect(
      isOrphanPendingPayment(
        { status: 'pending', provider_reference: null, created_at: '2026-10-16T11:50:00.000Z' },
        NOW
      )
    ).toBe(false);
  });

  it('is false once a provider_reference exists, however old', () => {
    expect(
      isOrphanPendingPayment(
        { status: 'pending', provider_reference: 'chr-1', created_at: '2026-10-01T00:00:00.000Z' },
        NOW
      )
    ).toBe(false);
  });

  it('is false for non-pending statuses', () => {
    expect(
      isOrphanPendingPayment(
        { status: 'failed', provider_reference: null, created_at: '2026-10-01T00:00:00.000Z' },
        NOW
      )
    ).toBe(false);
  });
});

describe('hasLivePayment', () => {
  const failed = { status: 'failed' as const, provider_reference: null, created_at: '2026-10-16T11:00:00.000Z' };
  const cancelled = { status: 'cancelled' as const, provider_reference: 'chr-0', created_at: '2026-10-16T11:00:00.000Z' };

  it('is false with no rows', () => {
    expect(hasLivePayment([], NOW)).toBe(false);
  });

  it('is false when every row is failed or cancelled', () => {
    expect(hasLivePayment([failed, cancelled], NOW)).toBe(false);
  });

  it('is true for captured, authorized and refunded rows', () => {
    for (const status of ['captured', 'authorized', 'refunded'] as const) {
      expect(
        hasLivePayment([failed, { status, provider_reference: 'chr-1', created_at: '2026-10-16T11:00:00.000Z' }], NOW)
      ).toBe(true);
    }
  });

  it('is true for a pending charge that exists at Vipps, however old', () => {
    expect(
      hasLivePayment([{ status: 'pending', provider_reference: 'chr-1', created_at: '2026-10-01T00:00:00.000Z' }], NOW)
    ).toBe(true);
  });

  it('is true for a young pending row with no reference (charge may be in flight)', () => {
    expect(
      hasLivePayment([{ status: 'pending', provider_reference: null, created_at: '2026-10-16T11:50:00.000Z' }], NOW)
    ).toBe(true);
  });

  it('is false for an orphan pending row (no reference, older than the grace period)', () => {
    expect(
      hasLivePayment([{ status: 'pending', provider_reference: null, created_at: '2026-10-16T11:30:00.000Z' }], NOW)
    ).toBe(false);
  });
});
