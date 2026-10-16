'use client';

import { useState } from 'react';
import { AlertCircle, CalendarDays, Check, Landmark, MapPin, UserRound, WashingMachine } from 'lucide-react';
import { FormInput } from '@/components/forms/FormInput';
import { FormSelect } from '@/components/forms/FormSelect';
import {
  getCityFromPostalCode,
  isValidPostalCodeFormat,
  type SupportedCity,
} from '@/lib/config/postal-codes';
import { EXPERIENCE_LEVEL_OPTIONS, MACHINE_CONDITION_OPTIONS } from '@/lib/config/cleaner-options';
import { validateBankAccount, validateYear } from '@/lib/validation/cleaner';
import type {
  Cleaner,
  CleanerExperienceLevel,
  CleanerMachineCondition,
  WeeklySchedule,
} from '@/types/database';
import { updateCleanerSettingsAction } from './actions';

const isWholePositive = (value: string) => /^\d+$/.test(value) && Number(value) > 0;

const WEEKDAYS: { key: keyof WeeklySchedule; label: string }[] = [
  { key: 'mon', label: 'Mandag' },
  { key: 'tue', label: 'Tirsdag' },
  { key: 'wed', label: 'Onsdag' },
  { key: 'thu', label: 'Torsdag' },
  { key: 'fri', label: 'Fredag' },
  { key: 'sat', label: 'Lørdag' },
  { key: 'sun', label: 'Søndag' },
];

const sectionClass =
  'mt-5 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur';

// Availability is the headline section — cleaners change it most often, so it
// comes first and gets an emphasized border.
const highlightSectionClass =
  'mt-5 rounded-3xl border-2 border-sea-green/50 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur';

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
        {icon}
      </span>
      <h2 className="font-serif text-lg font-semibold text-dark-gray">{title}</h2>
    </div>
  );
}

