'use client';

// Body of the "Vaskerom" flow — no page chrome, so it renders both standalone
// (vaskerom/page.tsx) and inside the dashboard tabs. Order-centric: orders move
// Mottatt → I arbeid → Klar, and each order's contents are registered (edited
// from the customer's prefill) and confirmed on the way to Klar — which is what
// triggers the Vipps charge in the real system. Reports the active (not-yet-Klar)
// order count up via onActiveChange for the tab badge. Mock-only: no server.

import { useEffect, useState } from 'react';
import { Inbox, PackageCheck, WashingMachine, Wind, type LucideIcon } from 'lucide-react';
import { INITIAL_ORDERS } from './mockData';
import {
  NEXT_STATUS,
  ordersByStatus,
  STATUSES,
  type ContentField,
  type OrderStatus,
  type WashOrder,
} from './washroom';
import { OrderCard } from './components/OrderCard';

const STATUS_ICON: Record<OrderStatus, LucideIcon> = {
  mottatt: Inbox,
  arbeid: WashingMachine,
  klar: PackageCheck,
};

function nowLabel(): string {
  return new Date().toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
}

interface VaskeromViewProps {
  onActiveChange?: (count: number) => void;
  // When rendered inside the dashboard tabs the tab already says "Vaskerom",
  // so we drop the big standalone hero title and keep just the status line.
  embedded?: boolean;
}

export function VaskeromView({ onActiveChange, embedded = false }: VaskeromViewProps) {
  const [orders, setOrders] = useState<WashOrder[]>(INITIAL_ORDERS);
  const [openId, setOpenId] = useState<string | null>(null);

  const bump = (id: string, field: ContentField, delta: number) =>
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              registered: {
                ...o.registered,
                [field]: Math.max(0, o.registered[field] + delta),
              },
            }
          : o
      )
    );

  const advance = (id: string) =>
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const next = NEXT_STATUS[o.status];
        if (!next) return o;
        // Confirming the work (→ klar) is what charges the customer in Vipps.
        return { ...o, status: next, charged_at: next === 'klar' ? nowLabel() : o.charged_at };
      })
    );

  const toggle = (id: string) => setOpenId((cur) => (cur === id ? null : id));

  const active = orders.filter((o) => o.status !== 'klar').length;
  const ready = orders.length - active;

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  return (
    <div className="space-y-6">
      {/* Hero — mirrors the onboarding flow; suppressed when embedded. */}
      <section className="animate-in fade-in slide-in-from-bottom-3 duration-700">
        {!embedded && (
          <>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
              I dag
            </p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray sm:text-5xl">
              Vaskerom
            </h1>
          </>
        )}
        <p className={`text-medium-gray ${embedded ? '' : 'mt-3'}`}>
          {active} {active === 1 ? 'ordre' : 'ordrer'} underveis · {ready} klar til henting.
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
          <Wind className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <p>Klærne henges til lufttørk — sett av tid før du fullfører ordren.</p>
        </div>
      </section>

      {/* One section per status */}
      {STATUSES.map((cfg, i) => {
        const items = ordersByStatus(orders, cfg.key);
        const Icon = STATUS_ICON[cfg.key];

        return (
          <section
            key={cfg.key}
            className="animate-in fade-in slide-in-from-bottom-3 duration-700"
            style={{ animationDelay: `${80 * (i + 1)}ms` }}
          >
            <div className="mb-3 flex items-center gap-3 px-1">
              <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
                <Icon className="size-5" />
              </span>
              <h2 className="font-serif text-lg font-semibold leading-none text-dark-gray">
                {cfg.label}
              </h2>
              <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-cream-dark/60 px-2 py-0.5 text-xs font-medium text-medium-gray">
                {items.length}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-cream-dark px-3 py-5 text-center text-xs text-medium-gray">
                Ingen ordrer her
              </p>
            ) : (
              <div className="space-y-2.5">
                {items.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    isOpen={openId === order.id}
                    onToggle={() => toggle(order.id)}
                    onBump={(field, delta) => bump(order.id, field, delta)}
                    onAdvance={() => advance(order.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
