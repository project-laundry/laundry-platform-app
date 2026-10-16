'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Info, Package, PackageCheck } from 'lucide-react';
import {
  markOrderReadyForDelivery,
  declineCleanerOrder,
  markOrderPickedUpAction,
  markOrderDeliveredAction,
} from '../actions';
import { formatKr } from '@/lib/config/pricing';
import type { OrderStatus } from '@/types/database';

interface OrderActionsProps {
  orderId: string;
  orderNumber: string;
  currentStatus: OrderStatus;
  needsIroning: boolean;
  hasLaundryDetails: boolean;
  hasPrice: boolean;
  totalCostOre: number | null;
  /** True from the customer's chosen pickup date onward (Norwegian time). */
  pickupDue: boolean;
}

// Statuses with nothing for the cleaner to press. picked_up and
// out_for_delivery belong to the (dormant) driver flow and are never entered
// when the cleaner runs pickup and delivery — kept so an old order still reads.
const STATUS_INFO: Partial<Record<OrderStatus, string>> = {
  pending_assignment: 'Ordren venter på tildeling.',
  picked_up: 'Tøyet er hentet og på vei til deg.',
  out_for_delivery: 'Tøyet er på vei til kunden. Kunden er allerede belastet.',
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

/** Two-tap confirm row shared by the pickup, ready and delivery cards. */
function ConfirmRow({
  isLoading,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  isLoading: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={onCancel}
        disabled={isLoading}
        className={`${SECONDARY_BUTTON} flex-1`}
      >
        Avbryt
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isLoading}
        className={`${PRIMARY_BUTTON} flex-1`}
      >
        {isLoading ? 'Oppdaterer...' : confirmLabel}
      </button>
    </div>
  );
}

export function OrderActions({
  orderId,
  orderNumber,
  currentStatus,
  needsIroning,
  hasLaundryDetails,
  hasPrice,
  totalCostOre,
  pickupDue,
}: OrderActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPickupConfirm, setShowPickupConfirm] = useState(false);
  const [showReadyConfirm, setShowReadyConfirm] = useState(false);
  const [showDeliverConfirm, setShowDeliverConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  const canPickUp = currentStatus === 'pickup_scheduled';
  const canMarkReady = currentStatus === 'in_cleaning';
  const canDeliver = currentStatus === 'ready_for_delivery';
  const canDecline = currentStatus === 'pickup_scheduled';
  const statusInfo = STATUS_INFO[currentStatus];

  // Runs one status action; on success closes its confirm and refreshes.
  const runStatusAction = async (
    action: (id: string) => Promise<{ success: boolean; error?: string }>,
    closeConfirm: () => void
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await action(orderId);
      if (!result.success) {
        setError(result.error || 'Kunne ikke oppdatere status');
        return;
      }
      closeConfirm();
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

  // If order is completed or cancelled, don't show actions
  if (currentStatus === 'completed' || currentStatus === 'cancelled') {
    return (
      <div className="rounded-3xl border border-cream-dark/80 bg-cream/70 px-5 py-6 text-center text-medium-gray">
        Denne ordren er {currentStatus === 'completed' ? 'fullført' : 'kansellert'}.
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

      {/* Step 1: pick up at the customer's door */}
      {canPickUp && (
        <ActionCard
          icon={<Package className="size-5" />}
          iconClassName="bg-nordic-blue/10 text-nordic-blue"
          title="Hent tøyet hos kunden"
        >
          {!showPickupConfirm ? (
            <div className="space-y-3">
              <p className="text-medium-gray">Trykk når du har hentet posene hos kunden.</p>
              {!pickupDue && (
                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>Hentedatoen er ikke kommet ennå. Hent bare tidligere hvis du har avtalt det med kunden.</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowPickupConfirm(true)}
                className={PRIMARY_BUTTON}
              >
                Jeg har hentet tøyet
              </button>
              <p className="text-sm text-medium-gray">
                Er ingen hjemme? Ring kunden. Kunden kan flytte hentedagen selv i bestillingen sin.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-medium-gray">Bekreft at du har hentet tøyet hos kunden.</p>
              <ConfirmRow
                isLoading={isLoading}
                confirmLabel="Bekreft henting"
                onCancel={() => setShowPickupConfirm(false)}
                onConfirm={() =>
                  runStatusAction(markOrderPickedUpAction, () => setShowPickupConfirm(false))
                }
              />
            </div>
          )}
        </ActionCard>
      )}

      {/* Step 2: mark ready — charges the customer */}
      {canMarkReady && (
        <ActionCard
          icon={<ArrowRight className="size-5" />}
          iconClassName="bg-sea-green/12 text-sea-green"
          title="Klar for levering"
        >
          {!showReadyConfirm ? (
            <div className="space-y-3">
              <p className="text-medium-gray">
                {needsIroning
                  ? 'Når vasken er ferdig vasket og strøket, gjør du den klar. Da belastes kunden, og du leverer tøyet tilbake.'
                  : 'Når vasken er ferdig vasket, gjør du den klar. Da belastes kunden, og du leverer tøyet tilbake.'}
              </p>
              {!hasLaundryDetails && (
                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>Du må registrere vaskdetaljer før ordren kan gjøres klar.</p>
                </div>
              )}
              {!hasPrice && (
                <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <p>Pris må beregnes før ordren kan gjøres klar.</p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowReadyConfirm(true)}
                disabled={!hasLaundryDetails || !hasPrice}
                className={PRIMARY_BUTTON}
              >
                Marker som klar
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-medium-gray">
                Bekreft at vasken er ferdig og pakket, klar til å leveres til kunden.
              </p>
              {totalCostOre !== null && (
                <p className="rounded-2xl bg-cream/70 px-4 py-3 text-sm text-dark-gray">
                  Kunden belastes{' '}
                  <span className="font-semibold tabular-nums">{formatKr(totalCostOre)}</span> via
                  Vipps når du bekrefter.
                </p>
              )}
              <ConfirmRow
                isLoading={isLoading}
                confirmLabel="Bekreft og belast"
                onCancel={() => setShowReadyConfirm(false)}
                onConfirm={() =>
                  runStatusAction(markOrderReadyForDelivery, () => setShowReadyConfirm(false))
                }
              />
            </div>
          )}
        </ActionCard>
      )}

      {/* Step 3: deliver back to the customer */}
      {canDeliver && (
        <ActionCard
          icon={<PackageCheck className="size-5" />}
          iconClassName="bg-sea-green/12 text-sea-green"
          title="Lever til kunden"
        >
          {!showDeliverConfirm ? (
            <div className="space-y-3">
              <p className="text-medium-gray">
                Kunden er belastet. Trykk når det rene tøyet er levert hos kunden.
              </p>
              <button
                type="button"
                onClick={() => setShowDeliverConfirm(true)}
                className={PRIMARY_BUTTON}
              >
                Levert til kunden
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-medium-gray">Bekreft at tøyet er levert. Dette kan ikke angres.</p>
              <ConfirmRow
                isLoading={isLoading}
                confirmLabel="Bekreft levering"
                onCancel={() => setShowDeliverConfirm(false)}
                onConfirm={() =>
                  runStatusAction(markOrderDeliveredAction, () => setShowDeliverConfirm(false))
                }
              />
            </div>
          )}
        </ActionCard>
      )}

      {/* Statuses with nothing to press */}
      {statusInfo && (
        <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-4 py-3 text-sm text-medium-gray">
          <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <p>{statusInfo}</p>
        </div>
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
                Er du sikker på at du vil avslå ordre #{orderNumber}? Ordren vil bli tildelt en annen renser.
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
