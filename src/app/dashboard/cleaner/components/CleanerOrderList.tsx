import Link from 'next/link';
import { ChevronRight, Navigation, ShoppingBag } from 'lucide-react';
import { LinkPendingIcon } from '@/components/ui/LinkPendingIcon';
import { daysBetweenISODates } from '@/lib/utils/date';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import { MAX_ROUTE_STOPS, buildRoundTripUrl, optimizeRoundTrip } from '@/lib/utils/route';
import type { OrderWithCustomer } from '../actions';

interface CleanerOrderListProps {
  orders: OrderWithCustomer[];
  /** Today's date in Oslo ('YYYY-MM-DD'). */
  today: string;
  /** Where the cleaner washes — the pickup round starts and ends here. */
  home: { latitude: number | null; longitude: number | null; address: string };
}

type Stage = 'pickup' | 'wash' | 'deliver';

/** "lat,lng" when geocoded, else the street address — Google Maps takes both. */
function mapsPlace(place: { latitude: number | null; longitude: number | null }, address: string) {
  return place.latitude !== null && place.longitude !== null
    ? `${place.latitude},${place.longitude}`
    : address;
}

const BADGE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';

function shortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('no-NO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** When the pickup is, relative to today — late ones stand out. */
function PickupWhen({ scheduledDate, today }: { scheduledDate: string; today: string }) {
  const days = daysBetweenISODates(today, scheduledDate);
  if (days < 0) return <span className={`${BADGE} bg-red-50 text-red-700`}>Forsinket</span>;
  // Due today: the «Hentes i dag» heading already says so.
  if (days === 0) return null;
  return (
    <span className="text-sm tabular-nums text-medium-gray">
      {days === 1 ? 'I morgen' : shortDate(scheduledDate)}
    </span>
  );
}

function OrderRow({
  order,
  stage,
  today,
  stopNumber,
}: {
  order: OrderWithCustomer;
  stage: Stage;
  today: string;
  /** Position in today's round (pickups and deliveries together). */
  stopNumber?: number;
}) {
  const address = `${order.street}, ${order.city}`;
  const detail =
    stage === 'pickup'
      ? `${address} · kl. ${getPickupTimeRangeLabel()}`
      : stage === 'wash'
        ? `Levering ca. ${shortDate(order.delivery_date)}`
        : address;

  return (
    <li>
      <Link
        href={`/dashboard/cleaner/${order.id}`}
        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-cream/50"
      >
        {stopNumber !== undefined && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sm font-semibold tabular-nums text-sea-green">
            {stopNumber}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {stopNumber !== undefined && (
              <span
                className={`${BADGE} shrink-0 ${
                  stage === 'pickup' ? 'bg-nordic-blue/10 text-nordic-blue' : 'bg-sea-green/10 text-sea-green'
                }`}
              >
                {stage === 'pickup' ? 'Hent' : 'Lever'}
              </span>
            )}
            <span className="truncate font-medium text-dark-gray">{order.customer.user.full_name}</span>
          </span>
          <span className="block truncate text-sm text-medium-gray">{detail}</span>
        </span>
        {stage === 'pickup' && <PickupWhen scheduledDate={order.scheduled_date} today={today} />}
        <LinkPendingIcon className="size-4 shrink-0 text-medium-gray">
          <ChevronRight className="size-4 shrink-0 text-medium-gray" />
        </LinkPendingIcon>
      </Link>
    </li>
  );
}

const LIST =
  'divide-y divide-cream-dark/60 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur';

function GroupTitle({ title, count }: { title: string; count: number }) {
  return (
    <h2 className="flex items-center gap-2 font-serif text-lg font-semibold text-dark-gray">
      {title}
      <span className={`${BADGE} bg-sea-green/10 tabular-nums text-sea-green`}>{count}</span>
    </h2>
  );
}

/** Stage of an order that is part of today's round. */
function roundStage(order: OrderWithCustomer): Stage {
  return order.status === 'pickup_scheduled' ? 'pickup' : 'deliver';
}

/**
 * Active orders grouped by what the cleaner does next. «Dagens runde» is one
 * trip: the pickups due today (or overdue) and every order that is clean and
 * ready to hand back — a ready order can be delivered any day, so it rides
 * along with the pickups instead of needing a trip of its own. Later pickups
 * and orders still being washed are listed below. picked_up and
 * out_for_delivery belong to the (dormant) driver flow; an old order in one of
 * them is listed with the stage it sits next to.
 */
export function CleanerOrderList({ orders, today, home }: CleanerOrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
        <ShoppingBag className="size-8 text-cream-dark" />
        <p className="text-medium-gray">Du har ingen oppdrag akkurat nå.</p>
      </div>
    );
  }

  // Orders arrive sorted by pickup date, so the oldest is first in each group.
  const upcoming = orders.filter(
    (order) => order.status === 'pickup_scheduled' && order.scheduled_date > today
  );
  const washing = orders.filter((o) => o.status === 'picked_up' || o.status === 'in_cleaning');
  const stops = orders.filter(
    (order) =>
      (order.status === 'pickup_scheduled' && order.scheduled_date <= today) ||
      order.status === 'ready_for_delivery' ||
      order.status === 'out_for_delivery'
  );
  const pickupCount = stops.filter((order) => roundStage(order) === 'pickup').length;
  const deliveryCount = stops.length - pickupCount;

  // The shortest loop from the cleaner's base and back. Without base
  // coordinates there is nothing to measure from, so the order is kept.
  const round =
    home.latitude !== null && home.longitude !== null
      ? optimizeRoundTrip({ latitude: home.latitude, longitude: home.longitude }, stops)
      : stops;
  const routeUrl = buildRoundTripUrl(
    mapsPlace(home, home.address),
    round.map((order) =>
      mapsPlace(order, `${order.street}, ${order.postal_code} ${order.city}`)
    )
  );

  const groups: { stage: Stage; title: string; orders: OrderWithCustomer[] }[] = [
    { stage: 'pickup', title: 'Kommende hentinger', orders: upcoming },
    { stage: 'wash', title: 'Vaskes', orders: washing },
  ];

  return (
    <div className="space-y-6">
      {round.length > 0 && routeUrl && (
        <section>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <GroupTitle title="Dagens runde" count={round.length} />
              <p className="mt-0.5 text-sm text-medium-gray">
                {[
                  pickupCount > 0 && `Henter ${pickupCount}`,
                  deliveryCount > 0 && `leverer ${deliveryCount}`,
                ]
                  .filter(Boolean)
                  .join(' · ')
                  .replace(/^./, (c) => c.toUpperCase())}
              </p>
            </div>
            <a
              href={routeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-nordic-blue px-4 py-2 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Navigation className="size-4" />
              Åpne ruten
            </a>
          </div>
          <ol className={LIST}>
            {round.map((order, index) => (
              <OrderRow
                key={order.id}
                order={order}
                stage={roundStage(order)}
                today={today}
                stopNumber={index + 1}
              />
            ))}
          </ol>
          {round.length > 1 && (
            <p className="mt-2 px-1 text-sm text-medium-gray">
              {round.length > MAX_ROUTE_STOPS
                ? `Korteste runde fra adressen din og tilbake. Google Maps tar bare ${MAX_ROUTE_STOPS} stopp om gangen, så ruten viser de ${MAX_ROUTE_STOPS} første.`
                : 'Korteste runde fra adressen din og tilbake. «Åpne ruten» viser den i Google Maps.'}
            </p>
          )}
        </section>
      )}

      {groups.map(({ stage, title, orders: stageOrders }) => {
        if (stageOrders.length === 0) return null;
        return (
          <section key={title}>
            <div className="mb-2">
              <GroupTitle title={title} count={stageOrders.length} />
            </div>
            <ul className={LIST}>
              {stageOrders.map((order) => (
                <OrderRow key={order.id} order={order} stage={stage} today={today} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
