'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, Info } from 'lucide-react';
import { markOrderReadyForDelivery, declineCleanerOrder } from '../actions';
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
}

// What the driver handles — shown as info so the cleaner knows nothing is
// expected from them in these statuses.
const DRIVER_INFO: Partial<Record<OrderStatus, string>> = {
  pending_assignment: 'Ordren venter på tildeling.',
  pickup_scheduled: 'Sjåføren henter vasken hos kunden på hentedatoen og leverer den til deg.',
  picked_up: 'Sjåføren er på vei til deg med vasken.',
  ready_for_delivery: 'Vasken er klar og kunden er belastet — sjåføren henter den hos deg og leverer til kunden.',
  out_for_delivery: 'Sjåføren leverer vasken til kunden. Kunden er allerede belastet.',
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
  totalCostOre,
}: OrderActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReadyConfirm, setShowReadyConfirm] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);

  const canMarkReady = currentStatus === 'in_cleaning';
  const canDecline = currentStatus === 'pickup_scheduled';
  const driverInfo = DRIVER_INFO[currentStatus];

  const handleMarkReady = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await markOrderReadyForDelivery(orderId);
      if (!result.success) {
        setError(result.error || 'Kunne ikke oppdatere status');
        return;
      }
      setShowReadyConfirm(false);
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

      {/* Mark ready for driver collection */}
      {canMarkReady && (
        <ActionCard
          icon={<ArrowRight className="size-5" />}
          iconClassName="bg-sea-green/12 text-sea-green"
          title="Klar for henting"
        >
          {!showReadyConfirm ? (
            <div className="space-y-3">
              <p className="text-medium-gray">
                {needsIroning
                  ? 'Når vasken er ferdig vasket og strøket, gjør du den klar — sjåføren henter den hos deg.'
                  : 'Når vasken er ferdig vasket, gjør du den klar — sjåføren henter den hos deg.'}
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
                Marker som klar for henting
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
              <p className="text-medium-gray">
                Bekreft at vasken er ferdig og pakket, klar til at sjåføren henter den.
              </p>
              {totalCostOre !== null && (
                <p className="rounded-2xl bg-cream/70 px-4 py-3 text-sm text-dark-gray">
                  Kunden belastes{' '}
                  <span className="font-semibold tabular-nums">{formatKr(totalCostOre)}</span> via
                  Vipps når du bekrefter.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowReadyConfirm(false)}
                  disabled={isLoading}
                  className={`${SECONDARY_BUTTON} flex-1`}
                >
                  Avbryt
                </button>
                <button
                  type="button"
                  onClick={handleMarkReady}
                  disabled={isLoading}
                  className={`${PRIMARY_BUTTON} flex-1`}
                >
                  {isLoading ? 'Oppdaterer...' : 'Bekreft og belast'}
                </button>
              </div>
            </div>
          )}
        </ActionCard>
      )}

      {/* Driver-handled status info */}
      {driverInfo && (
        <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-4 py-3 text-sm text-medium-gray">
          <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <p>{driverInfo}</p>
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
