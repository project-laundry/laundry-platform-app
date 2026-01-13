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
    <div className="bg-white rounded-2xl shadow-lg shadow-[hsl(var(--nordic-blue)/4%)] border border-[hsl(var(--nordic-blue)/8%)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-serif text-lg text-[hsl(var(--nordic-blue))]">
          Spesielle instruksjoner
        </h3>
        {isEditable && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-sm text-[hsl(var(--nordic-blue)/70%)] hover:text-[hsl(var(--nordic-blue))] transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Rediger</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            disabled={isLoading}
            placeholder="Legg til instruksjoner for henting..."
            className="w-full min-h-[120px] p-4 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--nordic-blue)/30%)] focus:border-transparent disabled:bg-gray-100 resize-none transition-all"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
            >
              <Check className="w-4 h-4" />
              {isLoading ? 'Lagrer...' : 'Lagre'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all"
            >
              <X className="w-4 h-4" />
              Avbryt
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--nordic-blue)/8%)] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-[hsl(var(--nordic-blue))]" />
          </div>
          <p className="text-gray-700 pt-2">
            {initialInstructions || (
              <span className="text-gray-400 italic">Ingen instruksjoner lagt til</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
