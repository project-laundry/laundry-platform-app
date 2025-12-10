'use client';

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    const pendingOrders = await getPendingAssignmentOrders();
    setOrders(pendingOrders);

    // Load cleaners for each unique city
    const cities = [...new Set(pendingOrders.map((o) => o.pickup_city))];
    const cleanersMap: Record<string, CleanerOption[]> = {};

    for (const city of cities) {
      cleanersMap[city] = await getCleanersForCity(city);
    }

    setCleanersByCity(cleanersMap);
    setLoading(false);
  }

  async function handleAssign(orderId: string, cleanerId: string) {
    setAssigning(orderId);
    const result = await assignCleanerAction(orderId, cleanerId);

    if (result.success) {
      // Reload orders after assignment
      await loadOrders();
    } else {
      alert(result.error || 'Failed to assign cleaner');
    }

    setAssigning(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Ordrer som venter tildeling</h1>
          <p>Laster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Ordrer som venter tildeling</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-500">Ingen ordrer venter på tildeling</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const city = order.pickup_city;
              const availableCleaners = cleanersByCity[city] || [];

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow p-6"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Ordre #{order.order_number}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {order.customer.user.full_name}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      Venter tildeling
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-gray-500">Hentedato</p>
                      <p className="font-medium">
                        {new Date(order.scheduled_date).toLocaleDateString('no-NO', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Leveringsdato</p>
                      <p className="font-medium">
                        {new Date(order.delivery_date).toLocaleDateString('no-NO', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Adresse</p>
                      <p className="font-medium">
                        {order.pickup_street}, {order.pickup_postal_code} {city}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Beløp</p>
                      <p className="font-medium">{oreToNok(order.total_cost_ore)} NOK</p>
                    </div>
                  </div>

                  {/* Add-ons */}
                  {(order.needs_ironing || order.delicate_items_count > 0 || order.extra_kg > 0) && (
                    <div className="mb-4 text-sm">
                      <p className="text-gray-500 mb-1">Tillegg:</p>
                      <div className="flex gap-2">
                        {order.needs_ironing && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            Stryking
                          </span>
                        )}
                        {order.delicate_items_count > 0 && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                            {order.delicate_items_count} ømtålige
                          </span>
                        )}
                        {order.extra_kg > 0 && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            +{order.extra_kg} kg
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cleaner assignment */}
                  <div className="border-t pt-4">
                    <label className="block text-sm text-gray-500 mb-2">
                      Tildel renser i {city}:
                    </label>
                    {availableCleaners.length === 0 ? (
                      <p className="text-red-600 text-sm">
                        Ingen tilgjengelige rensere i {city}
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          id={`cleaner-${order.id}`}
                          className="flex-1 border rounded-lg px-3 py-2"
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
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
      </div>
    </div>
  );
}
