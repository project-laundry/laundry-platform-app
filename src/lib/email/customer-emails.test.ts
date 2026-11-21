import { describe, it, expect } from 'vitest';
import type { OrderForCustomerEmail } from '@/lib/database/orders';
import { buildCleanerConfirmedEmail, buildOrderCancelledEmail, buildPickupRescheduledEmail, buildOrderConfirmationEmail, buildOrderPickedUpEmail, buildPickupReminderEmail, buildPaymentFailedEmail, buildOrderDeliveredEmail, buildPriceReceiptEmail, formatKrExact, formatLongDate } from './customer-emails';

const OPTIONS = { appUrl: 'https://nooracare.no/' };

/** A one-time order — the only kind sold while SUBSCRIPTIONS_OFFERED is false — unpriced, with the checkout estimate (2 poser + 1 sett = 589,30 kr). */
const ORDER: OrderForCustomerEmail = {
  id: 'ord-1',
  order_number: 'ABC123',
  customer_id: 'cust-1',
  subscription_id: null,
  payment_agreement_id: 'pa-1',
  cleaner_id: null,
  status: 'pending_assignment',
  street: 'Storgata 1',
  postal_code: '0150',
  city: 'Oslo',
  country: 'Norge',
  special_instructions_address: null,
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
  assigned_at: null,
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
  customer: { user: { email: 'kari@example.com', full_name: 'Kari Nordmann' } },
  subscription: null,
  cleaner: null,
};

/** The same order with a cleaner matched at checkout — the normal confirmed case. */
const SCHEDULED_ORDER: OrderForCustomerEmail = {
  ...ORDER,
  cleaner_id: 'cl-1',
  status: 'pickup_scheduled',
  assigned_at: '2026-10-20T10:00:00.000Z',
};

/** The dormant variant: the first order of a weekly subscription. */
const SUBSCRIPTION_ORDER: OrderForCustomerEmail = {
  ...SCHEDULED_ORDER,
  subscription_id: 'sub-1',
  subscription: { frequency: 'weekly', status: 'active' },
};

describe('formatting helpers', () => {
  it('formats a long Norwegian date and exact kroner', () => {
    expect(formatLongDate('2026-10-24')).toBe('lørdag 24. oktober 2026');
    expect(formatKrExact(41840)).toBe('418,40 kr');
    expect(formatKrExact(50000)).toBe('500 kr');
    expect(formatKrExact(0)).toBe('0 kr');
  });
});

