'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderIroningAction } from '@/app/orders/actions';
import { Pencil, Check, X, Shirt } from 'lucide-react';

interface EditableIroningProps {
  orderId: string;
  initialNeedsIroning: boolean;
  isEditable: boolean;
}

export function EditableIroning({
  orderId,
  initialNeedsIroning,
  isEditable,
}: EditableIroningProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [needsIroning, setNeedsIroning] = useState(initialNeedsIroning);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateOrderIroningAction(orderId, needsIroning);

      if (!result.success) {
        alert(result.error || 'En feil oppstod');
        setIsLoading(false);
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating ironing:', error);
      alert('En feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNeedsIroning(initialNeedsIroning);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-cream/70 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
              <Shirt className="size-5" />
            </span>
            <span className="font-medium text-dark-gray">Stryking</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={needsIroning}
            disabled={isLoading}
            onClick={() => setNeedsIroning(!needsIroning)}
            className="flex items-center gap-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span
              className={`relative flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                needsIroning ? 'bg-sea-green' : 'bg-cream-dark'
              }`}
            >
              <span
                className={`absolute flex size-5 items-center justify-center rounded-full bg-white shadow transition-transform ${
                  needsIroning ? 'translate-x-6' : 'translate-x-1'
                }`}
              >
                {needsIroning && <Check className="size-3 text-sea-green" />}
              </span>
            </span>
            <span className="text-sm font-medium text-dark-gray">
              {needsIroning ? 'Ja' : 'Nei'}
            </span>
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-4 py-2 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            <Check className="size-3.5" />
            {isLoading ? 'Lagrer...' : 'Lagre'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="size-3.5" />
            Avbryt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
          <Shirt className="size-5" />
        </span>
        <span className="text-dark-gray">Stryking</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            initialNeedsIroning
              ? 'bg-sea-green/10 text-sea-green'
              : 'bg-cream-dark/60 text-medium-gray'
          }`}
        >
          {initialNeedsIroning ? 'Ja' : 'Nei'}
        </span>
        {isEditable && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label="Rediger stryking"
            className="flex size-8 items-center justify-center rounded-full text-nordic-blue transition-all hover:bg-cream hover:text-sea-green active:scale-90"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
