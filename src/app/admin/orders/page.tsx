'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { ClipboardList, Inbox, Route } from 'lucide-react';
import {
  getPendingAssignmentOrders,
  getCleanersForCity,
  assignCleanerAction,
  type OrderWithDetails,
  type CleanerOption,
} from './actions';
import { oreToNok } from '@/lib/config/pricing';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [cleanersByCity, setCleanersByCity] = useState<Record<string, CleanerOption[]>>({});
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  // Fetch pending orders and the cleaner options for each of their cities.
  const fetchPendingData = useCallback(async () => {
    const pendingOrders = await getPendingAssignmentOrders();

    const cities = [...new Set(pendingOrders.map((o) => o.city))];
    const cleanersMap: Record<string, CleanerOption[]> = {};

    for (const city of cities) {
      cleanersMap[city] = await getCleanersForCity(city);
    }

    return { pendingOrders, cleanersMap };
  }, []);

  const applyPendingData = useCallback(
    ({
      pendingOrders,
      cleanersMap,
    }: {
      pendingOrders: OrderWithDetails[];
      cleanersMap: Record<string, CleanerOption[]>;
    }) => {
      setOrders(pendingOrders);
      setCleanersByCity(cleanersMap);
      setLoading(false);
    },
    []
  );

  useEffect(() => {
    fetchPendingData().then(applyPendingData);
  }, [fetchPendingData, applyPendingData]);

  async function handleAssign(orderId: string, cleanerId: string) {
    setAssigning(orderId);
    const result = await assignCleanerAction(orderId, cleanerId);

    if (result.success) {
      // Reload orders after assignment
      applyPendingData(await fetchPendingData());
    } else {
      alert(result.error || 'Failed to assign cleaner');
    }

    setAssigning(null);
  }

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

      <AppHeader
        maxWidth="max-w-5xl"
        right={
          <Link
            href="/dashboard/driver"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-nordic-blue hover:underline"
          >
            <Route className="size-4" />
            Kjøreplan
          </Link>
        }
      />

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-8">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Admin
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Ordre som venter tildeling
          </h1>
        </div>

        {loading ? (
          <div className="mt-6 space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-cream-dark/50" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
            <Inbox className="size-8 text-cream-dark" />
            <p className="text-medium-gray">Ingen ordre venter på tildeling</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order, index) => {
              const city = order.city;
              const availableCleaners = cleanersByCity[city] || [];

              return (
                <div
                  key={order.id}
                  className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500"
                  style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                        <ClipboardList className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-serif text-lg font-semibold leading-none text-dark-gray">
                          Ordre #{order.order_number}
                        </h3>
                        <p className="mt-1 text-sm text-medium-gray">
                          {order.customer.user.full_name}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                      Venter tildeling
                    </span>
                  </div>

                  <div className="mb-4 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-medium-gray">Hentedato</p>
                      <p className="font-medium tabular-nums text-dark-gray">
                        {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-medium-gray">Estimert levering</p>
                      <p className="font-medium tabular-nums text-dark-gray">
                        {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-medium-gray">Adresse</p>
                      <p className="font-medium text-dark-gray">
                        {order.street}, {order.postal_code} {city}
                      </p>
                    </div>
                    <div>
                      <p className="text-medium-gray">Beløp</p>
                      <p className="font-medium tabular-nums text-dark-gray">
                        {order.total_cost_ore ? `${oreToNok(order.total_cost_ore)} NOK` : 'Ikke beregnet'}
                      </p>
                    </div>
                  </div>

                  {/* Add-ons */}
                  {order.needs_ironing && (
                    <div className="mb-4 text-sm">
                      <p className="mb-1 text-medium-gray">Tillegg:</p>
                      <div className="flex gap-2">
                        <span className="inline-flex items-center rounded-full bg-nordic-blue/10 px-2.5 py-0.5 text-xs font-medium text-nordic-blue">
                          Stryking
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cleaner assignment */}
                  <div className="border-t border-cream-dark/60 pt-4">
                    <label
                      htmlFor={`cleaner-${order.id}`}
                      className="mb-1.5 block text-sm font-medium text-dark-gray"
                    >
                      Tildel renser i {city}:
                    </label>
                    {availableCleaners.length === 0 ? (
                      <p className="text-sm text-red-700">
                        Ingen tilgjengelige rensere i {city}
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          id={`cleaner-${order.id}`}
                          className="flex-1 rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
                          defaultValue=""
                        >
                          <option value="" disabled>
                            Velg renser...
                          </option>
                          {availableCleaners.map((cleaner) => (
                            <option key={cleaner.id} value={cleaner.id}>
                              {cleaner.display_name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const select = document.getElementById(
                              `cleaner-${order.id}`
                            ) as HTMLSelectElement;
                            if (select.value) {
                              handleAssign(order.id, select.value);
                            }
                          }}
                          disabled={assigning === order.id}
                          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-nordic-blue px-6 py-3 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
                        >
                          {assigning === order.id ? 'Tildeler...' : 'Tildel'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
