'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cancelOrderAction } from '@/app/orders/actions';
import type { OrderStatus } from '@/types/database';

interface CancelOrderButtonProps {
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  subscriptionId: string | null;
}

export function CancelOrderButton({
  orderId,
  orderNumber,
  orderStatus,
  subscriptionId,
}: CancelOrderButtonProps) {
  const [cancelSubscription, setCancelSubscription] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Only show button for cancellable statuses
  const cancellableStatuses: OrderStatus[] = ['pending_assignment', 'pickup_scheduled'];
  if (!cancellableStatuses.includes(orderStatus)) {
    return null;
  }

  const handleCancel = async () => {
    // Show confirmation dialog with message based on checkbox state
    const confirmMessage = cancelSubscription
      ? 'Er du sikker på at du vil kansellere abonnementet? Alle fremtidige ordrer vil bli kansellert. Dette kan ikke angres.'
      : 'Er du sikker på at du vil kansellere denne bestillingen? En ny ordre vil bli generert for neste periode.';

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const result = await cancelOrderAction(orderId, cancelSubscription);

      if (!result.success) {
        alert(result.error || 'En feil oppstod ved kansellering');
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('En feil oppstod ved kansellering');
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-dark-gray mb-4">Kanseller bestilling</h3>

        {/* Show checkbox only if order belongs to subscription */}
        {subscriptionId && (
          <div className="mb-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={cancelSubscription}
                onChange={(e) => setCancelSubscription(e.target.checked)}
                disabled={isLoading}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-nordic-blue focus:ring-nordic-blue"
              />
              <div>
                <p className="font-medium text-dark-gray">Kanseller også abonnementet</p>
                <p className="text-sm text-medium-gray">
                  Alle fremtidige ordrer vil bli kansellert og Vipps-avtalen stoppes
                </p>
              </div>
            </label>
          </div>
        )}

        <Button
          onClick={handleCancel}
          disabled={isLoading}
          variant="destructive"
          className="w-full"
        >
          {isLoading ? 'Kansellerer...' : 'Kanseller bestilling'}
        </Button>
      </CardContent>
    </Card>
  );
}
