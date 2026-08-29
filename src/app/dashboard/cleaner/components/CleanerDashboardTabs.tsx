'use client';

import { useState } from 'react';
import { CleanerOrderList } from './CleanerOrderList';
import { CleanerHistoryTab } from './CleanerHistoryTab';
import type { OrderWithCustomer } from '../actions';

interface CleanerDashboardTabsProps {
  activeOrders: OrderWithCustomer[];
  historyOrders: OrderWithCustomer[];
}

type Tab = 'active' | 'history';

export function CleanerDashboardTabs({
  activeOrders,
  historyOrders,
}: CleanerDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('active');

  return (
    <div>
      {/* Tabs — segmented pill control */}
      <div className="inline-flex rounded-full border border-cream-dark bg-white p-1">
        <TabButton
          active={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
          label="Aktive oppdrag"
          count={activeOrders.length}
        />
        <TabButton
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          label="Historikk"
          count={historyOrders.length}
        />
      </div>

      {/* Tab Content */}
      <div className="mt-5">
        {activeTab === 'active' && <CleanerOrderList orders={activeOrders} />}
        {activeTab === 'history' && <CleanerHistoryTab orders={historyOrders} />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-all ${
        active
          ? 'bg-sea-green/10 text-sea-green'
          : 'text-medium-gray hover:text-dark-gray'
      }`}
    >
      {label}
      {count > 0 && (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${
            active
              ? 'bg-sea-green/10 text-sea-green'
              : 'bg-cream-dark/60 text-medium-gray'
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
