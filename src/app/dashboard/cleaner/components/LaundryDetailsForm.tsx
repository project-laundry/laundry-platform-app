'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IroningQuantityInput } from './IroningQuantityInput';
import { PriceSummary } from './PriceSummary';
import { saveLaundryDetails } from '../actions';
import {
  type IroningDetails,
  type LaundryDetails,
  type PriceBreakdown,
  type IroningCategory,
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
  initialDarkLoads: number;
  initialWhiteLoads: number;
  initialIroningDetails: IroningDetails | null;
  initialNotes: string | null;
  isEditable: boolean;
  promo?: OrderPromo | null;
}

const IRONING_CATEGORIES: IroningCategory[] = [
  'kids_pillow',
  'tshirts_shorts',
  'business_shirts',
  'single_bedding',
  'complex_dresses',
  'double_bedding',
  'king_bedding',
];

export function LaundryDetailsForm({
  orderId,
  needsIroning,
  initialDarkLoads,
  initialWhiteLoads,
  initialIroningDetails,
  initialNotes,
  isEditable,
  promo = null,
}: LaundryDetailsFormProps) {
  const [darkLoads, setDarkLoads] = useState(initialDarkLoads);
  const [whiteLoads, setWhiteLoads] = useState(initialWhiteLoads);
  const [ironingDetails, setIroningDetails] = useState<IroningDetails>(
    initialIroningDetails || getEmptyIroningDetails()
  );
  const [notes, setNotes] = useState(initialNotes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Calculate price breakdown
  const getLaundryDetails = useCallback((): LaundryDetails => ({
    dark_loads: darkLoads,
    white_loads: whiteLoads,
    ironing_details: needsIroning ? ironingDetails : null,
  }), [darkLoads, whiteLoads, needsIroning, ironingDetails]);

  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown>(() =>
    calculateOrderPrice(getLaundryDetails())
  );

  // Update price when inputs change
  useEffect(() => {
    setPriceBreakdown(calculateOrderPrice(getLaundryDetails()));
  }, [getLaundryDetails]);

  const handleIroningChange = (category: IroningCategory, value: number) => {
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
    darkLoads !== initialDarkLoads ||
    whiteLoads !== initialWhiteLoads ||
    notes !== (initialNotes || '') ||
    (needsIroning && JSON.stringify(ironingDetails) !== JSON.stringify(initialIroningDetails || getEmptyIroningDetails()));

  return (
    <div className="space-y-6">
      {/* Loads Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vaskemengde</CardTitle>
          <p className="text-sm text-medium-gray">
            Mørke og hvite klær vaskes separat. Prisen gjelder per vask (inntil 5 kg).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dark loads */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-dark-gray">Mørk vask</div>
              <div className="text-sm text-medium-gray">Mørke og fargede klær</div>
              <div className="text-xs text-nordic-blue mt-1">
                {formatNok(PRICING.price_per_load_ore)} kr/vask
              </div>
            </div>
            <div className="flex items-center gap-1 bg-soft-gray rounded-lg p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={() => setDarkLoads(Math.max(0, darkLoads - 1))}
                disabled={!isEditable || darkLoads === 0}
              >
                <span className="text-xl">-</span>
              </Button>
              <input
                type="number"
                min="0"
                value={darkLoads}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0) setDarkLoads(val);
                }}
                disabled={!isEditable}
                className="w-16 h-10 text-center bg-white rounded-md border-0 text-lg font-medium focus:ring-2 focus:ring-nordic-blue/30 disabled:opacity-50"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={() => setDarkLoads(darkLoads + 1)}
                disabled={!isEditable}
              >
                <span className="text-xl">+</span>
              </Button>
            </div>
          </div>

          {/* White loads */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-dark-gray">Hvit vask</div>
              <div className="text-sm text-medium-gray">Hvite og lyse klær</div>
              <div className="text-xs text-nordic-blue mt-1">
                {formatNok(PRICING.price_per_load_ore)} kr/vask
              </div>
            </div>
            <div className="flex items-center gap-1 bg-soft-gray rounded-lg p-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={() => setWhiteLoads(Math.max(0, whiteLoads - 1))}
                disabled={!isEditable || whiteLoads === 0}
              >
                <span className="text-xl">-</span>
              </Button>
              <input
                type="number"
                min="0"
                value={whiteLoads}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0) setWhiteLoads(val);
                }}
                disabled={!isEditable}
                className="w-16 h-10 text-center bg-white rounded-md border-0 text-lg font-medium focus:ring-2 focus:ring-nordic-blue/30 disabled:opacity-50"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-md"
                onClick={() => setWhiteLoads(whiteLoads + 1)}
                disabled={!isEditable}
              >
                <span className="text-xl">+</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ironing Section (only if ironing is included) */}
      {needsIroning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stryking</CardTitle>
            <p className="text-sm text-medium-gray">
              Registrer antall plagg som skal strykes.
            </p>
          </CardHeader>
          <CardContent>
            {IRONING_CATEGORIES.map((category) => (
              <IroningQuantityInput
                key={category}
                category={category}
                value={ironingDetails[category]}
                onChange={(value) => handleIroningChange(category, value)}
                disabled={!isEditable}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Prisnotat</CardTitle>
          <p className="text-sm text-medium-gray">
            Valgfritt notat om prissettingen
          </p>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isEditable}
            placeholder="F.eks. spesielle hensyn, ekstra arbeid..."
            className="w-full min-h-[80px] p-3 rounded-lg border border-gray-200 bg-white text-base focus:ring-2 focus:ring-nordic-blue/30 focus:border-nordic-blue disabled:opacity-50 disabled:bg-soft-gray"
          />
        </CardContent>
      </Card>

      {/* Price Summary */}
      <PriceSummary
        breakdown={priceBreakdown}
        showCleanerPayout={true}
        promoCode={promo?.code}
        discountOre={promo ? computeDiscountOre(priceBreakdown.total_ore, promo) : 0}
      />

      {/* Error/Success messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {successMessage}
        </div>
      )}

      {/* Save button */}
      {isEditable && (
        <Button
          onClick={handleSave}
          disabled={isSaving || (darkLoads === 0 && whiteLoads === 0)}
          className="w-full"
          size="lg"
        >
          {isSaving ? 'Lagrer...' : hasChanges ? 'Lagre vaskdetaljer' : 'Lagret'}
        </Button>
      )}
    </div>
  );
}
