import { ChevronDown } from 'lucide-react';
import { OrderRow } from '@/components/dashboard/OrderRow';
import type { OrderWithRelations } from '@/types/database';

const VISIBLE_COUNT = 5;

// Completed/cancelled orders as compact rows; first few visible,
// the rest behind a native <details> expansion (no JS needed).
export function HistorySection({ orders }: { orders: OrderWithRelations[] }) {
  if (orders.length === 0) {
    return null;
  }

  const visible = orders.slice(0, VISIBLE_COUNT);
  const rest = orders.slice(VISIBLE_COUNT);

  return (
    <div className="overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-center gap-2 px-5 py-4">
        <h2 className="font-serif text-lg font-semibold text-dark-gray">Historikk</h2>
        <span className="inline-flex items-center rounded-full bg-cream-dark/60 px-2 py-0.5 text-xs font-medium tabular-nums text-medium-gray">
          {orders.length}
        </span>
      </div>

      <ul className="divide-y divide-cream-dark/60 border-t border-cream-dark/60">
        {visible.map((order) => (
          <li key={order.id}>
            <OrderRow order={order} context="history" />
          </li>
        ))}
      </ul>

      {rest.length > 0 && (
        <details className="group border-t border-cream-dark/60">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-1.5 px-5 py-3.5 text-sm font-medium text-nordic-blue transition-colors hover:text-sea-green [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Vis alle ({orders.length})</span>
            <span className="hidden group-open:inline">Vis færre</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="divide-y divide-cream-dark/60 border-t border-cream-dark/60">
            {rest.map((order) => (
              <li key={order.id}>
                <OrderRow order={order} context="history" />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
