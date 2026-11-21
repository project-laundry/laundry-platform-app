import { describe, it, expect } from 'vitest';
import type { OrderForCustomerEmail } from '@/lib/database/orders';
import { buildOrderConfirmationEmail, buildPaymentFailedEmail, buildPriceReceiptEmail, formatKrExact, formatLongDate } from './customer-emails';

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
};

/** The dormant variant: the first order of a weekly subscription. */
const SUBSCRIPTION_ORDER: OrderForCustomerEmail = {
  ...ORDER,
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
    const { subject, text, html } = buildOrderConfirmationEmail(ORDER, OPTIONS);

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