describe('buildOrderConfirmationEmail', () => {
  it('confirms a one-time order with pickup, items and estimate, and never mentions a subscription', () => {
    const { subject, text, html } = buildOrderConfirmationEmail(SCHEDULED_ORDER, OPTIONS);

    expect(subject).toBe('Bestilling #ABC123 er bekreftet – henting lørdag 24. oktober 2026');
    expect(text).toContain('Hei Kari!');
    expect(text).toContain('Hentingen din er bekreftet');
    expect(text).toContain('Dato: lørdag 24. oktober 2026');
    expect(text).toContain('Adresse: Storgata 1, 0150 Oslo');
    expect(text).toContain('DET DU SENDER\n\nKlær: 2 poser\nSengetøy: 1 sett');
    expect(text).toContain('Estimat: ca. 589 kr');
    expect(text).toContain('endelige prisen settes av renseren etter henting');
    expect(text).toContain('Se bestillingen: https://nooracare.no/orders/details/ord-1');
    expect(text).toContain('post@nooracare.no');
    expect(text).not.toContain('ABONNEMENT');
    expect(text).not.toContain('/dashboard/subscription');
    expect(text).not.toContain('abonnement');
    expect(html).toContain('<h1');
    expect(html).toContain('href="https://nooracare.no/orders/details/ord-1"');
    expect(html).toContain('Hei Kari!');
  });

  it('adds the frequency and the cancel link for a subscription order (dormant path)', () => {
    const { text } = buildOrderConfirmationEmail(SUBSCRIPTION_ORDER, OPTIONS);

    expect(text).toContain('Abonnementet ditt er i gang, og første henting er bekreftet.');
    expect(text).toContain('ABONNEMENT');
    expect(text).toContain('Henting ukentlig.');
    expect(text).toContain('https://nooracare.no/dashboard/subscription');
  });

  it('mentions the promo code when one is locked on the order', () => {
    const { text } = buildOrderConfirmationEmail(
      {
        ...ORDER,
        promo: { promo_code_id: 'promo-1', code: 'WELCOME', discount_type: 'percentage', discount_value: 20, max_discount_ore: null },
      },
      OPTIONS
    );

    expect(text).toContain('Rabattkoden WELCOME trekkes fra den endelige prisen.');
  });

  it('skips the items and estimate rows for an order without a checkout estimate', () => {
    const { text } = buildOrderConfirmationEmail({ ...ORDER, customer_estimate: null }, OPTIONS);

    expect(text).not.toContain('DET DU SENDER');
    expect(text).not.toContain('Estimat:');
    expect(text).toContain('PRIS\n\nEstimatet er veiledende.');
  });

  it('says a cleaner is being assigned manually when the order has none (pending_assignment)', () => {
    const { subject, text, html } = buildOrderConfirmationEmail(ORDER, OPTIONS);

    expect(subject).toBe('Bestilling #ABC123 er mottatt – vi finner en renser til deg');
    expect(text).toContain('tildeler nå en lokal renser manuelt');
    expect(text).toContain('Du trenger ikke gjøre noe – vi tar kontakt så snart en renser er bekreftet.');
    expect(text).toContain('Ønsket hentedato: lørdag 24. oktober 2026\nAdresse: Storgata 1, 0150 Oslo');
    expect(text).toContain('Hentedatoen er ikke bekreftet ennå.');
    expect(text).not.toContain('Hentingen din er bekreftet');
    expect(text).not.toContain('\nDato: ');
    expect(text).not.toMatch(/24 timer|innen/i);
    expect(html).toContain('Bestillingen din er mottatt');
    expect(html).not.toContain('Bestillingen din er bekreftet');
    // The rest of the confirmation is unchanged.
    expect(text).toContain('Estimat: ca. 589 kr');
    expect(text).toContain('Se bestillingen: https://nooracare.no/orders/details/ord-1');
  });

  it('keeps the subscription section but not the "er i gang … bekreftet" intro for a pending subscription order', () => {
    const { text } = buildOrderConfirmationEmail({ ...SUBSCRIPTION_ORDER, status: 'pending_assignment' }, OPTIONS);

    expect(text).toContain('tildeler nå en lokal renser manuelt');
    expect(text).not.toContain('første henting er bekreftet');
    expect(text).toContain('Henting ukentlig.');
  });

  it('escapes customer-controlled text in the HTML', () => {
    const { html, text } = buildOrderConfirmationEmail(
      { ...ORDER, street: 'Storgata <1> & "A"', customer: { user: { email: 'x@example.com', full_name: '' } } },
      OPTIONS
    );

    expect(html).toContain('Storgata &lt;1&gt; &amp; &quot;A&quot;');
    expect(html).not.toContain('<1>');
    expect(text).toContain('Hei!');
  });
});

const WELCOME_PROMO = {
  promo_code_id: 'promo-1',
  code: 'WELCOME',
  discount_type: 'percentage' as const,
  discount_value: 20,
  max_discount_ore: null,
  discount_ore: 11606,
};

/** The same order priced by the cleaner: 2 machines (458) + 104 + 18,30 = 580,30 kr; WELCOME 20 % → −116,06 → 464,24 kr. */
const PRICED_ORDER: OrderForCustomerEmail = {
  ...ORDER,
  status: 'ready_for_delivery',
  wash_loads: 2,
  total_cost_ore: 46424,
  cleaner_payout_ore: 40621,
  pricing_notes: 'Mye sengetøy, delt i to maskiner',
  price_calculated_at: '2026-10-25T14:00:00.000Z',
  promo: WELCOME_PROMO,
};

