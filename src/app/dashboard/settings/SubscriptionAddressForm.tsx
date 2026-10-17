'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Info } from 'lucide-react';
import { FormInput } from '@/components/forms/FormInput';
import { FormTextarea } from '@/components/forms/FormTextarea';
import {
  getCityFromPostalCode,
  isValidPostalCodeFormat,
  type SupportedCity,
} from '@/lib/config/postal-codes';
import { updateSubscriptionAddressAction } from './actions';
import { SAVE_BUTTON_CLASS, SaveMessage, type SaveMessageState } from './SettingsSection';

interface SubscriptionAddressFormProps {
  initialStreet: string;
  initialPostalCode: string;
  /** order_defaults.location_city — the city the subscription is bound to. */
  locationCity: 'Bergen' | 'Oslo';
  initialSpecialInstructions: string;
  /** True when a not-yet-picked-up order exists; shows the "also update" checkbox. */
  hasUpcomingOrder: boolean;
}

export function SubscriptionAddressForm({
  initialStreet,
  initialPostalCode,
  locationCity,
  initialSpecialInstructions,
  hasUpcomingOrder,
}: SubscriptionAddressFormProps) {
  const router = useRouter();
  const [street, setStreet] = useState(initialStreet);
  const [postalCode, setPostalCode] = useState(initialPostalCode);
  const [specialInstructions, setSpecialInstructions] = useState(initialSpecialInstructions);
  const [applyToUpcomingOrder, setApplyToUpcomingOrder] = useState(hasUpcomingOrder);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<SaveMessageState>(null);

  const derivedCity: SupportedCity | null = isValidPostalCodeFormat(postalCode)
    ? getCityFromPostalCode(postalCode)
    : null;
  const outOfArea = isValidPostalCodeFormat(postalCode) && derivedCity === null;
  const otherCity = derivedCity !== null && derivedCity !== locationCity;

  const handlePostalCode = (raw: string) => {
    setPostalCode(raw.replace(/\D/g, '').slice(0, 4));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmedStreet = street.trim();
    if (trimmedStreet.length < 3) {
      newErrors.street = 'Gateadresse må være minst 3 tegn';
    } else if (trimmedStreet.length > 200) {
      newErrors.street = 'Gateadresse kan ikke være mer enn 200 tegn';
    }
    if (!isValidPostalCodeFormat(postalCode)) {
      newErrors.postalCode = 'Postnummer må være 4 siffer';
    }
    if (specialInstructions.length > 500) {
      newErrors.specialInstructions = 'Henteinstruksjoner kan ikke være mer enn 500 tegn';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage(null);
    if (!validate() || !derivedCity || otherCity) return;

    setIsSaving(true);
    const result = await updateSubscriptionAddressAction({
      street,
      postalCode,
      specialInstructions,
      applyToUpcomingOrder: hasUpcomingOrder && applyToUpcomingOrder,
    });
    setIsSaving(false);

    if (result.success) {
      setSaveMessage({ kind: 'success', text: 'Adressen er lagret' });
      router.refresh();
    } else {
      setSaveMessage({ kind: 'error', text: result.error || 'Kunne ikke lagre adressen' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormInput
        label="Gateadresse"
        value={street}
        onChange={setStreet}
        placeholder="Eksempel: Bryggen 15"
        required
        error={errors.street}
      />

      <div className="grid grid-cols-2 gap-3">
        <FormInput
          label="Postnummer"
          value={postalCode}
          onChange={handlePostalCode}
          placeholder="4 siffer"
          type="tel"
          required
          error={errors.postalCode}
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
          <span>Vi er foreløpig kun i Bergen og Oslo. Dette postnummeret er utenfor området vårt.</span>
        </div>
      )}

      {otherCity && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            Abonnementet ditt gjelder {locationCity}. Flytter du til {derivedCity}, må du kansellere
            abonnementet og bestille på nytt med den nye adressen.
          </span>
        </div>
      )}

      <FormTextarea
        label="Henteinstruksjoner (valgfritt)"
        value={specialInstructions}
        onChange={setSpecialInstructions}
        placeholder="Portkode, parkeringsinfo, hvor nøkkel er, etc."
        rows={3}
        error={errors.specialInstructions}
      />

      <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
        <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
        <span>Endringen gjelder alle fremtidige hentinger i abonnementet.</span>
      </div>

      {hasUpcomingOrder && (
        <label className="flex items-start gap-3 rounded-2xl border border-cream-dark bg-white px-4 py-3">
          <input
            type="checkbox"
            checked={applyToUpcomingOrder}
            onChange={(e) => setApplyToUpcomingOrder(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-sea-green"
          />
          <span>
            <span className="block text-sm font-medium text-dark-gray">
              Oppdater også neste planlagte henting
            </span>
            <span className="mt-0.5 block text-sm text-medium-gray">
              Hvis du ikke huker av, beholder neste henting adressen den har nå.
            </span>
          </span>
        </label>
      )}

      <SaveMessage message={saveMessage} />

      <button type="submit" disabled={isSaving || outOfArea || otherCity} className={SAVE_BUTTON_CLASS}>
        {isSaving ? 'Lagrer…' : 'Lagre adresse'}
      </button>
    </form>
  );
}
