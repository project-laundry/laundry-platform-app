import { redirect, notFound } from 'next/navigation';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { Check, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getUsersById } from '@/lib/database/users';
import { getCleanerOrderDetails } from '../actions';
import { getPaymentsByOrderId } from '@/lib/database/payments';
import { hasLivePayment } from '@/lib/utils/payment-status';
import { OrderStep } from './OrderStep';
import {
  IRONING_OFFERED,
  formatKr,
  formatKrExact,
  isChargeHeldForPriceReview,
} from '@/lib/config/pricing';
import { monthKeyInOslo, monthLabel, payoutDueDate } from '@/lib/utils/payout';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { buildSingleDestinationUrl } from '@/lib/utils/route';
import { todayInOslo } from '@/lib/utils/date';
import type { CustomerEstimate, OrderStatus } from '@/types/database';

interface OrderDetailsPageProps {
  params: Promise<{ orderId: string }>;
}

// Status display configuration — badge tints per brandbook §4.
const STATUS_CONFIG: Record<OrderStatus, { label: string; className: string }> = {
  pending_assignment: { label: 'Venter på tildeling', className: 'bg-amber-50 text-amber-800' },
  pickup_scheduled: { label: 'Skal hentes', className: 'bg-nordic-blue/10 text-nordic-blue' },
  picked_up: { label: 'Hentet', className: 'bg-nordic-blue/10 text-nordic-blue' },
  in_cleaning: { label: 'Vaskes', className: 'bg-nordic-blue/10 text-nordic-blue' },
  ready_for_delivery: { label: 'Klar til levering', className: 'bg-sea-green/10 text-sea-green' },
  out_for_delivery: { label: 'Leveres', className: 'bg-sea-green/10 text-sea-green' },
  completed: { label: 'Fullført', className: 'bg-cream-dark/60 text-medium-gray' },
  cancelled: { label: 'Kansellert', className: 'bg-red-50 text-red-700' },
};