describe('buildPriceReceiptEmail', () => {
  it('lists the price lines, the promo deduction, the estimate and the Vipps reference', () => {
    const { subject, text } = buildPriceReceiptEmail(PRICED_ORDER, { provider_reference: 'chr-1' }, OPTIONS);

    expect(subject).toBe('Prisen er satt – 464,24 kr for bestilling #ABC123');
    expect(text).toContain('BESTILLING #ABC123');
    expect(text).toContain('Vask – 2 maskiner à 229 kr: 458 kr');
    expect(text).toContain('Henting og levering: 104 kr');
    expect(text).toContain('Servicegebyr: 18,30 kr');
    expect(text).toContain('Rabatt (WELCOME): −116,06 kr');
    expect(text).toContain('Totalt: 464,24 kr');
    expect(text).not.toContain('Minstepris');
    expect(text).toContain('Estimatet ved bestilling var ca. 589 kr.');
    expect(text).toContain('Fra renseren: «Mye sengetøy, delt i to maskiner»');
    expect(text).toContain('464,24 kr trekkes automatisk via Vipps-avtalen din');
    expect(text).toContain('Vipps-referanse: chr-1');
    expect(text).not.toContain('Veid');
  });

  it('shows the minimum when it applied and the weight when recorded', () => {
    const { text } = buildPriceReceiptEmail(
      { ...PRICED_ORDER, wash_loads: 1, total_cost_ore: 50000, promo: null, pricing_notes: null, actual_weight_kg: 4.5 },
      { provider_reference: 'chr-2' },
      OPTIONS
    );

    expect(text).toContain('Vask – 1 maskin à 229 kr: 229 kr');
    expect(text).toContain('Minstepris per bestilling: 500 kr');
    expect(text).toContain('Totalt: 500 kr');
    expect(text).toContain('Veid: 4.5 kg');
    expect(text).not.toContain('Rabatt');
  });

  it('shows only the total when the stored price does not match the formula', () => {
    const { text } = buildPriceReceiptEmail({ ...PRICED_ORDER, total_cost_ore: 12345, promo: null }, null, OPTIONS);

    expect(text).toContain('Totalt: 123,45 kr');
    expect(text).not.toContain('Servicegebyr');
  });

  it('says nothing is charged for a 0-total order', () => {
    const { subject, text } = buildPriceReceiptEmail(
      { ...PRICED_ORDER, total_cost_ore: 0, promo: { ...WELCOME_PROMO, discount_value: 100, discount_ore: 58030 } },
      null,
      OPTIONS
    );

    expect(subject).toBe('Prisen er satt – 0 kr for bestilling #ABC123');
    expect(text).toContain('Rabatt (WELCOME): −580,30 kr');
    expect(text).toContain('Totalt: 0 kr');
    expect(text).toContain('ingenting trekkes');
    expect(text).not.toContain('Vipps-referanse');
  });
});

describe('buildPaymentFailedEmail', () => {
  it('names the order and amount, states the retry policy and the Vipps reference', () => {
    const { subject, text } = buildPaymentFailedEmail(
      { ...ORDER, status: 'ready_for_delivery', wash_loads: 2, total_cost_ore: 46424 },
      { amount_ore: 46424, provider_reference: 'chr-1' },
      OPTIONS
    );

    expect(subject).toBe('Betalingen for bestilling #ABC123 gikk ikke gjennom');
    expect(text).toContain('Vi fikk dessverre ikke trukket 464,24 kr for bestilling #ABC123 via Vipps.');
    expect(text).toContain('HVA SKJER NÅ');
    expect(text).toContain('Dette påvirker ikke leveringen av tøyet ditt.');
    expect(text).toContain('nytt forsøk på å trekke beløpet i løpet av noen dager');
    expect(text).toContain('Vipps-referanse: chr-1');
    expect(text).toContain('Se bestillingen: https://nooracare.no/orders/details/ord-1');
  });

  it('omits the reference row when the payment has none', () => {
    const { text } = buildPaymentFailedEmail(ORDER, { amount_ore: 50000, provider_reference: null }, OPTIONS);

    expect(text).toContain('trukket 500 kr for bestilling #ABC123');
    expect(text).not.toContain('Vipps-referanse');
  });
});

/** A one-time order the cleaner has just delivered: priced at 464,24 kr. */
const DELIVERED_ORDER: OrderForCustomerEmail = {
  ...ORDER,
  status: 'completed',
  subscription_id: null,
  subscription: null,
  wash_loads: 2,
  total_cost_ore: 46424,
  completed_at: '2026-10-27T15:00:00.000Z',
};