export function CleanerSettingsForm({ cleaner }: { cleaner: Cleaner }) {
  const [displayName, setDisplayName] = useState(cleaner.display_name);
  const [experienceLevel, setExperienceLevel] = useState<CleanerExperienceLevel>(
    cleaner.experience_level
  );
  const [bankAccount, setBankAccount] = useState(cleaner.bank_account);
  const [baseStreet, setBaseStreet] = useState(cleaner.base_street);
  const [basePostalCode, setBasePostalCode] = useState(cleaner.base_postal_code);
  const [machineBrand, setMachineBrand] = useState(cleaner.machine_brand ?? '');
  const [machineCapacityKg, setMachineCapacityKg] = useState(
    cleaner.machine_capacity_kg !== null ? String(cleaner.machine_capacity_kg) : ''
  );
  const [machineYear, setMachineYear] = useState(
    cleaner.machine_year !== null ? String(cleaner.machine_year) : ''
  );
  const [machineCondition, setMachineCondition] = useState<CleanerMachineCondition | ''>(
    cleaner.machine_condition ?? ''
  );
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(cleaner.is_accepting_orders);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(cleaner.weekly_schedule);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);

  const derivedCity: SupportedCity | null = isValidPostalCodeFormat(basePostalCode)
    ? getCityFromPostalCode(basePostalCode)
    : null;
  const outOfArea = isValidPostalCodeFormat(basePostalCode) && derivedCity === null;
  const cityChanged = derivedCity !== null && derivedCity !== cleaner.base_city;

  const handlePostalCode = (raw: string) => {
    setBasePostalCode(raw.replace(/\D/g, '').slice(0, 4));
  };

  const toggleWeekday = (key: keyof WeeklySchedule) => {
    setWeeklySchedule((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!displayName.trim()) {
      newErrors.displayName = 'Visningsnavn er påkrevd';
    } else if (displayName.trim().length < 2) {
      newErrors.displayName = 'Visningsnavn må være minst 2 tegn';
    }

    if (!bankAccount) {
      newErrors.bankAccount = 'Kontonummer er påkrevd';
    } else if (!validateBankAccount(bankAccount)) {
      newErrors.bankAccount = 'Kontonummer må være 11 siffer';
    }

    if (!baseStreet.trim()) {
      newErrors.baseStreet = 'Gateadresse er påkrevd';
    }

    if (!basePostalCode) {
      newErrors.basePostalCode = 'Postnummer er påkrevd';
    } else if (!isValidPostalCodeFormat(basePostalCode)) {
      newErrors.basePostalCode = 'Postnummer må være 4 siffer';
    }

    if (!machineBrand.trim()) {
      newErrors.machineBrand = 'Merke og modell er påkrevd';
    }

    if (!isWholePositive(machineCapacityKg)) {
      newErrors.machineCapacityKg = 'Oppgi kapasiteten i hele kilo';
    }

    if (!validateYear(machineYear)) {
      newErrors.machineYear = 'Oppgi et gyldig årstall (4 siffer)';
    }

    if (!machineCondition) {
      newErrors.machineCondition = 'Velg tilstand';
    }

    if (!Object.values(weeklySchedule).some(Boolean)) {
      newErrors.weeklySchedule = 'Velg minst én dag du tar imot henting';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);

    if (!validate() || !derivedCity || !machineCondition) {
      return;
    }

    setIsSaving(true);
    const result = await updateCleanerSettingsAction({
      displayName,
      experienceLevel,
      bankAccount,
      baseStreet,
      basePostalCode,
      machineBrand,
      machineCapacityKg,
      machineYear,
      machineCondition,
      isAcceptingOrders,
      weeklySchedule,
    });
    setIsSaving(false);

    if (result.success) {
      setSaveMessage({ kind: 'success', text: 'Endringene er lagret' });
    } else {
      setSaveMessage({ kind: 'error', text: result.error || 'Kunne ikke lagre endringene' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      <section className={highlightSectionClass}>
        <SectionHeading icon={<CalendarDays className="size-5" />} title="Tilgjengelighet" />
        <div className="mt-4 space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-cream-dark bg-white px-4 py-3">
            <span>
              <span className="block text-sm font-medium text-dark-gray">Tar imot nye oppdrag</span>
              <span className="mt-0.5 block text-sm text-medium-gray">
                Slå av ved ferie eller pause — du får ingen nye oppdrag før du slår på igjen.
              </span>
            </span>
            <input
              type="checkbox"
              checked={isAcceptingOrders}
              onChange={(e) => setIsAcceptingOrders(e.target.checked)}
              className="size-5 shrink-0 accent-sea-green"
            />
          </label>

          {!isAcceptingOrders && (
            <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>Du får ingen nye oppdrag så lenge dette er slått av.</span>
            </div>
          )}

          <div>
            <span className="mb-2 block text-sm font-medium text-dark-gray">
              Dager du tar imot henting
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {WEEKDAYS.map(({ key, label }) => {
                const checked = weeklySchedule[key];
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 transition-all ${
                      checked
                        ? 'border-sea-green bg-sea-green/8'
                        : 'border-cream-dark bg-white hover:border-sea-green/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleWeekday(key)}
                      className="size-4 shrink-0 accent-sea-green"
                    />
                    <span className="text-sm text-dark-gray">{label}</span>
                  </label>
                );
              })}
            </div>
            {errors.weeklySchedule && (
              <p className="mt-1.5 text-sm text-red-600">{errors.weeklySchedule}</p>
            )}
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading icon={<UserRound className="size-5" />} title="Om deg" />
        <div className="mt-4 space-y-4">
          <FormInput
            label="Visningsnavn"
            value={displayName}
            onChange={(value) => setDisplayName(value.slice(0, 100))}
            required
            error={errors.displayName}
          />
          <FormSelect
            label="Erfaringsnivå"
            value={experienceLevel}
            onChange={(value) => setExperienceLevel(value as CleanerExperienceLevel)}
            options={EXPERIENCE_LEVEL_OPTIONS}
            required
            error={errors.experienceLevel}
          />
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading icon={<MapPin className="size-5" />} title="Basisadresse" />
        <div className="mt-4 space-y-4">
          <FormInput
            label="Gateadresse"
            value={baseStreet}
            onChange={setBaseStreet}
            placeholder="Gatenavn og nummer"
            required
            error={errors.baseStreet}
          />

          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Postnummer"
              value={basePostalCode}
              onChange={handlePostalCode}
              placeholder="4 siffer"
              type="tel"
              required
              error={errors.basePostalCode}
            />

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-dark-gray">By</span>
              <div className="flex h-[3.25rem] items-center rounded-2xl border border-cream-dark bg-cream/50 px-4 text-dark-gray">
                {derivedCity ? (
                  <span className="font-medium">{derivedCity}</span>
                ) : (
                  <span className="text-medium-gray/60">Fra postnr.</span>
                )}
              </div>
            </label>
          </div>

          {outOfArea && (
            <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                Vi er foreløpig bare i Bergen og Oslo. Dette postnummeret er utenfor området vårt.
              </span>
            </div>
          )}

          {cityChanged && (
            <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-sea-green" />
              <span>
                Bytter du by til {derivedCity}, vil du fremover få oppdrag fra kunder i{' '}
                {derivedCity} i stedet for {cleaner.base_city}.
              </span>
            </div>
          )}
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading icon={<WashingMachine className="size-5" />} title="Vaskemaskin" />
        <div className="mt-4 space-y-4">
          <FormInput
            label="Merke og modell"
            value={machineBrand}
            onChange={setMachineBrand}
            placeholder="f.eks. Miele W1 eller Bosch Serie 6"
            required
            error={errors.machineBrand}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Kapasitet (kg)"
              value={machineCapacityKg}
              onChange={(value) => setMachineCapacityKg(value.replace(/\D/g, '').slice(0, 2))}
              placeholder="f.eks. 8"
              type="tel"
              required
              error={errors.machineCapacityKg}
            />
            <FormInput
              label="Årsmodell"
              value={machineYear}
              onChange={(value) => setMachineYear(value.replace(/\D/g, '').slice(0, 4))}
              placeholder="f.eks. 2022"
              type="tel"
              required
              error={errors.machineYear}
            />
          </div>
          <FormSelect
            label="Tilstand"
            value={machineCondition}
            onChange={(value) => setMachineCondition(value as CleanerMachineCondition | '')}
            placeholder="Velg tilstand"
            options={MACHINE_CONDITION_OPTIONS}
            required
            error={errors.machineCondition}
          />
        </div>
      </section>

      <section className={sectionClass}>
        <SectionHeading icon={<Landmark className="size-5" />} title="Utbetaling" />
        <div className="mt-4">
          <FormInput
            label="Kontonummer"
            value={bankAccount}
            onChange={setBankAccount}
            placeholder="11 siffer"
            required
            error={errors.bankAccount}
          />
        </div>
      </section>

      {saveMessage && (
        <div
          className={`mt-5 flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-sm ${
            saveMessage.kind === 'success'
              ? 'bg-sea-green/10 text-sea-green'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {saveMessage.kind === 'success' ? (
            <Check className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{saveMessage.text}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSaving || outOfArea}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
      >
        {isSaving ? 'Lagrer…' : 'Lagre endringer'}
      </button>
    </form>
  );
}
