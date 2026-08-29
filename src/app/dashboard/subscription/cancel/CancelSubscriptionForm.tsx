'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { cancelSubscriptionAction } from '@/app/dashboard/subscription/actions';

interface CancelSubscriptionFormProps {
  subscriptionId: string;
}

export function CancelSubscriptionForm({ subscriptionId }: CancelSubscriptionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleCancel = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await cancelSubscriptionAction(subscriptionId);

      if (!result.success) {
        setError(result.error || 'En feil oppstod ved kansellering');
        setIsLoading(false);
        return;
      }

      router.push(
        result.hasInFlightOrder
          ? '/dashboard/subscription/cancel/success?inFlight=true'
          : '/dashboard/subscription/cancel/success'
      );
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      setError('En feil oppstod ved kansellering');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleCancel}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
      >
        {isLoading ? 'Kansellerer...' : 'Bekreft kansellering'}
      </button>
    </div>
  );
}
