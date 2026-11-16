// Builds the daily admin digest e-mail (subject + plain text) from the same
// attention data the /admin overview renders. Pure: no I/O, so it is unit
// tested and the cron route only has to send it.

import {
  paymentIssueLabel,
  type AdminAttention,
  type AttentionOrder,
  type AttentionPayment,
  type AttentionSubscription,
  type AttentionAgreement,
  READY_TOO_LONG_DAYS,
} from '@/lib/database/admin-attention';
import { formatKr } from '@/lib/config/pricing';
import { daysBetweenISODates } from '@/lib/utils/date';
import { getOrderStatusLabel } from '@/lib/utils/order-status';
import { formatAgeLabel } from '@/lib/utils/relative-time';
import { getSubscriptionFrequencyLabel } from '@/lib/utils/subscription-status';

const COULD_NOT_LOAD = '!! Kunne ikke hente denne listen – sjekk /admin';

export interface AdminDigest {
  subject: string;
  text: string;
}

function formatOsloDate(now: Date): string {
  return new Intl.DateTimeFormat('nb-NO', {
    timeZone: 'Europe/Oslo',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
}

function heading(title: string, items: unknown[] | null): string {
  return `${title} (${items === null ? '?' : items.length})`;
}

function section(title: string, lines: string[] | null, emptyText: string): string {
  const body = lines === null ? COULD_NOT_LOAD : lines.length === 0 ? emptyText : lines.join('\n');
  return `${heading(title, lines)}\n${body}`;
}

/** null stays null (failed query); otherwise one text line per item. */
function mapLines<T>(items: T[] | null, toLine: (item: T) => string): string[] | null {
  return items === null ? null : items.map(toLine);
}

export function buildAdminDigest(
  attention: AdminAttention,
  options: { appUrl: string; now: Date }
): AdminDigest {
  const base = options.appUrl.replace(/\/$/, '');
  const { now } = options;

  const orderLine = (order: AttentionOrder, meta: string): string =>
    `- #${order.order_number} ${order.customer.user.full_name} · ${order.city} · ${
      order.cleaner ? order.cleaner.display_name : 'Ingen renser'
    } · ${meta}\n  ${base}/admin/orders/${order.id}`;

  const paymentLine = (payment: AttentionPayment): string =>
    `- ${formatKr(payment.amount_ore)} ${payment.customer.user.full_name} · ${
      payment.order ? `#${payment.order.order_number}` : 'Uten ordre'
    } · ${paymentIssueLabel(payment)}\n  ${
      payment.order ? `${base}/admin/orders/${payment.order.id}` : `${base}/admin/payments?status=failed`
    }`;

  const subscriptionLine = (subscription: AttentionSubscription): string =>
    `- ${subscription.customer.user.full_name} · abonnement ${getSubscriptionFrequencyLabel(
      subscription.frequency
    ).toLowerCase()} · ingen kommende ordre\n  ${base}/admin/customers/${subscription.customer_id}`;

  const agreementLine = (agreement: AttentionAgreement): string =>
    `- ${agreement.customer.user.full_name} · Vipps-avtale ${agreement.provider_agreement_id} aktiv uten ordre\n  ${base}/admin/customers/${agreement.customer_id}`;

  const pickupsToday = mapLines(attention.pickupsToday, (o) =>
    orderLine(o, getOrderStatusLabel(o.status))
  );
  const deliveriesToday = mapLines(attention.deliveriesToday, (o) =>
    orderLine(o, getOrderStatusLabel(o.status))
  );
  const overduePickups = mapLines(attention.overduePickups, (o) =>
    orderLine(o, `${daysBetweenISODates(o.scheduled_date, attention.today)} d forsinket`)
  );
  const readyTooLong = mapLines(attention.readyTooLong, (o) =>
    orderLine(o, `klar siden ${formatAgeLabel(o.ready_for_delivery_at ?? o.created_at, now)}`)
  );
  const pendingAssignment = mapLines(attention.pendingAssignment, (o) =>
    orderLine(o, `henting ${o.scheduled_date} · ventet ${formatAgeLabel(o.created_at, now)}`)
  );
  const payments = mapLines(attention.paymentsToFollowUp, paymentLine);
  const notGenerated =
    attention.subscriptionsWithoutOrder === null || attention.agreementsWithoutOrder === null
      ? null
      : [
          ...attention.subscriptionsWithoutOrder.map(subscriptionLine),
          ...attention.agreementsWithoutOrder.map(agreementLine),
        ];

  const problemLists = [overduePickups, readyTooLong, pendingAssignment, payments, notGenerated];
  const problems = problemLists.reduce((sum, list) => sum + (list === null ? 0 : list.length), 0);
  const failedQueries = [pickupsToday, deliveriesToday, ...problemLists].filter(
    (list) => list === null
  ).length;

  const dateLabel = formatOsloDate(now);
  let subject = `NooraCare ${dateLabel}: ${
    problems === 0 ? 'ingenting å følge opp' : `${problems} å følge opp`
  }`;
  if (failedQueries > 0) subject += ' – noen lister kunne ikke hentes';

  const text = [
    `Admin-oppsummering for ${dateLabel}`,
    '',
    section('I DAG – henting', pickupsToday, 'Ingen hentinger i dag.'),
    '',
    section('I DAG – estimert levering', deliveriesToday, 'Ingen estimerte leveringer i dag.'),
    '',
    section('FORSINKET – ikke hentet', overduePickups, 'Ingen.'),
    '',
    section(`KLAR FOR LEVERING I OVER ${READY_TOO_LONG_DAYS} DAGER`, readyTooLong, 'Ingen.'),
    '',
    section('VENTER PÅ TILDELING', pendingAssignment, 'Ingen.'),
    '',
    section('BETALINGER Å FØLGE OPP', payments, 'Ingen.'),
    '',
    section('ORDRE IKKE GENERERT', notGenerated, 'Ingen.'),
    '',
    `Oversikt: ${base}/admin`,
    '',
  ].join('\n');

  return { subject, text };
}
