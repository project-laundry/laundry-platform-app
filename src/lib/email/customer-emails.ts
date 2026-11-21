// Customer e-mail builders — pure (no I/O), unit tested. Each builder turns
// an order loaded by getOrderForCustomerEmail into { subject, text, html }.
// Text and HTML are rendered from ONE block list so they can never drift,
// and the HTML wrapper mirrors supabase/templates/confirmation.html so every
// NooraCare e-mail looks the same. Sending lives in
// lib/services/customer-emails.ts.
//
// Wording rules (CLAUDE.md): customers count "poser" (estimate), the binding
// price is per machine ("maskiner"), kilos only appear as the weighed weight,
// and every price e-mail restates: checkout = estimate, cleaner = binding price.

import { COMPANY } from '@/lib/config/company';
import { IRONING_OFFERED, formatKr, formatKrExact } from '@/lib/config/pricing';
import type { OrderForCustomerEmail } from '@/lib/database/orders';
import { getSubscriptionFrequencyLabel } from '@/lib/utils/subscription-status';
import type { CustomerEstimate } from '@/types/database';

export interface CustomerEmail {
  subject: string;
  text: string;
  html: string;
}

export interface CustomerEmailOptions {
  /** Public origin (NEXT_PUBLIC_APP_URL); trailing slash tolerated. */
  appUrl: string;
}

// ─── Content model ──────────────────────────────────────────────────────────

interface Row {
  label: string;
  value: string;
  strong?: boolean;
}

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'rows'; rows: Row[] }
  | { type: 'button'; label: string; url: string };

const heading = (text: string): Block => ({ type: 'heading', text });
const paragraph = (text: string): Block => ({ type: 'paragraph', text });
const rows = (list: Row[]): Block => ({ type: 'rows', rows: list });
const button = (label: string, url: string): Block => ({ type: 'button', label, url });

// ─── Formatting helpers ─────────────────────────────────────────────────────

// Charged amounts use formatKrExact from lib/config/pricing (41840 → "418,40 kr",
// 50000 → "500 kr" — øre are never dropped); estimates use formatKr (whole
// kroner). Re-exported so the e-mail module keeps exposing it.
export { formatKrExact };