// The cleaner's journey. picked_up and out_for_delivery belong to the (dormant)
// driver flow and are never entered when the cleaner runs pickup and delivery —
// an old order in one of them shows its place in the journey but has no button.
const JOURNEY = ['Hent', 'Vask', 'Lever'];
const JOURNEY_POSITION: Partial<Record<OrderStatus, number>> = {
  pickup_scheduled: 0,
  picked_up: 1,
  in_cleaning: 1,
  ready_for_delivery: 2,
  out_for_delivery: 2,
  completed: 3,
};
const STEP_BY_STATUS: Partial<Record<OrderStatus, 'pickup' | 'wash' | 'deliver'>> = {
  pickup_scheduled: 'pickup',
  in_cleaning: 'wash',
  ready_for_delivery: 'deliver',
};
const DRIVER_STATUS_INFO: Partial<Record<OrderStatus, string>> = {
  picked_up: 'Tøyet er hentet og på vei til deg.',
  out_for_delivery: 'Tøyet er på vei til kunden.',
};

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('no-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** '3 poser klær, 1 sett sengetøy' — what the customer said at checkout. */
function estimateSummary(estimate: CustomerEstimate): string {
  const parts: string[] = [];
  if (estimate.bags > 0) parts.push(`${estimate.bags} ${estimate.bags === 1 ? 'pose' : 'poser'} klær`);
  if (estimate.bedding_sets > 0) parts.push(`${estimate.bedding_sets} sett sengetøy`);
  if (IRONING_OFFERED) {
    if (estimate.iron_everyday_items > 0) parts.push(`${estimate.iron_everyday_items} vanlige plagg til stryking`);
    if (estimate.iron_formal_items > 0) parts.push(`${estimate.iron_formal_items} skjorter/kjoler til stryking`);
    if (estimate.iron_bedding) parts.push('stryking av sengetøy');
  }
  return parts.join(', ');
}

/** One label/value line in the «Om ordren» card. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="shrink-0 text-sm text-medium-gray">{label}</dt>
      <dd className="min-w-0 text-right text-dark-gray">{children}</dd>
    </div>
  );
}


export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  const { orderId } = await params;

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Role check
  const dbUser = await getUsersById(user.id);
  if (!dbUser || dbUser.role !== 'cleaner') {
    redirect('/dashboard');
  }

  // Get cleaner profile
  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) {
    redirect('/bli-renser/business');
  }

  // Get order details
  const order = await getCleanerOrderDetails(orderId);
  if (!order) {
    notFound();
  }

  const statusConfig = STATUS_CONFIG[order.status];
  const customerName = order.customer.user.full_name;
  const step = STEP_BY_STATUS[order.status];
  const journeyPosition = JOURNEY_POSITION[order.status];
  const isActive = order.status !== 'completed' && order.status !== 'cancelled';

  // The cleaner runs pickup and delivery, so they need the customer's door
  // while the order is active — hidden once it is completed or cancelled.
  const customerPhone = order.customer.user.phone || null;
  const mapsUrl =
    order.latitude !== null && order.longitude !== null
      ? buildSingleDestinationUrl({ latitude: order.latitude, longitude: order.longitude })
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          `${order.street}, ${order.postal_code} ${order.city}`
        )}`;
  // The pickup and delivery steps show the door themselves; everywhere else
  // an active order lists it under «Om ordren».
  const doorInDetails = isActive && step !== 'pickup' && step !== 'deliver';

  // Orders created before ironing was hidden can still carry needs_ironing.
  const needsIroning = IRONING_OFFERED && order.needs_ironing;

  // Marking the order ready charges the customer at the saved price, so the
  // count and the price are locked — and listed — from ready_for_delivery on.
  const priceLocked = order.status !== 'in_cleaning' && order.wash_loads > 0;

  // After «Bekreft og belast» the charge can fail at Vipps: the order still
  // moves on, but the cleaner must not be told the customer paid. Only orders
  // that should carry a charge are checked (0-total promo orders never do).
  const chargeExpected =
    (order.status === 'ready_for_delivery' || order.status === 'out_for_delivery') &&
    order.total_cost_ore !== null &&
    order.total_cost_ore > 0;
  const payments = chargeExpected ? await getPaymentsByOrderId(order.id) : [];
  // Price guard: the charge was never created because the price is far above
  // the customer's estimate and an admin reviews it first. That is not a
  // failed charge, so it gets its own message.
  const chargeHeld = chargeExpected && isChargeHeldForPriceReview(order, payments.length);
  const chargeFailed = chargeExpected && !chargeHeld && !hasLivePayment(payments);

  // A completed order is paid out with the month it was completed in.
  const payoutDue = order.completed_at
    ? payoutDueDate(monthKeyInOslo(new Date(order.completed_at)))
    : null;

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      {/* Header */}
      <AppHeader
        right={
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="truncate font-serif text-lg font-semibold text-dark-gray">
              Ordre #{order.order_number}
            </h1>
            <span
              className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.className}`}
            >
              {statusConfig.label}
            </span>
          </div>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-2xl space-y-4 px-5 pb-16 pt-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
        <BackLink href="/dashboard/cleaner" />

        {/* Where the order is on its way from pickup to delivery */}
        {journeyPosition !== undefined && (
          <ol className="grid grid-cols-3 gap-2">
            {JOURNEY.map((label, index) => {
              const done = index < journeyPosition;
              const current = index === journeyPosition;
              return (
                <li
                  key={label}
                  aria-current={current ? 'step' : undefined}
                  className={`text-sm ${
                    current ? 'font-medium text-dark-gray' : 'text-medium-gray'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`mb-1.5 block h-1.5 rounded-full ${
                      done || current ? 'bg-sea-green' : 'bg-cream-dark'
                    }`}
                  />
                  <span className="inline-flex items-center gap-1">
                    {done && <Check className="size-3.5 text-sea-green" />}
                    {label}
                    {done && <span className="sr-only"> (ferdig)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        {/* The one thing to do now */}
        {step && (
          <OrderStep
            key={order.status}
            orderId={order.id}
            orderNumber={order.order_number}
            step={step}
            customerFirstName={customerName.split(' ')[0]}
            door={{
              street: order.street,
              postalCode: order.postal_code,
              city: order.city,
              instructions: order.special_instructions_address || null,
              mapsUrl,
              phone: customerPhone,
            }}
            pickupWhen={`${formatDate(order.scheduled_date)} · kl. ${getPickupTimeRangeLabel()}`}
            pickupDue={order.scheduled_date <= todayInOslo()}
            washInstructions={order.special_instructions || null}
            needsIroning={needsIroning}
            initialWashLoads={order.wash_loads || 0}
            initialIroningDetails={order.ironing_details}
            initialNotes={order.pricing_notes}
            promo={order.promo}
            totalCostOre={order.total_cost_ore}
            chargeFailed={chargeFailed}
            chargeHeld={chargeHeld}
            estimatedTotalOre={order.customer_estimate?.estimated_total_ore ?? null}
          />
        )}

        {DRIVER_STATUS_INFO[order.status] && (
          <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
            <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
            <p>{DRIVER_STATUS_INFO[order.status]}</p>
          </div>
        )}

        {order.status === 'completed' && (
          <section className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
            <h2 className="font-serif text-2xl font-semibold text-dark-gray">Oppdraget er fullført</h2>
            {order.cleaner_payout_ore !== null && payoutDue && (
              <p className="mt-1 text-medium-gray">
                Du får{' '}
                <span className="font-semibold tabular-nums text-dark-gray">
                  {formatKrExact(order.cleaner_payout_ore)}
                </span>{' '}
                for dette oppdraget, utbetalt innen {Number(payoutDue.slice(8, 10))}.{' '}
                {monthLabel(payoutDue.slice(0, 7))}.
              </p>
            )}
          </section>
        )}

        {order.status === 'cancelled' && (
          <div className="rounded-3xl border border-cream-dark/80 bg-cream/70 px-5 py-6 text-center text-medium-gray">
            Denne ordren er kansellert.
          </div>
        )}

        {/* Everything else there is to know, as one quiet list */}
        <section className="overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <h2 className="px-5 pt-5 font-serif text-lg font-semibold text-dark-gray">Om ordren</h2>
          <dl className="mt-2 divide-y divide-cream-dark/60">
            <DetailRow label="Kunde">{customerName}</DetailRow>
            {doorInDetails && (
              <DetailRow label="Adresse">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-nordic-blue underline-offset-2 hover:underline"
                >
                  {order.street}, {order.postal_code} {order.city}
                </a>
              </DetailRow>
            )}
            {doorInDetails && customerPhone && (
              <DetailRow label="Telefon">
                <a
                  href={`tel:${customerPhone.replace(/\s/g, '')}`}
                  className="font-medium tabular-nums text-nordic-blue underline-offset-2 hover:underline"
                >
                  {customerPhone}
                </a>
              </DetailRow>
            )}
            {doorInDetails && order.special_instructions_address && (
              <DetailRow label="Ved døren">
                <span className="whitespace-pre-line">{order.special_instructions_address}</span>
              </DetailRow>
            )}
            <DetailRow label={order.status === 'pickup_scheduled' ? 'Henting' : 'Hentedato'}>
              <span className="tabular-nums">{formatDate(order.scheduled_date)}</span>
            </DetailRow>
            <DetailRow label="Estimert levering">
              <span className="tabular-nums">{formatDate(order.delivery_date)}</span>
            </DetailRow>
            {order.subscription && (
              <DetailRow label="Fast henting">
                {order.subscription.frequency === 'weekly' && 'Ukentlig'}
                {order.subscription.frequency === 'biweekly' && 'Annenhver uke'}
                {order.subscription.frequency === 'monthly' && 'Månedlig'}
              </DetailRow>
            )}
            {order.customer_estimate && (
              <DetailRow label="Kunden oppga">
                {estimateSummary(order.customer_estimate)}
                <span className="block text-sm tabular-nums text-medium-gray">
                  anslått til ca. {formatKr(order.customer_estimate.estimated_total_ore)}
                </span>
              </DetailRow>
            )}
            {needsIroning && <DetailRow label="Stryking">Inkludert</DetailRow>}
            {/* The wash step shows the customer's note itself */}
            {order.special_instructions && step !== 'wash' && (
              <DetailRow label="Fra kunden">
                <span className="whitespace-pre-line">{order.special_instructions}</span>
              </DetailRow>
            )}
            {priceLocked && (
              <>
                <DetailRow label="Antall vask">
                  <span className="tabular-nums">{order.wash_loads}</span>
                </DetailRow>
                {order.total_cost_ore !== null && (
                  <DetailRow label="Kunden betaler">
                    <span className="tabular-nums">{formatKrExact(order.total_cost_ore)}</span>
                  </DetailRow>
                )}
                {order.cleaner_payout_ore !== null && (
                  <DetailRow label="Du får">
                    <span className="font-semibold tabular-nums">
                      {formatKrExact(order.cleaner_payout_ore)}
                    </span>
                  </DetailRow>
                )}
                {order.pricing_notes && (
                  <DetailRow label="Notat om prisen">
                    <span className="whitespace-pre-line">{order.pricing_notes}</span>
                  </DetailRow>
                )}
              </>
            )}
          </dl>
        </section>
      </main>
    </div>
  );
}