describe('buildOrderDeliveredEmail', () => {
  it('says when and where the laundry was delivered and links to the order', () => {
    const { subject, text, html } = buildOrderDeliveredEmail(DELIVERED_ORDER, [], OPTIONS);

    expect(subject).toBe('Tøyet ditt er levert – bestilling #ABC123');
    expect(text).toContain('Hei Kari!');
    expect(text).toContain('Tøyet ditt er levert, og bestilling #ABC123 er fullført.');
    expect(text).toContain('LEVERING\n\nLevert: tirsdag 27. oktober 2026\nAdresse: Storgata 1, 0150 Oslo');
    expect(text).toContain('Se bestillingen: https://nooracare.no/orders/details/ord-1');
    expect(html).toContain('<h1');
    expect(html).toContain('href="https://nooracare.no/orders/details/ord-1"');
  });

  it('says the amount will be charged while the Vipps charge is still pending', () => {
    const { text } = buildOrderDeliveredEmail(
      DELIVERED_ORDER,
      [{ status: 'pending', amount_ore: 46424, provider_reference: 'chr-1' }],
      OPTIONS
    );

    expect(text).toContain(
      'BETALING\n\n464,24 kr trekkes automatisk via Vipps-avtalen din i løpet av et par dager. Du trenger ikke gjøre noe.'
    );
  });

  it('says the amount has been charged once the payment is captured, even next to an older failed row', () => {
    const { text } = buildOrderDeliveredEmail(
      DELIVERED_ORDER,
      [
        { status: 'captured', amount_ore: 46424, provider_reference: 'chr-2' },
        { status: 'failed', amount_ore: 46424, provider_reference: 'chr-1' },
      ],
      OPTIONS
    );

    expect(text).toContain('BETALING\n\n464,24 kr er trukket via Vipps-avtalen din.');
    expect(text).not.toContain('trekkes automatisk');
  });

  it('says nothing is charged for a 0-total order', () => {
    const { text } = buildOrderDeliveredEmail({ ...DELIVERED_ORDER, total_cost_ore: 0 }, [], OPTIONS);

    expect(text).toContain('BETALING\n\nIngenting trekkes fra Vipps-avtalen din for denne bestillingen.');
  });

  it('stays silent about payment when the charge failed, was never created or was refunded', () => {
    const silent = [
      [{ status: 'failed' as const, amount_ore: 46424, provider_reference: 'chr-1' }],
      [{ status: 'pending' as const, amount_ore: 46424, provider_reference: null }],
      [{ status: 'refunded' as const, amount_ore: 46424, provider_reference: 'chr-1' }],
      [{ status: 'cancelled' as const, amount_ore: 46424, provider_reference: 'chr-1' }],
      [],
    ];

    for (const payments of silent) {
      const { text } = buildOrderDeliveredEmail(DELIVERED_ORDER, payments, OPTIONS);

      expect(text).not.toContain('BETALING');
      expect(text).not.toContain('Vipps');
      expect(text).not.toContain('464,24');
    }
  });

  it('never mentions a subscription for a one-time order', () => {
    const { text } = buildOrderDeliveredEmail(DELIVERED_ORDER, [], OPTIONS);

    expect(text).not.toContain('bonnement');
    expect(text).not.toContain('Neste henting');
  });

  it('tells an active subscriber that the next pickup is set up automatically, without a date', () => {
    const { text } = buildOrderDeliveredEmail(
      { ...DELIVERED_ORDER, subscription_id: 'sub-1', subscription: { frequency: 'weekly', status: 'active' } },
      [],
      OPTIONS
    );

    expect(text).toContain(
      'Abonnementet ditt fortsetter. Neste henting settes opp automatisk, og du finner datoen på Min side: https://nooracare.no/dashboard'
    );
  });

  it('adds no subscription paragraph when the subscription is cancelled', () => {
    const { text } = buildOrderDeliveredEmail(
      { ...DELIVERED_ORDER, subscription_id: 'sub-1', subscription: { frequency: 'weekly', status: 'cancelled' } },
      [],
      OPTIONS
    );

    expect(text).not.toContain('Neste henting');
  });
});

