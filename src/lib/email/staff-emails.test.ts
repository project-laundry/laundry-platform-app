import { describe, it, expect } from 'vitest';
import type { OrderForStaffEmail } from '@/lib/database/orders';
import {
  buildAdminNewOrderEmail,
  buildAdminOrderUnassignedEmail,
  buildCleanerNewOrderEmail,
} from './staff-emails';

const OPTIONS = { appUrl: 'https://nooracare.no/' };

/** A one-time order assigned to a cleaner at checkout (2 poser + 1 sett). */
const ORDER: OrderForStaffEmail = {
  id: 'ord-1',
  order_number: 'ABC123',
  customer_id: 'cust-1',
  subscription_id: null,
  payment_agreement_id: 'pa-1',
  cleaner_id: 'cl-1',
  status: 'pickup_scheduled',
  street: 'Storgata 1',
  postal_code: '0150',
  city: 'Oslo',
  country: 'Norge',
  special_instructions_address: 'Ring på hos Hansen, 2. etasje',
  latitude: null,
  longitude: null,
  scheduled_date: '2026-10-24',
  delivery_date: '2026-10-27',
  special_instructions: null,
  needs_ironing: false,
  customer_estimate: {
    bags: 2,
    bedding_sets: 1,
    iron_everyday_items: 0,
    iron_formal_items: 0,
    iron_bedding: false,
    estimated_total_ore: 58930,
  },
  wash_loads: 0,
  ironing_details: null,
  actual_weight_kg: null,
  pricing_notes: null,
  price_calculated_at: null,
  total_cost_ore: null,
  cleaner_payout_ore: null,
  promo: null,
  declined_by_cleaner_ids: null,
  assigned_at: '2026-10-20T10:00:00.000Z',
  picked_up_at: null,
  in_cleaning_at: null,
  ready_for_delivery_at: null,
  out_for_delivery_at: null,
  completed_at: null,
  cancelled_at: null,
  cancellation_reason: null,
  admin_notes: null,
  mission_accepted_at: null,
  created_at: '2026-10-20T10:00:00.000Z',
  updated_at: '2026-10-20T10:00:00.000Z',
  cleaner: {
    display_name: 'Ola Rens',
    user: { email: 'ola@example.com', full_name: 'Ola Hansen' },
  },
};

/** The same order after a decline that found no other cleaner. */
const UNASSIGNED_ORDER: OrderForStaffEmail = {
  ...ORDER,
  cleaner_id: null,
  status: 'pending_assignment',
  assigned_at: null,
  declined_by_cleaner_ids: ['cl-1', 'cl-2'],
  cleaner: null,
};

describe('buildCleanerNewOrderEmail', () => {
  it('tells the cleaner when and where to pick up, what the customer sends, and links to the order page', () => {
    const { subject, text, html } = buildCleanerNewOrderEmail(ORDER, OPTIONS);

    expect(subject).toBe('Nytt oppdrag – henting lørdag 24. oktober 2026 (ordre #ABC123)');
    expect(text).toContain('Hei Ola!');
    expect(text).toContain('Du har fått et nytt oppdrag: ordre #ABC123.');
    expect(text).toContain(
      'HENTING\n\nDato: lørdag 24. oktober 2026\nTid: kl. 15:00–18:00\nAdresse: Storgata 1, 0150 Oslo'
    );
    expect(text).toContain('Henteinstruksjoner: Ring på hos Hansen, 2. etasje');
    expect(text).toContain('KUNDEN HAR OPPGITT\n\nKlær: 2 poser\nSengetøy: 1 sett');
    expect(text).toContain('Åpne oppdraget: https://nooracare.no/dashboard/cleaner/ord-1');
    expect(text).toContain('post@nooracare.no');
    expect(html).toContain('<h1');
    expect(html).toContain('Nytt oppdrag');
    expect(html).toContain('href="https://nooracare.no/dashboard/cleaner/ord-1"');
  });

  it('never contains the price estimate', () => {
    const { text, html } = buildCleanerNewOrderEmail(ORDER, OPTIONS);

    expect(text).not.toContain('589');
    expect(html).not.toContain('589');
  });

  it('leaves out the instructions and the estimate section when the order has neither', () => {
    const { text } = buildCleanerNewOrderEmail(
      { ...ORDER, special_instructions_address: null, customer_estimate: null },
      OPTIONS
    );

    expect(text).not.toContain('Henteinstruksjoner');
    expect(text).not.toContain('KUNDEN HAR OPPGITT');
    expect(text).toContain('Åpne oppdraget: https://nooracare.no/dashboard/cleaner/ord-1');
  });
});

describe('buildAdminNewOrderEmail', () => {
  it('lists order number, city, pickup date, cleaner and the admin link', () => {
    const { subject, text } = buildAdminNewOrderEmail(ORDER, OPTIONS);

    expect(subject).toBe('Ny ordre #ABC123 – Oslo, henting lørdag 24. oktober 2026');
    expect(text).toBe(
      [
        'Ny ordre #ABC123',
        '',
        'By: Oslo',
        'Henting: lørdag 24. oktober 2026',
        'Renser: Ola Rens',
        '',
        'https://nooracare.no/admin/orders/ord-1',
        '',
      ].join('\n')
    );
  });

  it('says «ingen renser ennå» in the subject and the text when the order has no cleaner', () => {
    const { subject, text } = buildAdminNewOrderEmail(UNASSIGNED_ORDER, OPTIONS);

    expect(subject).toBe('Ny ordre #ABC123 – Oslo, henting lørdag 24. oktober 2026 – ingen renser ennå');
    expect(text).toContain('Renser: ingen renser ennå');
  });
});

describe('buildAdminOrderUnassignedEmail', () => {
  it('says who declined, how many have declined, and links to the admin order page', () => {
    const { subject, text } = buildAdminOrderUnassignedEmail(
      UNASSIGNED_ORDER,
      { declinedByName: 'Ola Rens' },
      OPTIONS
    );

    expect(subject).toBe('Ordre #ABC123 venter på tildeling – Oslo, henting lørdag 24. oktober 2026');
    expect(text).toContain(
      'Ola Rens avslo oppdraget, og ingen annen renser ble tildelt automatisk. Tildel en renser manuelt.'
    );
    expect(text).toContain('By: Oslo');
    expect(text).toContain('Henting: lørdag 24. oktober 2026');
    expect(text).toContain('Antall rensere som har avslått: 2');
    expect(text).toContain('https://nooracare.no/admin/orders/ord-1');
  });

  it('falls back to «Renseren» when the name is blank', () => {
    const { text } = buildAdminOrderUnassignedEmail(UNASSIGNED_ORDER, { declinedByName: '  ' }, OPTIONS);

    expect(text).toContain('Renseren avslo oppdraget');
  });
});
