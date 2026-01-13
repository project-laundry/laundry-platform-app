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
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--nordic-blue)/10%)] flex items-center justify-center">
              <Shirt className="w-4 h-4 text-[hsl(var(--nordic-blue))]" />
            </div>
            <span className="text-gray-700 font-medium">Stryking</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={needsIroning}
              onChange={(e) => setNeedsIroning(e.target.checked)}
              disabled={isLoading}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[hsl(var(--nordic-blue)/30%)] rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm peer-checked:bg-gradient-to-r peer-checked:from-[hsl(var(--nordic-blue))] peer-checked:to-[hsl(var(--sea-green))]" />
            <span className="ml-3 text-sm font-medium text-gray-700">
              {needsIroning ? 'Ja' : 'Nei'}
            </span>
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-[hsl(var(--nordic-blue))] to-[hsl(var(--sea-green))] rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
          >
            <Check className="w-3.5 h-3.5" />
            {isLoading ? 'Lagrer...' : 'Lagre'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Avbryt
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--nordic-blue)/10%)] flex items-center justify-center">
          <Shirt className="w-4 h-4 text-[hsl(var(--nordic-blue))]" />
        </div>
        <span className="text-gray-600">Stryking</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            initialNeedsIroning
              ? 'bg-[hsl(var(--sea-green)/15%)] text-[hsl(var(--sea-green))]'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {initialNeedsIroning ? 'Ja' : 'Nei'}
        </span>
        {isEditable && (
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-[hsl(var(--nordic-blue)/60%)] hover:text-[hsl(var(--nordic-blue))] hover:bg-[hsl(var(--nordic-blue)/5%)] rounded-lg transition-all"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