/** A one-time order just collected by cleaner "Ola Hansen" at 14:32 Oslo time (12:32 UTC, CEST). */
const PICKED_UP_ORDER: OrderForCustomerEmail = {
  ...ORDER,
  subscription_id: null,
  subscription: null,
  cleaner_id: 'cl-1',
  status: 'in_cleaning',
  picked_up_at: '2026-10-24T12:32:00.000Z',
  in_cleaning_at: '2026-10-24T12:32:00.000Z',
  cleaner: { display_name: 'Ola Hansen' },
};

describe('buildOrderPickedUpEmail', () => {
  it('says who picked up the laundry and when, what happens next, and that the price was an estimate', () => {
    const { subject, text, html } = buildOrderPickedUpEmail(
      PICKED_UP_ORDER,
      { showPickupTime: true },
      OPTIONS
    );

    expect(subject).toBe('Tøyet ditt er hentet – bestilling #ABC123');
    expect(text).toContain('Hei Kari!');
    expect(text).toContain(
      'Ola Hansen, renseren din, hentet tøyet ditt lørdag 24. oktober kl. 14:32.'
    );
    expect(text).toContain('HVA SKJER NÅ');
    expect(text).toContain('Du får en e-post når prisen er satt, og en ny når tøyet er levert.');
    expect(text).toContain('Prisen du så da du bestilte (ca. 589 kr), var et estimat.');
    expect(text).toContain('Renseren setter den endelige prisen');
    expect(text).toContain('Se bestillingen: https://nooracare.no/orders/details/ord-1');
    expect(html).toContain('Tøyet ditt er hentet</h1>');
    expect(html).toContain('href="https://nooracare.no/orders/details/ord-1"');
  });

  it('never shows a delivery date, a deadline or subscription wording', () => {
    const { text } = buildOrderPickedUpEmail(
      {
        ...PICKED_UP_ORDER,
        subscription_id: 'sub-1',
        subscription: { frequency: 'weekly', status: 'active' },
      },
      { showPickupTime: true },
      OPTIONS
    );

    expect(text).not.toContain('27. oktober');
    expect(text).not.toContain('innen');
    expect(text.toLowerCase()).not.toContain('abonnement');
    expect(text.toLowerCase()).not.toContain('nabo');
  });

  it('leaves the time out for the admin fallback', () => {
    const { text } = buildOrderPickedUpEmail(PICKED_UP_ORDER, { showPickupTime: false }, OPTIONS);

    expect(text).toContain('Ola Hansen, renseren din, har hentet tøyet ditt.');
    expect(text).not.toContain('kl.');
    expect(text).not.toContain('24. oktober');
  });

  it('leaves the time out when picked_up_at is missing', () => {
    const { text } = buildOrderPickedUpEmail(
      { ...PICKED_UP_ORDER, picked_up_at: null },
      { showPickupTime: true },
      OPTIONS
    );

    expect(text).toContain('Ola Hansen, renseren din, har hentet tøyet ditt.');
  });

  it('trims the display name and falls back to «Renseren din» without a cleaner or with a blank name', () => {
    const none = buildOrderPickedUpEmail(
      { ...PICKED_UP_ORDER, cleaner_id: null, cleaner: null },
      { showPickupTime: true },
      OPTIONS
    );
    const blank = buildOrderPickedUpEmail(
      { ...PICKED_UP_ORDER, cleaner: { display_name: '  ' } },
      { showPickupTime: false },
      OPTIONS
    );
    const padded = buildOrderPickedUpEmail(
      { ...PICKED_UP_ORDER, cleaner: { display_name: '  Bergen Vask ' } },
      { showPickupTime: false },
      OPTIONS
    );

    expect(none.text).toContain('Renseren din hentet tøyet ditt lørdag 24. oktober kl. 14:32.');
    expect(blank.text).toContain('Renseren din har hentet tøyet ditt.');
    expect(padded.text).toContain('Bergen Vask, renseren din, har hentet tøyet ditt.');
  });

  it('omits the amount for an order without a checkout estimate', () => {
    const { text } = buildOrderPickedUpEmail(
      { ...PICKED_UP_ORDER, customer_estimate: null },
      { showPickupTime: true },
      OPTIONS
    );

    expect(text).toContain('Prisen du så da du bestilte, var et estimat.');
    expect(text).not.toContain('ca.');
  });

  it('uses Oslo time across midnight and escapes the cleaner name in the HTML', () => {
    const { text, html } = buildOrderPickedUpEmail(
      {
        ...PICKED_UP_ORDER,
        picked_up_at: '2026-10-24T22:05:00.000Z',
        cleaner: { display_name: '<b>Ola</b> Hansen' },
      },
      { showPickupTime: true },
      OPTIONS
    );

    expect(text).toContain('hentet tøyet ditt søndag 25. oktober kl. 00:05.');
    expect(html).toContain('&lt;b&gt;Ola&lt;/b&gt; Hansen, renseren din,');
    expect(html).not.toContain('<b>Ola</b>');
  });
});

