'use client';

import { useState } from 'react';
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

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-3 mb-8 animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
        <button
          onClick={() => setActiveTab('oversikt')}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
            activeTab === 'oversikt'
              ? 'bg-gradient-to-r from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] text-white shadow-soft'
              : 'bg-card/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:border-[hsl(var(--nordic-blue))]/30 hover:shadow-card'
          }`}
        >
          Oversikt
        </button>
        <button
          onClick={() => setActiveTab('historikk')}
          className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
            activeTab === 'historikk'
              ? 'bg-gradient-to-r from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] text-white shadow-soft'
              : 'bg-card/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:border-[hsl(var(--nordic-blue))]/30 hover:shadow-card'
          }`}
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
                    <div key={order.id} style={{ animationDelay: `${0.3 + index * 0.1}s` }}>
                      <OneTimeOrderCard order={order} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-12 text-center">
                  <p className="font-serif text-xl text-muted-foreground">Ingen kommende ordrer.</p>
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
            <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-12 text-center animate-fade-in">
              <p className="font-serif text-xl text-muted-foreground">Ingen ordrehistorikk ennå.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