/** "lørdag 24. oktober 2026" from YYYY-MM-DD. Noon UTC keeps the calendar day in Oslo. */
export function formatLongDate(isoDate: string): string {
  return new Intl.DateTimeFormat('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Oslo',
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function baseUrl(options: CustomerEmailOptions): string {
  return options.appUrl.replace(/\/$/, '');
}

function orderUrl(order: OrderForCustomerEmail, options: CustomerEmailOptions): string {
  return `${baseUrl(options)}/orders/details/${order.id}`;
}

function greeting(order: OrderForCustomerEmail): Block {
  const firstName = order.customer.user.full_name.trim().split(/\s+/)[0];
  return paragraph(firstName ? `Hei ${firstName}!` : 'Hei!');
}

function closing(): Block {
  return paragraph(`Spørsmål? Svar på denne e-posten eller skriv til ${COMPANY.email}.`);
}

/** "Det du sender" lines from the checkout selection; ironing only while it is offered. */
function estimateRows(estimate: CustomerEstimate): Row[] {
  const list: Row[] = [];
  if (estimate.bags > 0) {
    list.push({ label: 'Klær', value: `${estimate.bags} ${estimate.bags === 1 ? 'pose' : 'poser'}` });
  }
  if (estimate.bedding_sets > 0) {
    list.push({ label: 'Sengetøy', value: `${estimate.bedding_sets} sett` });
  }
  if (IRONING_OFFERED) {
    if (estimate.iron_everyday_items > 0) {
      list.push({ label: 'Stryking av vanlige plagg', value: `${estimate.iron_everyday_items} plagg` });
    }
    if (estimate.iron_formal_items > 0) {
      list.push({ label: 'Stryking av skjorter & kjoler', value: `${estimate.iron_formal_items} plagg` });
    }
    if (estimate.iron_bedding && estimate.bedding_sets > 0) {
      list.push({ label: 'Stryking av sengetøy', value: `${estimate.bedding_sets} sett` });
    }
  }
  return list;
}

// ─── Renderers ──────────────────────────────────────────────────────────────

function renderText(blocks: Block[]): string {
  const parts = blocks.map((block) => {
    switch (block.type) {
      case 'heading':
        return block.text.toUpperCase();
      case 'paragraph':
        return block.text;
      case 'rows':
        return block.rows.map((row) => `${row.label}: ${row.value}`).join('\n');
      case 'button':
        return `${block.label}: ${block.url}`;
    }
  });
  return `${parts.join('\n\n')}\n`;
}

const FONT = "Jost,'Helvetica Neue',Arial,sans-serif";

function renderBlockHtml(block: Block): string {
  switch (block.type) {
    case 'heading':
      return `<p style="margin:24px 0 8px;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#3D6A7B;">${escapeHtml(block.text)}</p>`;
    case 'paragraph':
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1E3A4C;">${escapeHtml(block.text)}</p>`;
    case 'rows':
      return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#1E3A4C;">${block.rows
        .map((row) => {
          const weight = row.strong ? 'font-weight:600;' : '';
          return `<tr><td style="padding:4px 0;${weight}">${escapeHtml(row.label)}</td><td align="right" style="padding:4px 0 4px 16px;white-space:nowrap;${weight}">${escapeHtml(row.value)}</td></tr>`;
        })
        .join('')}</table>`;
    case 'button':
      return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;"><tr><td style="border-radius:999px;background-color:#1E3A4C;"><a href="${escapeHtml(block.url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:500;color:#FFFFFF;text-decoration:none;border-radius:999px;">${escapeHtml(block.label)}</a></td></tr></table>`;
  }
}

function renderHtml(title: string, blocks: Block[], siteUrl: string): string {
  return `<!DOCTYPE html>
<html lang="no">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F7F5F0;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F7F5F0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;background-color:#FDFCFA;border:1px solid #E9E1D3;border-radius:24px;">
            <tr>
              <td style="padding:32px 28px;font-family:${FONT};color:#1E3A4C;">
                <p style="margin:0 0 12px;font-size:12px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#3D6A7B;">NooraCare</p>
                <h1 style="margin:0 0 16px;font-family:Fraunces,Georgia,'Times New Roman',serif;font-size:26px;font-weight:600;line-height:1.25;color:#1E3A4C;">${escapeHtml(title)}</h1>
                ${blocks.map(renderBlockHtml).join('\n                ')}
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#586974;">NooraCare · <a href="mailto:${COMPANY.email}" style="color:#3D6A7B;">${COMPANY.email}</a><br /><a href="${escapeHtml(siteUrl)}" style="color:#3D6A7B;">${escapeHtml(siteUrl)}</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function finish(
  subject: string,
  title: string,
  blocks: Block[],
  options: CustomerEmailOptions
): CustomerEmail {
  return {
    subject,
    text: renderText(blocks),
    html: renderHtml(title, blocks, baseUrl(options)),
  };
}

// ─── #23 Order confirmation ─────────────────────────────────────────────────

/**
 * Sent once the first order exists (agreement activated). Sets the
 * expectation that the checkout price is an estimate and the cleaner sets
 * the binding price after pickup. Subscription wording only for a
 * subscription order; a one-time order never mentions one.
 */
export function buildOrderConfirmationEmail(
  order: OrderForCustomerEmail,
  options: CustomerEmailOptions
): CustomerEmail {
  const subscription =
    order.subscription && order.subscription.frequency !== 'on_demand' ? order.subscription : null;
  const estimate = order.customer_estimate;
  const pickupDate = formatLongDate(order.scheduled_date);

  const blocks: Block[] = [
    greeting(order),
    paragraph(
      subscription
        ? 'Takk for bestillingen! Abonnementet ditt er i gang, og første henting er bekreftet.'
        : 'Takk for bestillingen! Hentingen din er bekreftet.'
    ),
    heading('Henting'),
    rows([
      { label: 'Dato', value: pickupDate },
      { label: 'Adresse', value: `${order.street}, ${order.postal_code} ${order.city}` },
    ]),
  ];

  const items = estimate ? estimateRows(estimate) : [];
  if (items.length > 0) {
    blocks.push(heading('Det du sender'), rows(items));
  }

  blocks.push(heading('Pris'));
  if (estimate) {
    blocks.push(rows([{ label: 'Estimat', value: `ca. ${formatKr(estimate.estimated_total_ore)}` }]));
  }
  blocks.push(
    paragraph(
      'Estimatet er veiledende. Den endelige prisen settes av renseren etter henting, ut fra hvor mye tøy du faktisk sender – du betaler for faktisk mengde, ikke for estimatet. Beløpet trekkes via Vipps-avtalen din når tøyet er ferdig vasket, og du får en egen e-post med den endelige prisen.'
    )
  );
  if (order.promo) {
    blocks.push(paragraph(`Rabattkoden ${order.promo.code} trekkes fra den endelige prisen.`));
  }

  if (subscription) {
    blocks.push(
      heading('Abonnement'),
      paragraph(
        `Henting ${getSubscriptionFrequencyLabel(subscription.frequency).toLowerCase()}. Neste henting settes opp automatisk når tøyet er levert. Du kan si opp abonnementet når som helst under «Abonnement» på Min side: ${baseUrl(options)}/dashboard/subscription`
      )
    );
  }

  blocks.push(button('Se bestillingen', orderUrl(order, options)), closing());

  return finish(
    `Bestilling #${order.order_number} er bekreftet – henting ${pickupDate}`,
    'Bestillingen din er bekreftet',
    blocks,
    options
  );
}
