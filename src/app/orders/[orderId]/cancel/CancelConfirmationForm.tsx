'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TriangleAlert } from 'lucide-react';
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

  const confirmButton = (
    <button
      type="button"
      onClick={handleCancel}
      disabled={isLoading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
    >
      {isLoading ? 'Kansellerer...' : 'Bekreft kansellering'}
    </button>
  );

  // For one-time orders, just show the cancel button
  if (!hasSubscription) {
    return <div className="space-y-4">{confirmButton}</div>;
  }

  // For subscription orders, show options
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg font-semibold text-dark-gray">
        Velg kanselleringstype
      </h3>

      {/* Option 1: Cancel order only */}
      <button
        type="button"
        onClick={() => setSelectedOption('order-only')}
        disabled={isLoading}
        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
          selectedOption === 'order-only'
            ? 'border-sea-green bg-sea-green/8'
            : 'border-cream-dark bg-white hover:border-sea-green/50'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedOption === 'order-only' ? 'border-sea-green' : 'border-cream-dark'
            }`}
          >
            {selectedOption === 'order-only' && (
              <span className="size-2.5 rounded-full bg-sea-green" />
            )}
          </span>
          <div>
            <h4 className="font-medium text-dark-gray">
              Kanseller kun denne bestillingen
            </h4>
            <p className="mt-1 text-sm text-medium-gray">
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
        className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
          selectedOption === 'subscription'
            ? 'border-red-400 bg-red-50'
            : 'border-cream-dark bg-white hover:border-red-200'
        }`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
              selectedOption === 'subscription' ? 'border-red-500' : 'border-cream-dark'
            }`}
          >
            {selectedOption === 'subscription' && (
              <span className="size-2.5 rounded-full bg-red-500" />
            )}
          </span>
          <div>
            <h4 className="font-medium text-dark-gray">
              Kanseller abonnementet
            </h4>
            <p className="mt-1 text-sm text-medium-gray">
              Alle fremtidige ordrer vil bli stoppet og Vipps-avtalen avsluttes. Dette kan ikke angres.
            </p>
          </div>
        </div>
      </button>

      {/* Warning for subscription cancellation */}
      {selectedOption === 'subscription' && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            Ved å kansellere abonnementet vil du ikke motta flere hentinger. Du kan opprette et nytt abonnement når som helst.
          </p>
        </div>
      )}

      {/* Confirm Button */}
      <div className="pt-2">{confirmButton}</div>
    </div>
  );
}
