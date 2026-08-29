'use client';

import { useState, useMemo, useCallback } from 'react';
import { AlertCircle, Check, Minus, NotebookPen, Plus, Shirt, WashingMachine } from 'lucide-react';
import { IroningQuantityInput } from './IroningQuantityInput';
import { PriceSummary } from './PriceSummary';
import { saveLaundryDetails } from '../actions';
import {
  type IroningDetails,
  type LaundryDetails,
  type PriceBreakdown,
  type IroningGroup,
  getEmptyIroningDetails,
  calculateOrderPrice,
  computeDiscountOre,
  PRICING,
  formatNok,
} from '@/lib/config/pricing';
import type { OrderPromo } from '@/types/database';

interface LaundryDetailsFormProps {
  orderId: string;
  needsIroning: boolean;
  initialWashLoads: number;
  initialIroningDetails: IroningDetails | null;
  initialNotes: string | null;
  isEditable: boolean;
  promo?: OrderPromo | null;
}

const IRONING_CATEGORIES: IroningGroup[] = [
  'everyday',
  'shirts_dresses',
  'bedding',
];

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          {icon}
        </span>
        <div>
          <h2 className="font-serif text-lg font-semibold leading-none text-dark-gray">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-medium-gray">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Load counter row — mirrors the order-flow Stepper look, but keeps a typed
 *  number input in the middle so the cleaner can enter counts directly. */
function LoadRow({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (n: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="font-medium text-dark-gray">{label}</p>
        {hint && <p className="text-sm text-medium-gray">{hint}</p>}
        <p className="mt-1 text-xs tabular-nums text-nordic-blue">
          {formatNok(PRICING.price_per_load_ore)} kr/vask
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="Færre"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={disabled || value === 0}
          className="flex size-11 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue shadow-sm transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:border-cream-dark disabled:text-cream-dark disabled:active:scale-100"
        >
          <Minus className="size-5" />
        </button>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= 0) onChange(val);
          }}
          disabled={disabled}
          className="h-11 w-14 rounded-2xl border border-cream-dark bg-white text-center font-serif text-xl font-semibold tabular-nums text-dark-gray outline-none transition-colors focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50 disabled:text-medium-gray"
        />
        <button
          type="button"
          aria-label="Flere"
          onClick={() => onChange(value + 1)}
          disabled={disabled}
          className="flex size-11 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue shadow-sm transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:border-cream-dark disabled:text-cream-dark disabled:active:scale-100"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}

export function LaundryDetailsForm({
  orderId,
  needsIroning,
  initialWashLoads,
  initialIroningDetails,
  initialNotes,
  isEditable,
  promo = null,
}: LaundryDetailsFormProps) {
  const [washLoads, setWashLoads] = useState(initialWashLoads);
  const [ironingDetails, setIroningDetails] = useState<IroningDetails>(
    initialIroningDetails || getEmptyIroningDetails()
  );
  const [notes, setNotes] = useState(initialNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Calculate price breakdown
  const getLaundryDetails = useCallback((): LaundryDetails => ({
    wash_loads: washLoads,
    ironing_details: needsIroning ? ironingDetails : null,
  }), [washLoads, needsIroning, ironingDetails]);

  const priceBreakdown = useMemo<PriceBreakdown>(
    () => calculateOrderPrice(getLaundryDetails()),
    [getLaundryDetails]
  );

  const handleIroningChange = (category: IroningGroup, value: number) => {
    setIroningDetails((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await saveLaundryDetails(orderId, getLaundryDetails(), notes || undefined);

      if (!result.success) {
        setError(result.error || 'Kunne ikke lagre');
        return;
      }

      setSuccessMessage('Vaskdetaljer lagret');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      setError('En feil oppstod');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are changes to save
  const hasChanges =
    washLoads !== initialWashLoads ||
    notes !== (initialNotes || '') ||
    (needsIroning && JSON.stringify(ironingDetails) !== JSON.stringify(initialIroningDetails || getEmptyIroningDetails()));

  return (
    <div className="space-y-6">
      {/* Loads Section */}
      <SectionCard
        icon={<WashingMachine className="size-5" />}
        title="Vaskemengde"
        subtitle="Prisen gjelder per vask (inntil 5 kg). Sengetøy vaskes for seg og teller som egen vask."
      >
        <LoadRow
          label="Antall vask"
          value={washLoads}
          onChange={setWashLoads}
          disabled={!isEditable}
        />
      </SectionCard>

      {/* Ironing Section (only if ironing is included) */}
      {needsIroning && (
        <SectionCard
          icon={<Shirt className="size-5" />}
          title="Stryking"
          subtitle="Registrer antall plagg som skal strykes."
        >
          <div className="divide-y divide-cream-dark/60">
            {IRONING_CATEGORIES.map((category) => (
              <IroningQuantityInput
                key={category}
                category={category}
                value={ironingDetails[category]}
                onChange={(value) => handleIroningChange(category, value)}
                disabled={!isEditable}
              />
            ))}
          </div>
        </SectionCard>
      )}

      {/* Notes */}
      <SectionCard
        icon={<NotebookPen className="size-5" />}
        title="Prisnotat"
        subtitle="Valgfritt notat om prissettingen"
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={!isEditable}
          rows={3}
          placeholder="F.eks. spesielle hensyn, ekstra arbeid..."
          className="w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50 disabled:text-medium-gray"
        />
      </SectionCard>

      {/* Price Summary */}
      <PriceSummary
        breakdown={priceBreakdown}
        showCleanerPayout={true}
        promoCode={promo?.code}
        discountOre={promo ? computeDiscountOre(priceBreakdown.total_ore, promo) : 0}
      />

      {/* Error/Success messages */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="flex items-start gap-2 rounded-2xl bg-sea-green/10 px-3.5 py-2.5 text-sm text-sea-green">
          <Check className="mt-0.5 size-4 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Save button */}
      {isEditable && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || washLoads === 0}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
        >
          {isSaving ? 'Lagrer...' : hasChanges ? 'Lagre vaskdetaljer' : 'Lagret'}
        </button>
      )}
    </div>
  );
}
