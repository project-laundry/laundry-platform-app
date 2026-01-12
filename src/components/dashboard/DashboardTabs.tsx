'use client';

import { useState } from 'react';
import { SubscriptionOverviewCard } from './SubscriptionOverviewCard';
import { OrderHistorySection } from './OrderHistorySection';
import type { SubscriptionWithRelations, OrderWithRelations } from '@/types/database';

interface DashboardTabsProps {
  subscription: SubscriptionWithRelations;
  nextOrder: OrderWithRelations | null;
  completedOrders: OrderWithRelations[];
}

export function DashboardTabs({ subscription, nextOrder, completedOrders }: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'oversikt' | 'historikk'>('oversikt');

  return (
    <>
      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setActiveTab('oversikt')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'oversikt'
              ? 'bg-[hsl(var(--nordic-blue))] text-white'
              : 'bg-white border border-gray-200 text-medium-gray hover:border-nordic-blue'
          }`}
        >
          Oversikt
        </button>
        <button
          onClick={() => setActiveTab('historikk')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'historikk'
              ? 'bg-[hsl(var(--nordic-blue))] text-white'
              : 'bg-white border border-gray-200 text-medium-gray hover:border-nordic-blue'
          }`}
        >
          Ordrehistorikk
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'oversikt' ? (
        <div className="mb-8">
          <SubscriptionOverviewCard
            subscription={subscription}
            nextOrder={nextOrder}
          />
        </div>
      ) : (
        <>
          {/* Order History - Only completed/cancelled orders */}
          {completedOrders.length > 0 ? (
            <div className="mb-8">
              <OrderHistorySection orders={completedOrders} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <p className="text-medium-gray">Ingen ordrehistorikk ennå.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
