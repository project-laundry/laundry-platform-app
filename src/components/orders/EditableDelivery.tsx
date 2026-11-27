'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderDeliveryAction } from '@/app/orders/actions';
import {
  DELIVERY_IF_ABSENT_OPTIONS,
  DELIVERY_INSTRUCTIONS_MAX_LENGTH,
  DELIVERY_NOTE_LABEL,
  DELIVERY_NOTE_PLACEHOLDER,
  DELIVERY_QUESTION,
  deliveryIfAbsentLabel,
  deliveryInputError,
} from '@/lib/config/delivery';
import type { DeliveryIfAbsent } from '@/types/database';
import { Truck, Pencil, Check, X, AlertCircle } from 'lucide-react';

interface EditableDeliveryProps {
  orderId: string;
  initialIfAbsent: DeliveryIfAbsent | null;
  initialInstructions: string | null;
  /** True until the order is delivered or cancelled. */
  isEditable: boolean;
}

export function EditableDelivery({
  orderId,
  initialIfAbsent,
  initialInstructions,
  isEditable,
}: EditableDeliveryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [ifAbsent, setIfAbsent] = useState<DeliveryIfAbsent | null>(initialIfAbsent);
  const [instructions, setInstructions] = useState(initialInstructions || '');
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const router = useRouter();

  const handleSave = async () => {
    if (!ifAbsent) return;
    setIsLoading(true);
    setSaveError(null);
    try {
      const result = await updateOrderDeliveryAction(orderId, { ifAbsent, instructions });

      if (!result.success) {
        setSaveError(result.error || 'Noe gikk galt. Prøv igjen.');
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating delivery choice:', error);
      setSaveError('Noe gikk galt. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIfAbsent(initialIfAbsent);
    setInstructions(initialInstructions || '');
    setSaveError(null);
    setIsEditing(false);
  };

  // Nothing to show on a finished order from before the choice existed
  if (!initialIfAbsent && !isEditable) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-dark-gray">Levering</h3>
        {isEditable && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-nordic-blue transition-colors hover:text-sea-green"
          >
            <Pencil className="size-3.5" />
            <span>{initialIfAbsent ? 'Rediger' : 'Velg'}</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm font-medium text-dark-gray">{DELIVERY_QUESTION}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {DELIVERY_IF_ABSENT_OPTIONS.map((option) => {
              const active = ifAbsent === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  disabled={isLoading}
                  onClick={() => setIfAbsent(option.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? 'border-sea-green bg-sea-green/8'
                      : 'border-cream-dark bg-white hover:border-sea-green/50'
                  }`}
                >
                  <p className="font-medium text-dark-gray">{option.title}</p>
                  <p className="text-sm text-medium-gray">{option.subtitle}</p>
                </button>
              );
            })}
          </div>
          {ifAbsent === 'other' && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">
              {DELIVERY_NOTE_LABEL}
            </span>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isLoading}
              rows={3}
              autoFocus
              maxLength={DELIVERY_INSTRUCTIONS_MAX_LENGTH}
              placeholder={DELIVERY_NOTE_PLACEHOLDER}
              className="w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50"
            />
          </label>
          )}
          {saveError && (
            <div role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <p>{saveError}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading || !ifAbsent || deliveryInputError(ifAbsent, instructions) !== null}
              className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-4 py-2 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
            >
              <Check className="size-4" />
              {isLoading ? 'Lagrer...' : 'Lagre'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X className="size-4" />
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-3">
          <Truck className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <div>
            <p className="text-sm text-medium-gray">{DELIVERY_QUESTION}</p>
            {initialIfAbsent ? (
              <p className="font-medium text-dark-gray">{deliveryIfAbsentLabel(initialIfAbsent)}</p>
            ) : (
              <p className="italic text-medium-gray">Du har ikke valgt ennå</p>
            )}
            {initialInstructions && (
              <p className="mt-1 whitespace-pre-line text-sm text-dark-gray">{initialInstructions}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
