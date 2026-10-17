import Link from 'next/link';
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  Repeat,
  Shirt,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { getAdminOverviewCounts } from '@/lib/database/admin-stats';
import {
  getAdminAttention,
  paymentIssueLabel,
  READY_TOO_LONG_DAYS,
  type AttentionOrder,
} from '@/lib/database/admin-attention';
import { AttentionSection, type AttentionRow } from '@/components/admin/AttentionSection';
import { formatKr } from '@/lib/config/pricing';
import { daysBetweenISODates } from '@/lib/utils/date';
import { getOrderStatusLabel } from '@/lib/utils/order-status';
import { formatAgeLabel } from '@/lib/utils/relative-time';
import { getSubscriptionFrequencyLabel } from '@/lib/utils/subscription-status';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
}

/** Order → list row. `meta` is the right-hand text each section decides. */
function orderRow(
  order: AttentionOrder,
  meta: string,
  metaTone: AttentionRow['metaTone'] = 'neutral'
): AttentionRow {
  return {
    key: order.id,
    href: `/admin/orders/${order.id}`,
    title: `#${order.order_number} · ${order.customer.user.full_name}`,
    subtitle: `${order.city} · ${order.cleaner ? order.cleaner.display_name : 'Ingen renser'} · ${getOrderStatusLabel(order.status)}`,
    meta,
    metaTone,
  };
}

function mapRows<T>(items: T[] | null, toRow: (item: T) => AttentionRow): AttentionRow[] | null {
  return items === null ? null : items.map(toRow);
}

export default async function AdminOverviewPage() {
  const now = new Date();
  const [counts, attention] = await Promise.all([getAdminOverviewCounts(), getAdminAttention(now)]);

  const tiles = [
    {
      href: '/admin/orders?status=venter',
      label: 'Venter tildeling',
      value: counts.pendingAssignmentOrders,
      icon: ClipboardList,
      alert: (counts.pendingAssignmentOrders ?? 0) > 0,
    },
    {
      href: '/admin/orders',
      label: 'Aktive ordre',
      value: counts.activeOrders,
      icon: ClipboardList,
      alert: false,
    },
    {
      href: '/admin/cleaners',
      label: 'Rensere venter godkjenning',
      value: counts.pendingCleaners,
      icon: Shirt,
      alert: (counts.pendingCleaners ?? 0) > 0,
    },
    {
      href: '/admin/payments?status=failed',
      label: 'Feilede betalinger',
      value: counts.failedPayments,
      icon: CreditCard,
      alert: (counts.failedPayments ?? 0) > 0,
    },
    {
      href: '/admin/customers',
      label: 'Kunder',
      value: counts.customers,
      icon: Users,
      alert: false,
    },
  ];
  const someCountFailed = tiles.some((tile) => tile.value === null);

  const todayRows = [
    ...(mapRows(attention.pickupsToday, (o) => orderRow(o, 'Henting')) ?? []),
    ...(mapRows(attention.deliveriesToday, (o) => orderRow(o, 'Est. levering')) ?? []),
  ];
  const todayFailed = attention.pickupsToday === null || attention.deliveriesToday === null;

  const overdueRows = [
    ...(mapRows(attention.overduePickups, (o) =>
      orderRow(o, `${daysBetweenISODates(o.scheduled_date, attention.today)} d forsinket`, 'destructive')
    ) ?? []),
    ...(mapRows(attention.readyTooLong, (o) =>
      orderRow(o, `Klar siden ${formatAgeLabel(o.ready_for_delivery_at ?? o.created_at, now)}`, 'warning')
    ) ?? []),
  ];
  const overdueFailed = attention.overduePickups === null || attention.readyTooLong === null;

  const pendingRows = mapRows(attention.pendingAssignment, (o) =>
    orderRow(o, `${formatDate(o.scheduled_date)} · ventet ${formatAgeLabel(o.created_at, now)}`, 'warning')
  );

  const paymentRows = mapRows(attention.paymentsToFollowUp, (payment) => ({
    key: payment.id,
    href: payment.order ? `/admin/orders/${payment.order.id}` : '/admin/payments?status=failed',
    title: `${formatKr(payment.amount_ore)} · ${payment.customer.user.full_name}`,
    subtitle: `${payment.order ? `#${payment.order.order_number}` : 'Uten ordre'} · ${paymentIssueLabel(payment)}`,
    meta: formatDate(payment.created_at),
    metaTone: 'destructive' as const,
  }));

  const notGeneratedRows =
    attention.subscriptionsWithoutOrder === null || attention.agreementsWithoutOrder === null
      ? null
      : [
          ...attention.subscriptionsWithoutOrder.map(
            (s): AttentionRow => ({
              key: `sub-${s.id}`,
              href: `/admin/customers/${s.customer_id}`,
              title: s.customer.user.full_name,
              subtitle: `Abonnement ${getSubscriptionFrequencyLabel(s.frequency).toLowerCase()} · ingen kommende ordre`,
              meta: s.started_at ? `Aktiv siden ${formatDate(s.started_at)}` : 'Aktiv',
              metaTone: 'destructive',
            })
          ),
          ...attention.agreementsWithoutOrder.map(
            (a): AttentionRow => ({
              key: `pa-${a.id}`,
              href: `/admin/customers/${a.customer_id}`,
              title: a.customer.user.full_name,
              subtitle: `Vipps-avtale ${a.provider_agreement_id} · aktiv uten ordre`,
              meta: a.activated_at ? `Aktivert ${formatDate(a.activated_at)}` : 'Aktivert',
              metaTone: 'destructive',
            })
          ),
        ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Oversikt
      </h1>

      {someCountFailed && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>Noen tall kunne ikke hentes. Last siden på nytt.</p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(({ href, label, value, icon: Icon, alert }) => (
          <Link
            key={label}
            href={href}
            className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur transition-all hover:border-sea-green/50"
          >
            <span
              className={`flex size-9 items-center justify-center rounded-full ${
                value === null
                  ? 'bg-red-50 text-red-700'
                  : alert
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-sea-green/12 text-sea-green'
              }`}
            >
              <Icon className="size-5" />
            </span>
            <p className="mt-3 font-serif text-2xl font-semibold tabular-nums text-dark-gray">
              {value === null ? '—' : value}
            </p>
            <p className="text-sm text-medium-gray">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <AttentionSection
          title="I dag"
          icon={CalendarDays}
          tone="info"
          rows={todayFailed ? null : todayRows}
          emptyText="Ingen hentinger eller estimerte leveringer i dag."
        />
        <AttentionSection
          title="Forsinket"
          icon={TriangleAlert}
          tone="destructive"
          rows={overdueFailed ? null : overdueRows}
          emptyText={`Ingen forsinkede hentinger, ingen ordre klar for levering i over ${READY_TOO_LONG_DAYS} dager.`}
        />
        <AttentionSection
          title="Venter på tildeling"
          icon={Clock}
          tone="warning"
          rows={pendingRows}
          emptyText="Alle ordre har en renser."
        />
        <AttentionSection
          title="Betalinger å følge opp"
          icon={CreditCard}
          tone="destructive"
          rows={paymentRows}
          emptyText="Ingen feilede eller fastlåste betalinger."
        />
        <AttentionSection
          title="Ordre ikke generert"
          icon={Repeat}
          tone="destructive"
          rows={notGeneratedRows}
          emptyText="Alle aktive abonnement og avtaler har ordre."
        />
      </div>
    </div>
  );
}
