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
    <div className="bg-white rounded-2xl shadow-sm">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-nordic-blue border-b-2 border-nordic-blue'
                : 'text-medium-gray hover:text-dark-gray'
            }`}
          >
            Aktive oppdrag
            {activeOrders.length > 0 && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'active'
                    ? 'bg-nordic-blue/10 text-nordic-blue'
                    : 'bg-gray-100 text-medium-gray'
                }`}
              >
                {activeOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-nordic-blue border-b-2 border-nordic-blue'
                : 'text-medium-gray hover:text-dark-gray'
            }`}
          >
            Historikk
            {historyOrders.length > 0 && (
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === 'history'
                    ? 'bg-nordic-blue/10 text-nordic-blue'
                    : 'bg-gray-100 text-medium-gray'
                }`}
              >
                {historyOrders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'active' && <CleanerOrderList orders={activeOrders} />}
        {activeTab === 'history' && <CleanerHistoryTab orders={historyOrders} />}
      </div>
    </div>
  );
}
