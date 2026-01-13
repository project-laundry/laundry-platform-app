'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  updateCleanerOrderStatus,
  declineCleanerOrder,
  finishOrderAction,
} from '../actions';
import type { OrderStatus } from '@/types/database';

interface OrderActionsProps {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  needsIroning: boolean;
  hasLaundryDetails: boolean;
  hasPrice: boolean;
}

// Status progression configuration
const STATUS_TRANSITIONS: Partial<
  Record<
    OrderStatus,
    {
      nextStatus: OrderStatus;
      label: string;
      confirmText: string;
      descriptionWithIroning?: string;
      descriptionWithoutIroning?: string;
    }
  >
> = {
  pickup_scheduled: {
    nextStatus: 'picked_up',
    label: 'Marker som hentet',
    confirmText: 'Bekreft at du har hentet vasken fra kunden.',
  },
  picked_up: {
    nextStatus: 'in_cleaning',
    label: 'Start vask',
    confirmText: 'Bekreft at vasken er satt i maskinen.',
  },
  in_cleaning: {
    nextStatus: 'ready_for_delivery',
    label: 'Neste steg',
    confirmText: 'Bekreft at vasken er ferdig og klar for levering.',
    descriptionWithIroning: 'Bekreft at vasken er ferdig vasket og strøket, og klar for levering.',
    descriptionWithoutIroning: 'Bekreft at vasken er ferdig vasket og klar for levering.',
  },
  ready_for_delivery: {
    nextStatus: 'out_for_delivery',
    label: 'Ut for levering',
    confirmText: 'Bekreft at du er på vei til kunden.',
  },
};

export function OrderActions({
  orderId,
  orderNumber,
  currentStatus,
  needsIroning,
  hasLaundryDetails,
  hasPrice,
}: OrderActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Confirmation dialogs
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishConfirmChecked, setFinishConfirmChecked] = useState(false);

  const transition = STATUS_TRANSITIONS[currentStatus];
  const canDecline = currentStatus === 'pickup_scheduled';
  const canFinish = currentStatus === 'out_for_delivery';

  const handleStatusChange = async () => {
    if (!transition) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await updateCleanerOrderStatus(orderId, transition.nextStatus);
      if (!result.success) {
        setError(result.error || 'Kunne ikke oppdatere status');
        return;
      }
      setShowStatusConfirm(false);
      router.refresh();
    } catch {
      setError('En feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await declineCleanerOrder(orderId);
      if (!result.success) {
        setError(result.error || 'Kunne ikke avsla oppdraget');
        return;
      }
      router.push('/dashboard/cleaner');
    } catch {
      setError('En feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await finishOrderAction(orderId);
      if (!result.success) {
        setError(result.error || 'Kunne ikke fullføre ordren');
        return;
      }
      router.push('/dashboard/cleaner');
    } catch {
      setError('En feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  // If order is completed or cancelled, don't show actions
  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return (
      <Card className="bg-gray-50">
        <CardContent className="py-6 text-center text-medium-gray">
          Denne ordren er {currentStatus === 'completed' ? 'fullfort' : 'kansellert'}.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Status Change Card */}
      {transition && !canFinish && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Neste steg</CardTitle>
          </CardHeader>
          <CardContent>
            {!showStatusConfirm ? (
              <div className="space-y-3">
                {/* Show description for in_cleaning status */}
                {currentStatus === 'in_cleaning' &&
                  (transition.descriptionWithIroning || transition.descriptionWithoutIroning) && (
                    <p className="text-medium-gray">
                      {needsIroning
                        ? transition.descriptionWithIroning
                        : transition.descriptionWithoutIroning}
                    </p>
                  )}
                <Button
                  onClick={() => setShowStatusConfirm(true)}
                  className="w-full"
                  size="lg"
                >
                  {transition.label}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-medium-gray">{transition.confirmText}</p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowStatusConfirm(false)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Avbryt
                  </Button>
                  <Button
                    onClick={handleStatusChange}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Oppdaterer...' : 'Bekreft'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Finish Order Card */}
      {canFinish && (
        <Card className="border-nordic-blue/30">
          <CardHeader>
            <CardTitle className="text-lg text-nordic-blue">Fullfør ordre</CardTitle>
          </CardHeader>
          <CardContent>
            {!showFinishConfirm ? (
              <div className="space-y-4">
                {/* Validation messages */}
                {!hasLaundryDetails && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    Du ma registrere vaskdetaljer før du kan fullføre ordren.
                  </div>
                )}
                {!hasPrice && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
                    Pris ma beregnes før ordren kan fullføres.
                  </div>
                )}
                <Button
                  onClick={() => setShowFinishConfirm(true)}
                  disabled={!hasLaundryDetails || !hasPrice}
                  className="w-full bg-nordic-blue hover:bg-nordic-blue/90"
                  size="lg"
                >
                  Fullfør ordre
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-dark-gray font-medium">
                  Bekreft at vasken er levert til kunden
                </p>
                <p className="text-sm text-medium-gray">
                  Når du fullfører ordren vil kunden bli belastet for vasken, og ordren markeres som fullfort.
                </p>
                <label className="flex items-start gap-3 p-3 bg-soft-gray rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={finishConfirmChecked}
                    onChange={(e) => setFinishConfirmChecked(e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded border-gray-300 text-nordic-blue focus:ring-nordic-blue"
                  />
                  <span className="text-sm text-dark-gray">
                    Jeg bekrefter at vasken er levert til kunden og at ordren kan fullføres.
                  </span>
                </label>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowFinishConfirm(false);
                      setFinishConfirmChecked(false);
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Avbryt
                  </Button>
                  <Button
                    onClick={handleFinish}
                    disabled={isLoading || !finishConfirmChecked}
                    className="flex-1 bg-nordic-blue hover:bg-nordic-blue/90"
                  >
                    {isLoading ? 'Fullfører...' : 'Fullfør ordre'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Decline Card */}
      {canDecline && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Avsla oppdrag</CardTitle>
          </CardHeader>
          <CardContent>
            {!showDeclineConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowDeclineConfirm(true)}
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
              >
                Avsla dette oppdraget
              </Button>
            ) : (
              <div className="space-y-4">
                <p className="text-medium-gray">
                  Er du sikker pa at du vil avsla ordre #{orderNumber}? Ordren vil bli tildelt en annen renser.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeclineConfirm(false)}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Avbryt
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDecline}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    {isLoading ? 'Avslar...' : 'Ja, avsla'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