/** The same order the evening before pickup: a cleaner is assigned and the customer left both notes. */
const PICKUP_REMINDER_ORDER: OrderForCustomerEmail = {
  ...ORDER,
  status: 'pickup_scheduled',
  cleaner_id: 'cl-1',
  scheduled_date: '2026-11-24',
  delivery_date: '2026-11-26',
  special_instructions_address: 'Portkode 1234, posen står i gangen',
  special_instructions: 'Vask på 30 grader',
  subscription_id: null,
  subscription: null,
  cleaner: { display_name: 'Anna' },
};

describe('buildPickupReminderEmail', () => {
  it('tells the customer who comes when, repeats address and notes, and links to the order', () => {
    const { subject, text, html } = buildPickupReminderEmail(PICKUP_REMINDER_ORDER, OPTIONS);

    expect(subject).toBe('Vi henter tøyet ditt i morgen – sett posen klar');
    expect(text).toContain('Hei Kari!');
    expect(text).toContain(
      'Anna henter tøyet ditt i morgen, tirsdag 24. november 2026, mellom kl. 15:00 og 18:00. Sett posen klar før kl. 15:00.'
    );
    expect(text).toContain(
      'HENTING\n\nDato: tirsdag 24. november 2026\nTid: kl. 15:00–18:00\nAdresse: Storgata 1, 0150 Oslo\nRenser: Anna'
    );
    expect(text).toContain('Henteinstruksjoner: Portkode 1234, posen står i gangen');
    expect(text).toContain('Vaskeinstruksjoner: Vask på 30 grader');
    expect(text).not.toContain('Du har ikke lagt inn noen beskjeder');
    expect(text).toContain('Du kan fortsatt endre adresse, beskjeder og hentedato på bestillingssiden.');
    expect(text).toContain('Se eller endre bestillingen: https://nooracare.no/orders/details/ord-1');
    expect(html).toContain('Vi henter tøyet ditt i morgen</h1>');
    expect(html).toContain('href="https://nooracare.no/orders/details/ord-1"');
  });

  it('says so when the customer left no notes', () => {
    const { text } = buildPickupReminderEmail(
      { ...PICKUP_REMINDER_ORDER, special_instructions_address: null, special_instructions: '   ' },
      OPTIONS
    );

    expect(text).toContain('Du har ikke lagt inn noen beskjeder til renseren.');
    expect(text).not.toContain('Henteinstruksjoner:');
    expect(text).not.toContain('Vaskeinstruksjoner:');
  });

  it('falls back to "Vi" when the order has no cleaner row', () => {
    const { text } = buildPickupReminderEmail({ ...PICKUP_REMINDER_ORDER, cleaner: null }, OPTIONS);

    expect(text).toContain('Vi henter tøyet ditt i morgen, tirsdag 24. november 2026');
    expect(text).not.toContain('Renser:');
  });

  it('never offers cancellation or mentions a subscription', () => {
    const { text } = buildPickupReminderEmail(
      { ...PICKUP_REMINDER_ORDER, subscription_id: 'sub-1', subscription: { frequency: 'weekly', status: 'active' } },
      OPTIONS
    );

    expect(text.toLowerCase()).not.toContain('kanseller');
    expect(text.toLowerCase()).not.toContain('avbestill');
    expect(text.toLowerCase()).not.toContain('abonnement');
  });

  it('escapes customer-written notes in the HTML', () => {
    const { html } = buildPickupReminderEmail(
      { ...PICKUP_REMINDER_ORDER, special_instructions_address: 'Ring på <Hansen> & "Olsen"' },
      OPTIONS
    );

    expect(html).toContain('Ring på &lt;Hansen&gt; &amp; &quot;Olsen&quot;');
    expect(html).not.toContain('<Hansen>');
  });
});

