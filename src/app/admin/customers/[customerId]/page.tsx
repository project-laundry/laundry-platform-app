import { notFound } from 'next/navigation';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import { BackLink } from '@/components/layout/AppHeader';
import { getCustomerWithUserById } from '@/lib/database/customers';
import { getActiveSubscriptionByCustomerId } from '@/lib/database/subscriptions';
import {
  getUpcomingOrdersByCustomerId,
  getCompletedOrdersByCustomerId,
} from '@/lib/database/orders';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import {
  getSubscriptionFrequencyLabel,
  getSubscriptionStatusLabel,
  getSubscriptionStatusVariant,
} from '@/lib/utils/subscription-status';
import { formatKr } from '@/lib/config/pricing';
import type { OrderWithRelations } from '@/types/database';

const HISTORY_LIMIT = 10;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function OrderRow({ order }: { order: OrderWithRelations }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-3.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-medium text-dark-gray">
            #{order.order_number}
          </span>
          <StatusBadge variant={getOrderStatusVariant(order.status)}>
            {getOrderStatusLabel(order.status)}
          </StatusBadge>
        </div>
        <p className="mt-0.5 text-sm text-medium-gray">
          Henting {formatDate(order.scheduled_date)}
        </p>
      </div>
      <p className="shrink-0 text-sm font-medium tabular-nums text-dark-gray">
        {order.total_cost_ore !== null && order.total_cost_ore !== undefined
          ? formatKr(order.total_cost_ore)
          : '—'}
      </p>
    </li>
  );
}

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;

  const customer = await getCustomerWithUserById(customerId);
  if (!customer) {
    notFound();
  }

  const [subscription, upcomingOrders, completedOrders] = await Promise.all([
    getActiveSubscriptionByCustomerId(customer.id),
    getUpcomingOrdersByCustomerId(customer.id),
    getCompletedOrdersByCustomerId(customer.id),
  ]);
  const defaults = subscription?.order_defaults ?? null;
  const historyOrders = completedOrders.slice(0, HISTORY_LIMIT);
  const olderCount = completedOrders.length - historyOrders.length;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/customers" label="Kunder" />
      </div>

      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        {customer.user.full_name}
      </h1>

      {/* Contact */}
      <section className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
            <UserRound className="size-5" />
          </span>
          <h2 className="font-serif text-lg font-semibold text-dark-gray">Kontakt</h2>
        </div>
        <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-medium-gray">E-post</dt>
            <dd className="font-medium text-dark-gray">{customer.user.email}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">Telefon</dt>
            <dd className="font-medium tabular-nums text-dark-gray">{customer.user.phone}</dd>
          </div>
          <div>
            <dt className="text-medium-gray">Kunde siden</dt>
            <dd className="font-medium tabular-nums text-dark-gray">
              {formatDate(customer.created_at)}
            </dd>
          </div>
        </dl>
      </section>

      {/* Subscription */}
      <section className="mt-4 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
            <CalendarDays className="size-5" />
          </span>
          <h2 className="font-serif text-lg font-semibold text-dark-gray">Abonnement</h2>
        </div>
        {subscription ? (
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant={getSubscriptionStatusVariant(subscription.status)}>
                {getSubscriptionStatusLabel(subscription.status)}
              </StatusBadge>
              <span className="text-dark-gray">
                {getSubscriptionFrequencyLabel(subscription.frequency)}
              </span>
            </div>
            {defaults?.initial_address && (
              <div className="flex items-start gap-2 text-medium-gray">
                <MapPin className="mt-0.5 size-4 shrink-0 text-sea-green" />
                <p>
                  {defaults.initial_address.street}, {defaults.initial_address.postal_code}{' '}
                  {defaults.initial_address.city}
                  {defaults.default_needs_ironing ? ' · Stryking' : ''}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm text-medium-gray">Ingen aktivt abonnement</p>
        )}
      </section>

      {/* Orders */}
      <section className="mt-4 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
        <h2 className="px-5 pb-3 pt-4 font-serif text-lg font-semibold text-dark-gray">Ordre</h2>
        {upcomingOrders.length === 0 && historyOrders.length === 0 ? (
          <p className="border-t border-cream-dark/60 px-5 py-6 text-sm text-medium-gray">
            Ingen ordre ennå
          </p>
        ) : (
          <ul className="divide-y divide-cream-dark/60 border-t border-cream-dark/60">
            {upcomingOrders.map((order) => (
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
