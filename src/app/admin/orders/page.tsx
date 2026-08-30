import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { getAllOrdersWithDetails } from '@/lib/database/orders';
import { getAvailableCleanersForCity } from '@/lib/database/cleaners';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { getOrderStatusLabel, getOrderStatusVariant } from '@/lib/utils/order-status';
import { formatKr } from '@/lib/config/pricing';
import { AssignCleanerControl, type CleanerOption } from './AssignCleanerControl';
import type { OrderStatus } from '@/types/database';

const ACTIVE_STATUSES: OrderStatus[] = [
  'pending_assignment',
  'pickup_scheduled',
  'picked_up',
  'in_cleaning',
  'ready_for_delivery',
  'out_for_delivery',
];

/** Statuses where the admin can still (re)assign the cleaner. */
const ASSIGNABLE_STATUSES: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];

const FILTERS: Record<
  string,
  { label: string; statuses?: OrderStatus[]; sort: 'upcoming' | 'newest' }
> = {
  aktive: { label: 'Aktive', statuses: ACTIVE_STATUSES, sort: 'upcoming' },
  venter: { label: 'Venter tildeling', statuses: ['pending_assignment'], sort: 'upcoming' },
  fullfort: { label: 'Fullførte', statuses: ['completed'], sort: 'newest' },
  kansellert: { label: 'Kansellerte', statuses: ['cancelled'], sort: 'newest' },
  alle: { label: 'Alle', sort: 'newest' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', { day: 'numeric', month: 'short' });
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filterKey = status && status in FILTERS ? status : 'aktive';
  const filter = FILTERS[filterKey];

  const orders = await getAllOrdersWithDetails({ statuses: filter.statuses, sort: filter.sort });

  // Cleaner options per city, for the (re)assign controls.
  const assignableCities = [
    ...new Set(
      orders
        .filter((order) => ASSIGNABLE_STATUSES.includes(order.status))
        .map((order) => order.city)
    ),
  ];
  const cleanersByCity: Record<string, CleanerOption[]> = {};
  for (const city of assignableCities) {
    const cleaners = await getAvailableCleanersForCity(city);
    cleanersByCity[city] = cleaners.map((cleaner) => ({
      id: cleaner.id,
      display_name: cleaner.display_name,
    }));
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Ordre
      </h1>

      {/* Status filter chips */}
      <div className="-mx-5 mt-4 overflow-x-auto px-5">
        <div className="flex w-max gap-2 pb-1">
          {Object.entries(FILTERS).map(([key, { label }]) => (
            <Link
              key={key}
              href={key === 'aktive' ? '/admin/orders' : `/admin/orders?status=${key}`}
              className={`inline-flex items-center whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                key === filterKey
                  ? 'border-sea-green bg-sea-green/10 text-sea-green'
                  : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
          <Inbox className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Ingen ordre i dette filteret</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <ul className="divide-y divide-cream-dark/60">
            {orders.map((order) => {
              const assignable = ASSIGNABLE_STATUSES.includes(order.status);
              return (
                <li key={order.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-medium text-dark-gray">
                          #{order.order_number}
                        </span>
                        <StatusBadge variant={getOrderStatusVariant(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </StatusBadge>
                      </div>
                      <p className="mt-1 truncate text-sm text-dark-gray">
                        {order.customer.user.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-medium-gray">
                        {order.city} · Henting {formatDate(order.scheduled_date)} ·{' '}
                        {order.cleaner ? order.cleaner.display_name : 'Ingen renser'}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums text-dark-gray">
                      {order.total_cost_ore !== null ? formatKr(order.total_cost_ore) : '—'}
                    </p>
                  </div>
                  {assignable && (
                    <div className="mt-3">
                      <AssignCleanerControl
                        orderId={order.id}
                        currentCleanerId={order.cleaner_id}
                        cleaners={cleanersByCity[order.city] || []}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