describe('buildOrderCancelledEmail', () => {
  const ONE_TIME: OrderForCustomerEmail = {
    ...ORDER,
    status: 'cancelled',
    subscription_id: null,
    subscription: null,
  };

  it('confirms a customer cancellation of a one-time order: nothing charged, no subscription or Vipps wording', () => {
    const { subject, text, html } = buildOrderCancelledEmail(ONE_TIME, { nextPickupDate: null }, OPTIONS);

    expect(subject).toBe('Bestilling #ABC123 er kansellert');
    expect(text).toContain('Hei Kari!');
    expect(text).toContain('Vi bekrefter at bestilling #ABC123 er kansellert. Tøyet blir ikke hentet.');
    expect(text).toContain('KANSELLERT HENTING\n\nDato: lørdag 24. oktober 2026\nAdresse: Storgata 1, 0150 Oslo');
    expect(text).toContain('Ingenting er trukket for denne bestillingen, og du blir ikke belastet for den.');
    expect(text).toContain('Se bestillingen: https://nooracare.no/orders/details/ord-1');
    expect(text).not.toContain('Årsak');
    expect(text).not.toMatch(/abonnement/i);
    expect(text).not.toContain('Vipps');
    expect(html).toContain('Bestillingen er kansellert');
    expect(html).toContain('href="https://nooracare.no/orders/details/ord-1"');
  });

  it('shows the admin reason, escaped in the HTML, and says NooraCare cancelled', () => {
    const { text, html } = buildOrderCancelledEmail(
      { ...ONE_TIME, cancellation_reason: '  Duplikat av <forrige> bestilling  ' },
      { nextPickupDate: null },
      OPTIONS
    );

    expect(text).toContain('Vi har kansellert bestilling #ABC123. Tøyet blir ikke hentet.');
    expect(text).toContain('Årsak: Duplikat av <forrige> bestilling');
    expect(text).not.toContain('Vi bekrefter');
    expect(html).toContain('Årsak: Duplikat av &lt;forrige&gt; bestilling');
    expect(html).not.toContain('<forrige>');
  });

  it('names the next pickup when the subscription continues', () => {
    const { text } = buildOrderCancelledEmail(
      { ...ORDER, status: 'cancelled', subscription: { frequency: 'weekly', status: 'active' } },
      { nextPickupDate: '2026-10-31' },
      OPTIONS
    );

    expect(text).toContain('ABONNEMENT\n\nAbonnementet ditt fortsetter. Neste henting er lørdag 31. oktober 2026.');
  });

  it('falls back to "settes opp automatisk" when no next pickup is known', () => {
    const { text } = buildOrderCancelledEmail(
      { ...ORDER, status: 'cancelled', subscription: { frequency: 'weekly', status: 'active' } },
      { nextPickupDate: null },
      OPTIONS
    );

    expect(text).toContain('Abonnementet ditt fortsetter. Neste henting settes opp automatisk, og du finner den på Min side.');
  });

  it('says the subscription is cancelled when the customer cancelled it too, and ignores a next pickup', () => {
    const { text } = buildOrderCancelledEmail(
      { ...ORDER, status: 'cancelled', subscription_id: 'sub-1', subscription: { frequency: 'weekly', status: 'cancelled' } },
      { nextPickupDate: '2026-10-31' },
      OPTIONS
    );

    expect(text).toContain('Abonnementet ditt er sagt opp, så det settes ikke opp flere hentinger.');
    expect(text).not.toContain('Neste henting');
  });
});

