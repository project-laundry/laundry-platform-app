'use client';

// Step 2 — where we pick up and when.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import {
  getCityFromPostalCode,
  isValidPostalCodeFormat,
  type SupportedCity,
} from '@/lib/config/postal-codes';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { calculateCustomerEstimate } from '@/lib/config/pricing';
import type { Weekday } from '@/types/database';
import { buildDateChips } from './date-chips';
import {
  getAvailableWeekdaysAction,
  getPickupPrefillAction,
  validatePickupAddressAction,
} from '@/app/orders/actions';
import { OrderFlowShell } from '@/components/order-flow/OrderFlowShell';
import { Section } from '@/components/order-flow/primitives';

type Frequency = 'weekly' | 'biweekly' | 'monthly';

const FREQUENCY_LABELS: Record<Frequency, string> = {
  weekly: 'Ukentlig',
  biweekly: 'Annenhver uke',
  monthly: 'Månedlig',
};

export default function PickupPage() {
  // Mount the form only after the store has rehydrated, so its initial state
  // can be seeded from persisted data.
  const hasHydrated = useOrderFlowStore((state) => state._hasHydrated);
  if (!hasHydrated) return null;
  return <PickupForm />;
}

function PickupForm() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  const [street, setStreet] = useState(orderData?.address?.street ?? '');
  const [postalCode, setPostalCode] = useState(orderData?.address?.postalCode ?? '');
  const [instructions, setInstructions] = useState(
    orderData?.address?.specialInstructions ?? ''
  );
  const [pickupDateChoice, setPickupDateChoice] = useState(
    orderData?.firstPickupDate ?? ''
  );
  const [isRecurring, setIsRecurring] = useState(orderData?.isRecurring ?? false);
  const [frequency, setFrequency] = useState<Frequency>(orderData?.frequency ?? 'weekly');
  const [weekdaysFetch, setWeekdaysFetch] = useState<{
    city: SupportedCity;
    weekdays: Weekday[];
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  const derivedCity: SupportedCity | null = isValidPostalCodeFormat(postalCode)
    ? getCityFromPostalCode(postalCode)
    : null;
  const outOfArea = isValidPostalCodeFormat(postalCode) && derivedCity === null;

  // Prefill address fields from the customer's most recent order (DB), but
  // only when nothing is stored locally — in-progress local data always wins.
  const hadStoredAddress = !!orderData?.address;
  useEffect(() => {
    if (hadStoredAddress) return;
    let cancelled = false;
    getPickupPrefillAction()
      .then((prefill) => {
        if (cancelled || !prefill) return;
        // Fill only fields still empty, so we never clobber what the
        // customer typed while the request was in flight.
        setStreet((prev) => (prev === '' ? prefill.street : prev));
        setPostalCode((prev) =>
          prev === '' ? prefill.postalCode.replace(/\D/g, '').slice(0, 4) : prev
        );
        setInstructions((prev) => (prev === '' ? prefill.specialInstructions : prev));
      })
      .catch(() => {
        // Best-effort: an empty form is fine.
      });
    return () => {
      cancelled = true;
    };
    // Run once on mount; hadStoredAddress is stable for the component's lifetime
    // because PickupForm only mounts after store hydration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch which weekdays cleaners in this city work.
  useEffect(() => {
    if (!derivedCity) return;
    let cancelled = false;
    getAvailableWeekdaysAction(derivedCity)
      .then((weekdays) => {
        if (!cancelled) setWeekdaysFetch({ city: derivedCity, weekdays });
      })
      .catch(() => {
        if (!cancelled) setWeekdaysFetch({ city: derivedCity, weekdays: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [derivedCity]);

  // Only trust a fetch result for the current city (null = loading).
  const availableWeekdays =
    derivedCity && weekdaysFetch?.city === derivedCity ? weekdaysFetch.weekdays : null;

  const dateChips = useMemo(
    () => (availableWeekdays ? buildDateChips(availableWeekdays) : []),
    [availableWeekdays]
  );

  // Ignore a selected date that's no longer offered (e.g. after a city change).
  const pickupDate =
    availableWeekdays && !dateChips.some((c) => c.iso === pickupDateChoice)
      ? ''
      : pickupDateChoice;

  const price = useMemo(
    () =>
      calculateCustomerEstimate(
        orderData?.selection ?? {
          bags: 0,
          beddingSets: 0,
          everydayItems: 0,
          formalItems: 0,
          ironBedding: false,
        }
      ),
    [orderData?.selection]
  );

  const canAdvance =
    street.trim().length > 0 &&
    derivedCity !== null &&
    pickupDate !== '';

  const handlePostal = (raw: string) => {
    setAddressError(null);
    setPostalCode(raw.replace(/\D/g, '').slice(0, 4));
  };

  const handleAdvance = async () => {
    if (!canAdvance || !derivedCity || validating) return;

    setAddressError(null);
    setValidating(true);
    try {
      const result = await validatePickupAddressAction({
        street: street.trim(),
        postalCode,
        city: derivedCity,
      });

      if (!result.valid) {
        setAddressError(
          result.reason === 'not_found'
            ? 'Vi fant ikke denne adressen. Sjekk gateadresse og postnummer.'
            : 'Vi klarte ikke å finne nøyaktig denne adressen. Dobbeltsjekk gateadressen.'
        );
        return;
      }
    } catch {
      // Fail open: don't block the customer if validation itself errors.
    } finally {
      setValidating(false);
    }

    updateOrderData({
      city: derivedCity,
      address: {
        street: street.trim(),
        postalCode,
        specialInstructions: instructions,
      },
      firstPickupDate: pickupDate,
      isRecurring,
      frequency: isRecurring ? frequency : null,
    });

    router.push('/orders/confirm');
  };

  return (
    <OrderFlowShell
      step={2}
      price={price}
      canAdvance={canAdvance}
      onAdvance={handleAdvance}
      isSubmitting={validating}
    >
      <Section
        delay={60}
        icon={<MapPin className="size-5" />}
        title="Hvor henter vi?"
        subtitle="Adressen vi henter og leverer på."
      >
        <div className="space-y-4">
          <Field label="Gateadresse">
            <input
              type="text"
              value={street}
              onChange={(e) => {
                setAddressError(null);
                setStreet(e.target.value);
              }}
              placeholder="F.eks. Storgata 1"
              className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
            />
          </Field>

          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <Field label="Postnr.">
              <input
                type="text"
                inputMode="numeric"
                value={postalCode}
                onChange={(e) => handlePostal(e.target.value)}
                placeholder="0000"
                className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 tabular-nums text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
              />
            </Field>
            <Field label="By">
              <div className="flex h-[3.25rem] items-center rounded-2xl border border-cream-dark bg-cream/50 px-4 text-dark-gray">
                {derivedCity ? (
                  <span className="font-medium">{derivedCity}</span>
                ) : (
                  <span className="text-medium-gray/60">Fra postnr.</span>
                )}
              </div>
            </Field>
          </div>

          {outOfArea && (
            <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Vi er foreløpig kun i Bergen og Oslo. Dette postnummeret er
                utenfor området vårt.
              </span>
            </div>
          )}

          {addressError && (
            <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{addressError}</span>
            </div>
          )}

          <Field label="Hente-instruks (valgfritt)">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="F.eks. ring på, sett igjen på trappa, kode til oppgang …"
              className="w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
            />
          </Field>
        </div>
      </Section>

      <Section
        delay={120}
        icon={<CalendarDays className="size-5" />}
        title="Når passer det?"
        subtitle="Velg første hentedato."
      >
        {!derivedCity ? (
          <p className="text-sm text-medium-gray">
            Fyll inn postnummeret ditt først, så viser vi ledige hentedager.
          </p>
        ) : availableWeekdays === null ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-[4.5rem] w-16 shrink-0 animate-pulse rounded-2xl bg-cream-dark/50"
              />
            ))}
          </div>
        ) : dateChips.length === 0 ? (
          <p className="text-sm text-medium-gray">
            Ingen ledige hentedager i {derivedCity} ennå. Prøv igjen senere.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {dateChips.map((d) => {
              const active = pickupDate === d.iso;
              return (
                <button
                  key={d.iso}
                  type="button"
                  onClick={() => setPickupDateChoice(d.iso)}
                  className={`flex w-16 shrink-0 flex-col items-center gap-0.5 rounded-2xl border px-2 py-3 transition-all ${
                    active
                      ? 'border-sea-green bg-sea-green/10 text-sea-green'
                      : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
                  }`}
                >
                  <span className="text-xs capitalize text-medium-gray">
                    {d.weekday}
                  </span>
                  <span className="text-sm font-semibold capitalize">{d.day}</span>
                </button>
              );
            })}
          </div>
        )}
      </Section>

      <Section
        delay={180}
        icon={<RefreshCw className="size-5" />}
        title="Hvor ofte?"
        subtitle="Én gang, eller fast henting?"
      >
        <div className="grid grid-cols-2 gap-3">
          <FreqCard
            active={!isRecurring}
            title="Én gang"
            subtitle="Bare denne gangen"
            onClick={() => setIsRecurring(false)}
          />
          <FreqCard
            active={isRecurring}
            title="Fast henting"
            subtitle="Gjentas automatisk"
            onClick={() => setIsRecurring(true)}
          />
        </div>

        {isRecurring && (
          <div className="mt-3 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
            {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => {
              const active = frequency === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'border-sea-green bg-sea-green/10 text-sea-green'
                      : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
                  }`}
                >
                  {FREQUENCY_LABELS[f]}
                </button>
              );
            })}
          </div>
        )}
      </Section>
    </OrderFlowShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-dark-gray">
        {label}
      </span>
      {children}
    </label>
  );
}

function FreqCard({
  active,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-left transition-all ${
        active
          ? 'border-sea-green bg-sea-green/8'
          : 'border-cream-dark bg-white hover:border-sea-green/50'
      }`}
    >
      <p className="font-medium text-dark-gray">{title}</p>
      <p className="text-sm text-medium-gray">{subtitle}</p>
    </button>
  );
}
