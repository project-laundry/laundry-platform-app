'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cancelOrderAction } from '@/app/orders/actions';

interface CancelConfirmationFormProps {
  orderId: string;
  orderNumber: string;
  hasSubscription: boolean;
}

type CancelOption = 'order-only' | 'subscription';

export function CancelConfirmationForm({
  orderId,
  orderNumber,
  hasSubscription,
}: CancelConfirmationFormProps) {
  const [selectedOption, setSelectedOption] = useState<CancelOption>('order-only');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      const alsoCancelSubscription = selectedOption === 'subscription';
      const result = await cancelOrderAction(orderId, alsoCancelSubscription);

      if (!result.success) {
        alert(result.error || 'En feil oppstod ved kansellering');
        setIsLoading(false);
        return;
      }

      // Build success URL with query params
      const params = new URLSearchParams();
      params.set('orderNumber', orderNumber);
      if (alsoCancelSubscription) {
        params.set('subscriptionCancelled', 'true');
      }
      if (result.nextOrderId) {
        params.set('nextOrderId', result.nextOrderId);
      }

      router.push(`/orders/${orderId}/cancel/success?${params.toString()}`);
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('En feil oppstod ved kansellering');
      setIsLoading(false);
    }
  };

  // For one-time orders, just show the cancel button
  if (!hasSubscription) {
    return (
      <div className="space-y-4">
        <Button
          onClick={handleCancel}
          disabled={isLoading}
          variant="destructive"
          className="w-full py-6 text-base"
        >
          {isLoading ? 'Kansellerer...' : 'Bekreft kansellering'}
        </Button>
      </div>
    );
  }

  // For subscription orders, show options
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-dark-gray">Velg kanselleringstype</h3>

      {/* Option 1: Cancel order only */}
      <button
        type="button"
        onClick={() => setSelectedOption('order-only')}
        disabled={isLoading}
        className={`w-full text-left p-6 rounded-xl border-2 transition-all ${
          selectedOption === 'order-only'
            ? 'border-nordic-blue bg-nordic-blue/5'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-start">
          <div className={`w-5 h-5 rounded-full border-2 mr-4 mt-0.5 flex items-center justify-center flex-shrink-0 ${
            selectedOption === 'order-only'
              ? 'border-nordic-blue'
              : 'border-gray-300'
          }`}>
            {selectedOption === 'order-only' && (
              <div className="w-2.5 h-2.5 rounded-full bg-nordic-blue" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-dark-gray mb-1">
              Kanseller kun denne bestillingen
            </h4>
            <p className="text-sm text-medium-gray">
              En ny ordre vil automatisk bli opprettet for neste periode. Abonnementet fortsetter som normalt.
            </p>
          </div>
        </div>
      </button>

      {/* Option 2: Cancel subscription */}
      <button
        type="button"
        onClick={() => setSelectedOption('subscription')}
        disabled={isLoading}
        className={`w-full text-left p-6 rounded-xl border-2 transition-all ${
          selectedOption === 'subscription'
            ? 'border-red-500 bg-red-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-start">
          <div className={`w-5 h-5 rounded-full border-2 mr-4 mt-0.5 flex items-center justify-center flex-shrink-0 ${
            selectedOption === 'subscription'
              ? 'border-red-500'
              : 'border-gray-300'
          }`}>
            {selectedOption === 'subscription' && (
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            )}
          </div>
          <div>
            <h4 className="font-semibold text-dark-gray mb-1">
              Kanseller abonnementet
            </h4>
            <p className="text-sm text-medium-gray">
              Alle fremtidige ordrer vil bli stoppet og Vipps-avtalen avsluttes. Dette kan ikke angres.
            </p>
          </div>
        </div>
      </button>

      {/* Warning for subscription cancellation */}
      {selectedOption === 'subscription' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-red-800">
              Ved å kansellere abonnementet vil du ikke motta flere hentinger. Du kan opprette et nytt abonnement når som helst.
            </p>
          </div>
        </div>
      )}

      {/* Confirm Button */}
      <Button
        onClick={handleCancel}
        disabled={isLoading}
        variant="destructive"
        className="w-full py-6 text-base mt-6"
      >
        {isLoading ? 'Kansellerer...' : 'Bekreft kansellering'}
      </Button>
    </div>
  );
}