describe('buildPickupRescheduledEmail', () => {
  const MOVED: OrderForCustomerEmail = { ...ORDER, scheduled_date: '2026-10-27' };

  it('confirms a customer reschedule with new date, previous date and address', () => {
    const { subject, text, html } = buildPickupRescheduledEmail(
      MOVED,
      { previousPickupDate: '2026-10-24', changedBy: 'customer' },
      OPTIONS
    );

    expect(subject).toBe('Ny hentedato for bestilling #ABC123: tirsdag 27. oktober 2026');
    expect(text).toContain('Hei Kari!');
    expect(text).toContain('Vi bekrefter at hentedatoen for bestilling #ABC123 er endret.');
    expect(text).toContain(
      'HENTING\n\nNy dato: tirsdag 27. oktober 2026\nTidligere dato: lørdag 24. oktober 2026\nAdresse: Storgata 1, 0150 Oslo'
    );
    expect(text).toContain('Se bestillingen: https://nooracare.no/orders/details/ord-1');
    expect(text).not.toContain('Henteinstruksjoner');
    expect(text).not.toContain('Passer ikke den nye datoen?');
    expect(text).not.toMatch(/abonnement/i);
    expect(html).toContain('Ny hentedato');
  });

  it('includes the pickup instructions when the order has them, escaped in the HTML', () => {
    const { text, html } = buildPickupRescheduledEmail(
      { ...MOVED, special_instructions_address: 'Ring på hos "Hansen" & vent' },
      { previousPickupDate: '2026-10-24', changedBy: 'customer' },
      OPTIONS
    );

    expect(text).toContain('Henteinstruksjoner: Ring på hos "Hansen" & vent');
    expect(html).toContain('Henteinstruksjoner: Ring på hos &quot;Hansen&quot; &amp; vent');
  });

  it('says NooraCare moved the pickup and invites a reply when an admin changed it', () => {
    const { text } = buildPickupRescheduledEmail(
      MOVED,
      { previousPickupDate: '2026-10-24', changedBy: 'admin' },
      OPTIONS
    );

    expect(text).toContain('Vi har endret hentedatoen for bestilling #ABC123.');
    expect(text).toContain('Passer ikke den nye datoen? Gi oss beskjed ved å svare på denne e-posten.');
    expect(text).not.toContain('Vi bekrefter');
  });
});

describe('buildCleanerConfirmedEmail', () => {
  it('confirms the pickup with date, address, the cleaner display name and the order link', () => {
    const { subject, text, html } = buildCleanerConfirmedEmail(SCHEDULED_ORDER, 'Ola Hansen', OPTIONS);

    expect(subject).toBe('Hentingen er bekreftet – lørdag 24. oktober 2026 (bestilling #ABC123)');
    expect(text).toContain('Hei Kari!');
    expect(text).toContain(
      'Hentingen din er bekreftet. Ola Hansen, en godkjent renser i området, henter tøyet ditt lørdag 24. oktober 2026.'
    );
    expect(text).toContain('Dato: lørdag 24. oktober 2026\nAdresse: Storgata 1, 0150 Oslo\nRenser: Ola Hansen');
    expect(text).toContain('Du trenger ikke gjøre noe mer.');
    expect(text).toContain('Se bestillingen: https://nooracare.no/orders/details/ord-1');
    expect(text).toContain('post@nooracare.no');
    expect(text).not.toMatch(/nabo|abonnement/i);
    expect(html).toContain('Hentingen din er bekreftet');
    expect(html).toContain('href="https://nooracare.no/orders/details/ord-1"');
  });

  it('trims the display name', () => {
    const { text } = buildCleanerConfirmedEmail(SCHEDULED_ORDER, '  Bergen Vask  ', OPTIONS);

    expect(text).toContain('Renser: Bergen Vask');
  });

  it('shows the date the order has now', () => {
    const { subject, text } = buildCleanerConfirmedEmail(
      { ...SCHEDULED_ORDER, scheduled_date: '2026-10-27' },
      'Ola',
      OPTIONS
    );

    expect(subject).toContain('tirsdag 27. oktober 2026');
    expect(text).toContain('Dato: tirsdag 27. oktober 2026');
  });

  it('leaves the name out when the display name is blank', () => {
    const { text } = buildCleanerConfirmedEmail(SCHEDULED_ORDER, '   ', OPTIONS);

    expect(text).toContain(
      'Hentingen din er bekreftet. En godkjent renser i området henter tøyet ditt lørdag 24. oktober 2026.'
    );
    expect(text).not.toContain('Renser:');
  });

  it('escapes the cleaner name in the HTML', () => {
    const { html } = buildCleanerConfirmedEmail(SCHEDULED_ORDER, '<b>Ola</b> Vask', OPTIONS);

    expect(html).toContain('&lt;b&gt;Ola&lt;/b&gt;');
    expect(html).not.toContain('<b>Ola</b>');
  });
});
