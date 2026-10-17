import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Briefcase,
  CalendarDays,
  Landmark,
  MapPin,
  ShieldCheck,
  UserRound,
  WashingMachine,
} from 'lucide-react';
import { BackLink } from '@/components/layout/AppHeader';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getCleanerWithUserById } from '@/lib/database/cleaners';
import { getCompletedOrdersByCleanerId, getOrdersByCleanerId } from '@/lib/database/orders';
import type { OrderWithCustomer } from '@/lib/database/orders';
import {
  CLEANER_VERIFICATION_LABELS,
  CLEANER_VERIFICATION_VARIANT,
} from '@/lib/utils/cleaner-status';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import {
  monthKeyInOslo,
  monthLabel,
  previousMonthKey,
  sumCleanerPayoutOre,
  sumCleanerPayoutOreForMonth,
} from '@/lib/utils/payout';
import { buildSingleDestinationUrl } from '@/lib/utils/route';
import {
  experienceLevelLabel,
  formatActiveDays,
  machineConditionLabel,
} from '@/lib/config/cleaner-options';
import { formatKr } from '@/lib/config/pricing';
import { CleanerActivationButton } from '../CleanerActivationButton';
import { CleanerAcceptingOrdersButton } from '../CleanerAcceptingOrdersButton';
import { CleanerRejectControl } from './CleanerRejectControl';
import { RevealField } from './RevealField';

const HISTORY_LIMIT = 10;

const cardClass =
  'rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
        {icon}
      </span>
      <h2 className="font-serif text-lg font-semibold text-dark-gray">{title}</h2>
    </div>
  );
}

function OrderRow({ order }: { order: OrderWithCustomer }) {
  return (
    <li>
      <Link
        href={`/admin/orders/${order.id}`}
        className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-cream/40"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-dark-gray">
              #{order.order_number}
            </span>
            <StatusBadge variant={getOrderStatusVariant(order.status)}>
              {getOrderStatusLabel(order.status)}
            </StatusBadge>
          </div>
          <p className="mt-0.5 truncate text-sm text-medium-gray">
            {order.customer.user.full_name} · Henting {formatDate(order.scheduled_date)}
          </p>
        </div>
        <p className="shrink-0 text-sm font-medium tabular-nums text-dark-gray">
          {order.cleaner_payout_ore !== null ? formatKr(order.cleaner_payout_ore) : '—'}
        </p>
      </Link>
    </li>
  );
}

