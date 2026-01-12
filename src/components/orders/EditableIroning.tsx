'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { updateOrderIroningAction } from '@/app/orders/actions';

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
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-medium-gray">Stryking</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={needsIroning}
              onChange={(e) => setNeedsIroning(e.target.checked)}
              disabled={isLoading}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-nordic-blue rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nordic-blue"></div>
            <span className="ml-2 text-sm font-medium text-dark-gray">
              {needsIroning ? 'Ja' : 'Nei'}
            </span>
          </label>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={isLoading}
            size="sm"
          >
            {isLoading ? 'Lagrer...' : 'Lagre'}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            Avbryt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center">
      <span className="text-medium-gray">Stryking</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-dark-gray">
          {initialNeedsIroning ? 'Ja' : 'Nei'}
        </span>
        {isEditable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="text-nordic-blue hover:text-nordic-blue/80 h-auto p-1"
          >
            Endre
          </Button>
        )}
      </div>
    </div>
  );
}
