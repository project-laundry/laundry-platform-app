'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SubscriptionOverviewCard } from './SubscriptionOverviewCard';
import { OneTimeOrderCard } from './OneTimeOrderCard';
import { OrderHistorySection } from './OrderHistorySection';
import type { SubscriptionWithRelations, OrderWithRelations } from '@/types/database';

interface DashboardTabsProps {
  subscription: SubscriptionWithRelations | null;
  nextOrder: OrderWithRelations | null;
  completedOrders: OrderWithRelations[];
  upcomingOrders: OrderWithRelations[];
}

export function DashboardTabs({ subscription, nextOrder, completedOrders, upcomingOrders }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'oversikt' | 'historikk'>('oversikt');

  const tabClass = (active: boolean) =>
    `rounded-full border px-5 py-2.5 text-sm font-medium transition-all active:scale-[0.98] ${
      active
        ? 'border-sea-green bg-sea-green/10 text-sea-green'
        : 'border-cream-dark bg-white text-medium-gray hover:border-sea-green/50'
    }`;

  return (
    <>
      {/* Tabs */}
      <div
        className="mb-6 flex gap-2 animate-in fade-in slide-in-from-bottom-3 duration-500"
        style={{ animationDelay: '60ms' }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('oversikt')}
          className={tabClass(activeTab === 'oversikt')}
        >
          Oversikt
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('historikk')}
          className={tabClass(activeTab === 'historikk')}
        >
          Ordrehistorikk
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'oversikt' ? (
        <div className="mb-8">
          {subscription ? (
            <SubscriptionOverviewCard
              subscription={subscription}
              nextOrder={nextOrder}
            />
          ) : (
            <>
              {/* Show upcoming orders for one-time orders (no subscription) */}
              {upcomingOrders.length > 0 ? (
                <div className="space-y-6">
                  {upcomingOrders.map((order, index) => (
                    <div
                      key={order.id}
                      className="animate-in fade-in slide-in-from-bottom-3 duration-500"
                      style={{ animationDelay: `${120 + index * 60}ms` }}
                    >
                      <OneTimeOrderCard order={order} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-10 text-center shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <p className="font-serif text-2xl font-semibold text-dark-gray">
                    Ingen kommende ordrer
                  </p>
                  <p className="mt-2 text-medium-gray">
                    Bestill en ny vask for å komme i gang
                  </p>
                  <Link
                    href="/orders/wash"
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
                  >
                    Bestill klesvask
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          {/* Order History - Only completed/cancelled orders */}
          {completedOrders.length > 0 ? (
            <div className="mb-8">
              <OrderHistorySection orders={completedOrders} />
            </div>
          ) : (
            <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-10 text-center shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500">
              <p className="font-serif text-xl font-semibold text-medium-gray">
                Ingen ordrehistorikk ennå.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
