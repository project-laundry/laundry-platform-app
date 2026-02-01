'use client';

import { useState } from 'react';
import { SubscriptionOverviewCard } from './SubscriptionOverviewCard';
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
                <div className="space-y-4">
                  <h2 className="font-serif text-2xl font-light text-foreground mb-4">
                    Kommende <span className="text-gradient font-medium">ordrer</span>
                  </h2>
                  {upcomingOrders.map(order => (
                    <div
                      key={order.id}
                      className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-[hsl(var(--nordic-blue))]/30 hover:shadow-card transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Ordrenummer</p>
                          <p className="font-medium text-foreground">{order.order_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground mb-1">Status</p>
                          <p className="font-medium text-foreground capitalize">
                            {order.status.replace(/_/g, ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground mb-1">Hentetid</p>
                          <p className="font-medium">{new Date(order.scheduled_date).toLocaleDateString('no')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Leveringstid</p>
                          <p className="font-medium">{new Date(order.delivery_date).toLocaleDateString('no')}</p>
                        </div>
                      </div>
                      {order.total_cost_ore && (
                        <div className="mt-4 pt-4 border-t border-border/50">
                          <p className="text-sm text-muted-foreground mb-1">Pris</p>
                          <p className="font-medium text-lg">{(order.total_cost_ore / 100).toFixed(2)} kr</p>
                        </div>
                      )}
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
