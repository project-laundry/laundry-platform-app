import { describe, it, expect } from 'vitest';
import { isOrphanPendingPayment, orphanPendingCutoffIso } from './payment-status';

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
