'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderSpecialInstructionsAction } from '@/app/orders/actions';
import { MessageSquare, Pencil, Check, X } from 'lucide-react';

interface EditableSpecialInstructionsProps {
  orderId: string;
  initialInstructions: string | null;
  isEditable: boolean;
}

export function EditableSpecialInstructions({
  orderId,
  initialInstructions,
  isEditable,
}: EditableSpecialInstructionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [instructions, setInstructions] = useState(initialInstructions || '');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateOrderSpecialInstructionsAction(orderId, instructions);

      if (!result.success) {
        alert(result.error || 'En feil oppstod');
        setIsLoading(false);
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating instructions:', error);
      alert('En feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setInstructions(initialInstructions || '');
    setIsEditing(false);
  };

  // Don't show card if no instructions and not editable
  if (!initialInstructions && !isEditable) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-serif text-lg font-semibold text-dark-gray">
          Vaskeinstruksjoner
        </h3>
        {isEditable && !isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-nordic-blue transition-colors hover:text-sea-green"
          >
            <Pencil className="size-3.5" />
            <span>Rediger</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-4 space-y-4">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={isLoading}
            rows={4}
            placeholder="Legg til instruksjoner for henting..."
            className="w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
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
          <MessageSquare className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <p className="text-dark-gray">
            {initialInstructions || (
              <span className="italic text-medium-gray">Ingen instruksjoner lagt til</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
