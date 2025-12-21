"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Package, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { cancelSubscriptionAction } from '@/app/dashboard/subscription/actions';

interface QuickActionsCardProps {
  subscriptionId: string;
  subscriptionStatus: string;
}

export function QuickActionsCard({ subscriptionId, subscriptionStatus }: QuickActionsCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isCancelled = subscriptionStatus === 'cancelled';

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Er du sikker på at du vil kansellere abonnementet? Dette kan ikke angres.'
    );

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await cancelSubscriptionAction(subscriptionId);
      if (!result.success) {
        alert(result.error || 'En feil oppstod ved kansellering');
        setIsLoading(false);
      } else {
        // Success - refresh the page to show updated data
        window.location.reload();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('En feil oppstod ved kansellering');
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-8">
        <h3 className="text-2xl font-semibold text-dark-gray mb-6">Hurtighandlinger</h3>

        <div className="space-y-4">
          {/* Order Pickup */}
          <Link href="/orders/location-service">
            <div className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-nordic-blue hover:bg-blue-50/30 transition-all cursor-pointer">
              <div className="flex-shrink-0">
                <Package className="w-5 h-5 text-dark-gray" />
              </div>
              <div>
                <p className="font-semibold text-dark-gray">Bestill henting</p>
                <p className="text-sm text-medium-gray">Planlegg din neste henting</p>
              </div>
            </div>
          </Link>

          {/* Cancel Subscription */}
          <button
            onClick={handleCancelSubscription}
            disabled={isCancelled || isLoading}
            className="w-full flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200 disabled:hover:bg-transparent"
          >
            <div className="flex-shrink-0">
              <Calendar className="w-5 h-5 text-dark-gray" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-dark-gray">
                {isCancelled ? 'Abonnement kansellert' : isLoading ? 'Kansellerer...' : 'Kanseller abonnement'}
              </p>
              <p className="text-sm text-medium-gray">
                {isCancelled ? 'Abonnementet er allerede kansellert' : 'Stopp abonnementet ditt'}
              </p>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
