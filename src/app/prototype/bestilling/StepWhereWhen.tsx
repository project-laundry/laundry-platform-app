'use client';

// Step 2 — where we pick up and when.

import { useMemo } from 'react';
import { AlertCircle, CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import {
  getCityFromPostalCode,
  isValidPostalCodeFormat,
} from '@/lib/config/postal-codes';
import { Section } from './components';
import { FREQUENCY_LABELS, type Address, type Frequency, type Schedule } from './types';

/** Upcoming pickup days (skips Sundays) rendered as selectable chips. */
function useUpcomingDates(count: number) {
  return useMemo(() => {
    const out: { iso: string; weekday: string; day: string }[] = [];
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    while (out.length < count) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() === 0) continue; // skip Sundays
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push({
        iso,
        weekday: d.toLocaleDateString('nb-NO', { weekday: 'short' }),
        day: d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }),
      });
    }
    return out;
  }, [count]);
}

export function StepWhereWhen({
  address,
  setAddress,
  schedule,
  setSchedule,
}: {
  address: Address;
  setAddress: React.Dispatch<React.SetStateAction<Address>>;
  schedule: Schedule;
  setSchedule: React.Dispatch<React.SetStateAction<Schedule>>;
}) {
  const dates = useUpcomingDates(10);

  const handlePostal = (raw: string) => {
    const postalCode = raw.replace(/\D/g, '').slice(0, 4);
    const city = isValidPostalCodeFormat(postalCode)
      ? getCityFromPostalCode(postalCode)
      : null;
    setAddress((a) => ({ ...a, postalCode, city }));
  };

  const outOfArea =
    isValidPostalCodeFormat(address.postalCode) && address.city === null;

  return (
    <>
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
              value={address.street}
              onChange={(e) =>
                setAddress((a) => ({ ...a, street: e.target.value }))
              }
              placeholder="F.eks. Storgata 1"
              className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
            />
          </Field>

          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <Field label="Postnr.">
              <input
                type="text"
                inputMode="numeric"
                value={address.postalCode}
                onChange={(e) => handlePostal(e.target.value)}
                placeholder="0000"
                className="w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 tabular-nums text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
              />
            </Field>
            <Field label="By">
              <div className="flex h-[3.25rem] items-center rounded-2xl border border-cream-dark bg-cream/50 px-4 text-dark-gray">
                {address.city ? (
                  <span className="font-medium">{address.city}</span>
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

          <Field label="Hente-instruks (valgfritt)">
            <textarea
              value={address.instructions}
              onChange={(e) =>
                setAddress((a) => ({ ...a, instructions: e.target.value }))
              }
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
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dates.map((d) => {
            const active = schedule.pickupDate === d.iso;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => setSchedule((s) => ({ ...s, pickupDate: d.iso }))}
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
      </Section>

      <Section
        delay={180}
        icon={<RefreshCw className="size-5" />}
        title="Hvor ofte?"
        subtitle="Én gang, eller fast henting?"
      >
        <div className="grid grid-cols-2 gap-3">
          <FreqCard
            active={!schedule.isRecurring}
            title="Én gang"
            subtitle="Bare denne gangen"
            onClick={() => setSchedule((s) => ({ ...s, isRecurring: false }))}
          />
          <FreqCard
            active={schedule.isRecurring}
            title="Fast henting"
            subtitle="Gjentas automatisk"
            onClick={() => setSchedule((s) => ({ ...s, isRecurring: true }))}
          />
        </div>

        {schedule.isRecurring && (
          <div className="mt-3 grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
            {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => {
              const active = schedule.frequency === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSchedule((s) => ({ ...s, frequency: f }))}
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
    </>
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
