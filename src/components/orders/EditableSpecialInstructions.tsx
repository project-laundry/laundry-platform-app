'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { updateOrderSpecialInstructionsAction } from '@/app/orders/actions';

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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Spesielle instruksjoner</CardTitle>
          {isEditable && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-nordic-blue hover:text-nordic-blue/80"
            >
              Rediger
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              disabled={isLoading}
              placeholder="Legg til instruksjoner for henting..."
              className="w-full min-h-[100px] p-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-nordic-blue focus:border-transparent disabled:bg-gray-100"
            />
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
        ) : (
          <p className="text-sm text-dark-gray">
            {initialInstructions || 'Ingen instruksjoner lagt til'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
