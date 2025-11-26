'use client';

import { useEffect, useState } from 'react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { AdditionalServicesForm } from './AdditionalServicesForm';
import { getSubscriptionPlanBySlugAction } from '../actions';
import type { SubscriptionFrequency } from '@/types/database';

export default function AdditionalServicesPage() {
  const orderData = useOrderFlowStore((state) => state.orderData);
  const [planData, setPlanData] = useState<{
    slug: string;
    name: string;
    price_ore: number;
    frequency: SubscriptionFrequency;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlan() {
      if (!orderData?.plan) {
        setLoading(false);
        return;
      }

      const plan = await getSubscriptionPlanBySlugAction(orderData.plan);
      setPlanData(plan);
      setLoading(false);
    }

    fetchPlan();
  }, [orderData?.plan]);

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <p className="text-medium-gray">Laster...</p>
        </div>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-dark-gray mb-2">Plan ikke funnet</h1>
          <p className="text-medium-gray">Kunne ikke finne den valgte planen.</p>
        </div>
      </div>
    );
  }

  return (
    <AdditionalServicesForm
      planSlug={planData.slug}
      planName={planData.name}
      planPriceOre={planData.price_ore}
      planFrequency={planData.frequency}
    />
  );
}
