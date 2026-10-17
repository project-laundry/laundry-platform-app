import { describe, it, expect } from 'vitest';
import { buildAdminDigest } from './admin-digest';
import type { AdminAttention, AttentionOrder } from '@/lib/database/admin-attention';

const NOW = new Date('2026-10-17T06:00:00.000Z'); // lørdag 17. oktober 2026 in Oslo

const emptyAttention: AdminAttention = {
  today: '2026-10-17',
  pickupsToday: [],
  deliveriesToday: [],
  overduePickups: [],
  readyTooLong: [],
  pendingAssignment: [],
  paymentsToFollowUp: [],
  subscriptionsWithoutOrder: [],
  agreementsWithoutOrder: [],
};

const order: AttentionOrder = {
  id: 'ord-1',
  order_number: 'ABC123',
  status: 'pickup_scheduled',
  scheduled_date: '2026-10-15',
  delivery_date: '2026-10-17',
  city: 'Bergen',
  created_at: '2026-10-10T08:00:00.000Z',
  ready_for_delivery_at: null,
  customer: { user: { full_name: 'Kari Nordmann' } },
  cleaner: { id: 'cl-1', display_name: 'Ola' },
};

describe('buildAdminDigest', () => {
  it('says there is nothing to follow up when every list is empty', () => {
    const { subject, text } = buildAdminDigest(emptyAttention, {
      appUrl: 'https://nooracare.no/',
      now: NOW,
    });

    expect(subject).toBe('NooraCare lørdag 17. oktober: ingenting å følge opp');
    expect(text).toContain('I DAG – henting (0)\nIngen hentinger i dag.');
    expect(text).toContain('Oversikt: https://nooracare.no/admin');
  });

  it('counts problems (not today\'s schedule) in the subject and links each row', () => {
    const { subject, text } = buildAdminDigest(
      {
        ...emptyAttention,
        pickupsToday: [{ ...order, id: 'ord-0', order_number: 'TODAY1', scheduled_date: '2026-10-17' }],
        overduePickups: [order],
        paymentsToFollowUp: [
          {
            id: 'pay-1',
            status: 'failed',
            amount_ore: 59900,
            provider_reference: 'chr-1',
            failure_reason: 'Avvist',
            created_at: '2026-10-16T10:00:00.000Z',
            customer: { user: { full_name: 'Per Hansen' } },
            order: { id: 'ord-9', order_number: 'PAY999' },
          },
        ],
      },
      { appUrl: 'https://nooracare.no', now: NOW }
    );

    expect(subject).toBe('NooraCare lørdag 17. oktober: 2 å følge opp');
    expect(text).toContain('FORSINKET – ikke hentet (1)');
    expect(text).toContain('- #ABC123 Kari Nordmann · Bergen · Ola · 2 d forsinket\n  https://nooracare.no/admin/orders/ord-1');
    expect(text).toContain('- 599 kr Per Hansen · #PAY999 · Feilet: Avvist\n  https://nooracare.no/admin/orders/ord-9');
    expect(text).toContain('- #TODAY1 Kari Nordmann · Bergen · Ola · Planlagt henting');
  });

  it('marks a failed query in the body and the subject', () => {
    const { subject, text } = buildAdminDigest(
      { ...emptyAttention, pendingAssignment: null },
      { appUrl: 'https://nooracare.no', now: NOW }
    );

    expect(subject).toBe(
      'NooraCare lørdag 17. oktober: ingenting å følge opp – noen lister kunne ikke hentes'
    );
    expect(text).toContain('VENTER PÅ TILDELING (?)\n!! Kunne ikke hente denne listen – sjekk /admin');
  });
});
