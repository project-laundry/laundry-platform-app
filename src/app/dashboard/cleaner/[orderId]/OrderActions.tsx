'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, PackageCheck } from 'lucide-react';
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

const PRIMARY_BUTTON =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none';

const SECONDARY_BUTTON =
  'inline-flex w-full items-center justify-center gap-2 rounded-full border border-cream-dark bg-white px-6 py-3.5 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

const DESTRUCTIVE_BUTTON =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

function ActionCard({
  icon,
  iconClassName,
  title,
  children,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
        >
          {icon}
        </span>
        <h2 className="font-serif text-lg font-semibold text-dark-gray">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

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
        setError(result.error || 'Kunne ikke avslå oppdraget');
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
      <div className="rounded-3xl border border-cream-dark/80 bg-cream/70 px-5 py-6 text-center text-medium-gray">
        Denne ordren er {currentStatus === 'completed' ? 'fullfort' : 'kansellert'}.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Status Change Card */}
      {transition && !canFinish && (
        <ActionCard
          icon={<ArrowRight className="size-5" />}
          iconClassName="bg-sea-green/12 text-sea-green"
          title="Neste steg"
        >
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
              <button
                type="button"
                onClick={() => setShowStatusConfirm(true)}
                className={PRIMARY_BUTTON}
              >
                {transition.label}
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-medium-gray">{transition.confirmText}</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowStatusConfirm(false)}
                  disabled={isLoading}
                  className={`${SECONDARY_BUTTON} flex-1`}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleStatusChange}
                  disabled={isLoading}
                  className={`${PRIMARY_BUTTON} flex-1`}
                >
                  {isLoading ? 'Oppdaterer...' : 'Bekreft'}
                </button>
              </div>
            </div>
          )}
        </ActionCard>
      )}

      {/* Finish Order Card */}
      {canFinish && (
        <ActionCard
          icon={<PackageCheck className="size-5" />}
          iconClassName="bg-nordic-blue/10 text-nordic-blue"
          title="Fullfør ordre"
        >
          {!showFinishConfirm ? (
            <div className="space-y-4">
              {/* Validation messages */}
              {!hasLaundryDetails && (
                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>Du ma registrere vaskdetaljer før du kan fullføre ordren.</p>
                </div>
              )}
              {!hasPrice && (
                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>Pris ma beregnes før ordren kan fullføres.</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowFinishConfirm(true)}
                disabled={!hasLaundryDetails || !hasPrice}
                className={PRIMARY_BUTTON}
              >
                Fullfør ordre
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="font-medium text-dark-gray">
                Bekreft at vasken er levert til kunden
              </p>
              <p className="text-sm text-medium-gray">
                Når du fullfører ordren vil kunden bli belastet for vasken, og ordren markeres som fullfort.
              </p>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream/70 px-4 py-3">
                <input
                  type="checkbox"
                  checked={finishConfirmChecked}
                  onChange={(e) => setFinishConfirmChecked(e.target.checked)}
                  className="mt-0.5 size-5 shrink-0 rounded accent-sea-green"
                />
                <span className="text-sm text-dark-gray">
                  Jeg bekrefter at vasken er levert til kunden og at ordren kan fullføres.
                </span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowFinishConfirm(false);
                    setFinishConfirmChecked(false);
                  }}
                  disabled={isLoading}
                  className={`${SECONDARY_BUTTON} flex-1`}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={isLoading || !finishConfirmChecked}
                  className={`${PRIMARY_BUTTON} flex-1`}
                >
                  {isLoading ? 'Fullfører...' : 'Fullfør ordre'}
                </button>
              </div>
            </div>
          )}
        </ActionCard>
      )}

      {/* Decline Card */}
      {canDecline && (
        <ActionCard
          icon={<AlertCircle className="size-5" />}
          iconClassName="bg-red-50 text-red-600"
          title="Har du ikke mulighet til å ta dette oppdraget?"
        >
          {!showDeclineConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-medium-gray">
                Ved å avslå blir oppdraget ledig for andre.
              </p>
              <button
                type="button"
                onClick={() => setShowDeclineConfirm(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-6 py-3.5 font-medium text-red-600 transition-all hover:border-red-400 active:scale-[0.98]"
              >
                Avslå oppdrag
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-medium-gray">
                Er du sikker pa at du vil avsla ordre #{orderNumber}? Ordren vil bli tildelt en annen renser.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleDecline}
                  disabled={isLoading}
                  className={DESTRUCTIVE_BUTTON}
                >
                  {isLoading ? 'Avslår...' : 'Ja, avslå oppdraget'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineConfirm(false)}
                  disabled={isLoading}
                  className={SECONDARY_BUTTON}
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}
        </ActionCard>
      )}
    </div>
  );
}