export default async function AdminCleanerDetailPage({
  params,
}: {
  params: Promise<{ cleanerId: string }>;
}) {
  const { cleanerId } = await params;

  const cleaner = await getCleanerWithUserById(cleanerId);
  if (!cleaner) {
    notFound();
  }

  const [activeOrders, completedOrders] = await Promise.all([
    getOrdersByCleanerId(cleaner.id),
    getCompletedOrdersByCleanerId(cleaner.id),
  ]);
  const historyOrders = completedOrders.slice(0, HISTORY_LIMIT);
  const olderCount = completedOrders.length - historyOrders.length;

  const thisMonth = monthKeyInOslo();
  const lastMonth = previousMonthKey(thisMonth);
  const payoutFigures = [
    { label: `Fullført i ${monthLabel(lastMonth)}`, ore: sumCleanerPayoutOreForMonth(completedOrders, lastMonth) },
    { label: `Fullført i ${monthLabel(thisMonth)}`, ore: sumCleanerPayoutOreForMonth(completedOrders, thisMonth) },
    { label: 'Totalt opptjent', ore: sumCleanerPayoutOre(completedOrders) },
  ];

  const isApproved = cleaner.verification_status === 'approved';
  const isPending = cleaner.verification_status === 'pending';
  const isBusiness = cleaner.business_type === 'business';

  // Same fallback as the cleaner mission page: directions when geocoded,
  // otherwise a search for the typed address.
  const mapsUrl =
    cleaner.latitude !== null && cleaner.longitude !== null
      ? buildSingleDestinationUrl({ latitude: cleaner.latitude, longitude: cleaner.longitude })
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${cleaner.base_street}, ${cleaner.base_postal_code} ${cleaner.base_city}`
        )}`;

  // Only the timestamps that are set render; approval clears the other two.
  const history = [
    { label: 'Søkte', at: cleaner.created_at },
    { label: 'Godkjent', at: cleaner.approved_at },
    { label: 'Deaktivert', at: cleaner.suspended_at },
    { label: 'Avvist', at: cleaner.rejected_at },
  ].filter((step): step is { label: string; at: string } => step.at !== null);

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/cleaners" label="Rensere" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
          {cleaner.display_name}
        </h1>
        <StatusBadge variant={CLEANER_VERIFICATION_VARIANT[cleaner.verification_status]}>
          {CLEANER_VERIFICATION_LABELS[cleaner.verification_status]}
        </StatusBadge>
        {isApproved && !cleaner.is_accepting_orders && (
          <StatusBadge variant="neutral">Tar ikke imot nye oppdrag</StatusBadge>
        )}
      </div>
      <p className="mt-1 text-sm text-medium-gray">
        {cleaner.user.full_name} · Søkte {formatDate(cleaner.created_at)}
      </p>

      {/* Status + actions */}
      <section className={`mt-6 ${cardClass}`}>
        <SectionHeading icon={<ShieldCheck className="size-5" />} title="Status" />
        <ol className="mt-4 space-y-1.5 text-sm">
          {history.map((step) => (
            <li key={step.label} className="flex items-center justify-between gap-3">
              <span className="text-dark-gray">{step.label}</span>
              <span className="tabular-nums text-medium-gray">{formatDate(step.at)}</span>
            </li>
          ))}
        </ol>
        {cleaner.verification_status === 'rejected' && cleaner.rejection_reason && (
          <div className="mt-3 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
            <p className="text-xs font-medium uppercase tracking-[0.18em]">Begrunnelse</p>
            <p className="mt-1 whitespace-pre-line">{cleaner.rejection_reason}</p>
          </div>
        )}
        <div className="mt-4 flex flex-wrap items-start gap-2">
          <CleanerActivationButton cleanerId={cleaner.id} status={cleaner.verification_status} />
          {isApproved && (
            <CleanerAcceptingOrdersButton
              cleanerId={cleaner.id}
              isAcceptingOrders={cleaner.is_accepting_orders}
            />
          )}
        </div>
        {isPending && (
          <div className="mt-3">
            <CleanerRejectControl cleanerId={cleaner.id} />
          </div>
        )}
      </section>

      {/* Contact */}
      <section className={`mt-4 ${cardClass}`}>
        <SectionHeading icon={<UserRound className="size-5" />} title="Kontakt" />
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-medium-gray">Navn</dt>
            <dd className="font-medium text-dark-gray">{cleaner.user.full_name}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">E-post</dt>
            <dd className="font-medium text-dark-gray">
              <a href={`mailto:${cleaner.user.email}`} className="hover:text-nordic-blue">
                {cleaner.user.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-medium-gray">Telefon</dt>
            <dd className="font-medium tabular-nums text-dark-gray">
              <a href={`tel:${cleaner.user.phone.replace(/\s/g, '')}`} className="hover:text-nordic-blue">
                {cleaner.user.phone}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-medium-gray">Erfaring</dt>
            <dd className="font-medium text-dark-gray">
              {experienceLevelLabel(cleaner.experience_level)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Business + payout details */}
      <section className={`mt-4 ${cardClass}`}>
        <SectionHeading icon={<Briefcase className="size-5" />} title="Virksomhet og utbetaling" />
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-medium-gray">Driver som</dt>
            <dd className="font-medium text-dark-gray">
              {isBusiness ? 'Registrert virksomhet' : 'Privatperson'}
            </dd>
          </div>
          <div>
            <dt className="text-medium-gray">{isBusiness ? 'Organisasjonsnummer' : 'Fødselsnummer'}</dt>
            <dd>
              <RevealField
                value={cleaner.tax_id}
                label={isBusiness ? 'organisasjonsnummer' : 'fødselsnummer'}
              />
            </dd>
          </div>
          {isBusiness && (
            <>
              <div>
                <dt className="text-medium-gray">Firmanavn</dt>
                <dd className="font-medium text-dark-gray">{cleaner.business_name || '—'}</dd>
              </div>
              <div>
                <dt className="text-medium-gray">Forretningsadresse</dt>
                <dd className="font-medium text-dark-gray">{cleaner.business_address || '—'}</dd>
              </div>
            </>
          )}
          <div>
            <dt className="text-medium-gray">Kontonummer</dt>
            <dd>
              <RevealField value={cleaner.bank_account} label="kontonummer" />
            </dd>
          </div>
        </dl>
      </section>

      {/* Base address */}
      <section className={`mt-4 ${cardClass}`}>
        <SectionHeading icon={<MapPin className="size-5" />} title="Vasker på" />
        <p className="mt-4 text-sm font-medium text-dark-gray">
          {cleaner.base_street}, {cleaner.base_postal_code} {cleaner.base_city}
        </p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-sm font-medium text-sea-green underline-offset-2 hover:underline"
        >
          Åpne i Google Maps
        </a>
        {cleaner.latitude === null && (
          <p className="mt-1 text-xs text-medium-gray">Adressen er ikke geokodet ennå.</p>
        )}
      </section>

      {/* Machine + availability */}
      <section className={`mt-4 ${cardClass}`}>
        <SectionHeading icon={<WashingMachine className="size-5" />} title="Vaskemaskin og dager" />
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-medium-gray">Vaskemaskin</dt>
            <dd className="font-medium text-dark-gray">
              {cleaner.machine_brand
                ? `${cleaner.machine_brand} · ${cleaner.machine_capacity_kg} kg · ${cleaner.machine_year} · ${machineConditionLabel(cleaner.machine_condition)}`
                : 'Ikke registrert'}
            </dd>
          </div>
          <div>
            <dt className="text-medium-gray">Henter på</dt>
            <dd className="font-medium text-dark-gray">{formatActiveDays(cleaner.weekly_schedule)}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">Nye oppdrag</dt>
            <dd className="font-medium text-dark-gray">
              {cleaner.is_accepting_orders ? 'Tar imot' : 'Satt på pause'}
            </dd>
          </div>
        </dl>
      </section>

      {/* Payout */}
      <section className={`mt-4 ${cardClass}`}>
        <SectionHeading icon={<Landmark className="size-5" />} title="Utbetaling" />
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          {payoutFigures.map((figure) => (
            <div key={figure.label}>
              <p className="text-medium-gray">{figure.label}</p>
              <p className="font-serif text-xl font-semibold tabular-nums text-dark-gray">
                {formatKr(figure.ore)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Orders */}
      <section className="mt-4 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="px-5 pb-3 pt-4">
          <SectionHeading icon={<CalendarDays className="size-5" />} title="Ordre" />
        </div>
        {activeOrders.length === 0 && historyOrders.length === 0 ? (
          <p className="border-t border-cream-dark/60 px-5 py-6 text-sm text-medium-gray">
            Ingen ordre ennå
          </p>
        ) : (
          <ul className="divide-y divide-cream-dark/60 border-t border-cream-dark/60">
            {activeOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
            {historyOrders.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </ul>
        )}
        {olderCount > 0 && (
          <p className="border-t border-cream-dark/60 px-5 py-3 text-xs text-medium-gray">
            + {olderCount} eldre ordre
          </p>
        )}
      </section>
    </div>
  );
}
