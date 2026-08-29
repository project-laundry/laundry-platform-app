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

const INPUT_CLASS =
  'w-full rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50';

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

  if (!isEditing) {
    return (
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <div>
            <p className="font-medium text-dark-gray">
              {initialAddress.street}, {initialAddress.postalCode} {initialAddress.city}
            </p>
            {initialAddress.specialInstructionsAddress && (
              <p className="text-sm italic text-medium-gray">
                {initialAddress.specialInstructionsAddress}
              </p>
            )}
          </div>
        </div>
        {isEditable && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-nordic-blue transition-colors hover:text-sea-green"
          >
            <Pencil className="size-3.5" />
            <span>Rediger</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-1 duration-300">
      <p className="text-sm font-medium text-dark-gray">Adresse</p>
      <div className="mt-3 space-y-4">
          {/* Street Input */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">
              Gateadresse
            </span>
            <input
              type="text"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              disabled={isLoading}
              placeholder="Eksempel: Bryggen 15"
              className={INPUT_CLASS}
            />
            {errors.street && (
              <p className="mt-1 text-sm text-red-600">{errors.street}</p>
            )}
          </label>

          {/* Postal Code Input */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">
              Postnummer
            </span>
            <input
              type="text"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              disabled={isLoading}
              placeholder="1234"
              maxLength={4}
              className={`${INPUT_CLASS} tabular-nums`}
            />
            {errors.postalCode && (
              <p className="mt-1 text-sm text-red-600">{errors.postalCode}</p>
            )}
          </label>

          {/* City (locked) */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">By</span>
            <input
              type="text"
              value={initialAddress.city}
              disabled
              className="w-full cursor-not-allowed rounded-2xl border border-cream-dark bg-cream/50 px-4 py-3 text-medium-gray outline-none"
            />
          </label>

          {/* Address Instructions Textarea */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">
              Henteinstruksjoner (valgfritt)
            </span>
            <textarea
              value={specialInstructionsAddress}
              onChange={(e) => setSpecialInstructionsAddress(e.target.value)}
              disabled={isLoading}
              rows={3}
              placeholder="Portkode, parkeringsinfo, hvor nøkkel er, etc."
              className={`${INPUT_CLASS} resize-none`}
            />
            {errors.specialInstructionsAddress && (
              <p className="mt-1 text-sm text-red-600">{errors.specialInstructionsAddress}</p>
            )}
          </label>

          {/* Action Buttons */}
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
    </div>
  );
}
