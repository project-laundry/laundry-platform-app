import { ChevronDown } from 'lucide-react';
import { OrderRow } from '@/components/dashboard/OrderRow';
import type { OrderWithRelations } from '@/types/database';

// Completed/cancelled orders as compact rows, collapsed by default
// behind a native <details> expansion (no JS needed).
export function HistorySection({ orders }: { orders: OrderWithRelations[] }) {
  if (orders.length === 0) {
    return null;
  }

  return (
    <details className="group overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <h2 className="font-serif text-lg font-semibold text-dark-gray">Historikk</h2>
        <span className="inline-flex items-center rounded-full bg-cream-dark/60 px-2 py-0.5 text-xs font-medium tabular-nums text-medium-gray">
          {orders.length}
        </span>
        <ChevronDown className="ml-auto size-4 text-medium-gray transition-transform group-open:rotate-180" />
      </summary>

      <ul className="divide-y divide-cream-dark/60 border-t border-cream-dark/60">
        {orders.map((order) => (
          <li key={order.id}>
            <OrderRow order={order} context="history" />
          </li>
        ))}
      </ul>
    </details>
  );
}
