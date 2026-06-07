'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderAddressAction, UpdateOrderAddressInput } from '@/app/orders/actions';
import { MapPin, Pencil, Check, X } from 'lucide-react';

interface EditableAddressProps {
  orderId: string;
  initialAddress: {
    street: string;
    postalCode: string;
    city: string;
    country: string;
    specialInstructionsAddress: string | null;
  };
  isEditable: boolean;
}

export function EditableAddress({
  orderId,
  initialAddress,
  isEditable,
}: EditableAddressProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [street, setStreet] = useState(initialAddress.street);
  const [postalCode, setPostalCode] = useState(initialAddress.postalCode);
  const [specialInstructionsAddress, setSpecialInstructionsAddress] = useState(
    initialAddress.specialInstructionsAddress || ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validateFields = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate street
    const trimmedStreet = street.trim();
    if (!trimmedStreet || trimmedStreet.length < 3) {
      newErrors.street = 'Gateadresse må være minst 3 tegn';
    } else if (trimmedStreet.length > 200) {
      newErrors.street = 'Gateadresse kan ikke være mer enn 200 tegn';
    }

    // Validate postal code
    if (!/^\d{4}$/.test(postalCode)) {
      newErrors.postalCode = 'Postnummer må være 4 siffer';
    }    

    // Validate address instructions (optional)
    if (specialInstructionsAddress && specialInstructionsAddress.length > 500) {
      newErrors.specialInstructionsAddress = 'Adresseinstruksjoner kan ikke være mer enn 500 tegn';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateFields()) {
      return;
    }

    setIsLoading(true);
    try {
      const addressData: UpdateOrderAddressInput = {
        street: street.trim(),
        postalCode,
        city: initialAddress.city,
        specialInstructionsAddress: specialInstructionsAddress.trim() || null,
      };

      const result = await updateOrderAddressAction(orderId, addressData);

      if (!result.success) {
        alert(result.error || 'En feil oppstod');
        setIsLoading(false);
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating address:', error);
      alert('En feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setStreet(initialAddress.street);
    setPostalCode(initialAddress.postalCode);    
    setSpecialInstructionsAddress(initialAddress.specialInstructionsAddress || '');
    setErrors({});
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-[hsl(var(--nordic-blue)/4%)] border border-[hsl(var(--nordic-blue)/8%)] p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-serif text-lg text-[hsl(var(--nordic-blue))]">
          Adresse
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
          {/* Street Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gateadresse
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              disabled={isLoading}
              placeholder="Eksempel: Bryggen 15"
              className="w-full p-3 text-base text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--nordic-blue)/30%)] focus:border-transparent disabled:bg-gray-100 transition-all"
            />
            {errors.street && (
              <p className="mt-1 text-sm text-red-600">{errors.street}</p>
            )}
          </div>

          {/* Postal Code Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Postnummer
            </label>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              disabled={isLoading}
              placeholder="1234"
              maxLength={4}
              className="w-full p-3 text-base text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--nordic-blue)/30%)] focus:border-transparent disabled:bg-gray-100 transition-all"
            />
            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
            )}
          </div>

          {/* City Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              By
            </label>
            <input
              type="text"
              value={initialAddress.city}
              disabled
              className="w-full p-3 text-base text-gray-500 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed"
            />
          </div>

          {/* Address Instructions Textarea */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Henteinstruksjoner (valgfritt)
            </label>
            <textarea
              value={specialInstructionsAddress}
              onChange={(e) => setSpecialInstructionsAddress(e.target.value)}
              disabled={isLoading}
              placeholder="Portkode, parkeringsinfo, hvor nøkkel er, etc."
              className="w-full min-h-[100px] p-3 text-base text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[hsl(var(--nordic-blue)/30%)] focus:border-transparent disabled:bg-gray-100 resize-none transition-all"
            />
            {errors.specialInstructionsAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.specialInstructionsAddress}</p>
            )}
          </div>

          {/* Action Buttons */}
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
            <MapPin className="w-5 h-5 text-[hsl(var(--nordic-blue))]" />
          </div>
          <div className="pt-2">
            <p className="text-gray-700">{initialAddress.street}</p>
            <p className="text-gray-700">
              {initialAddress.postalCode} {initialAddress.city}
            </p>
            {initialAddress.specialInstructionsAddress && (
              <p className="text-gray-500 italic mt-2">
                {initialAddress.specialInstructionsAddress}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
