'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface OrderData {
  pickupDate: string;
  pickupTime: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    specialInstructions: string;
  };
  pickupMethod: 'home' | 'entrance' | 'other';
  otherLocation: string;
}

export default function InstructionsPage() {
  const searchParams = useSearchParams();
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');

  useEffect(() => {
    const data = searchParams.get('data');
    if (data) {
      try {
        const parsed = JSON.parse(decodeURIComponent(data));
        setOrderData(parsed);
      } catch (e) {
        console.error('Failed to parse order data:', e);
      }
    }
  }, [searchParams]);

  const handleContinue = () => {
    if (!orderData) return;

    const fullOrderData = {
      ...orderData,
      specialInstructions
    };

    console.log('Complete order data with instructions:', fullOrderData);
    const encodedData = encodeURIComponent(JSON.stringify(fullOrderData));
    window.location.href = `/orders/confirm?data=${encodedData}`;
  };

  const handleQuickAdd = (instruction: string) => {
    if (specialInstructions.trim()) {
      setSpecialInstructions(prev => prev + '\n' + instruction);
    } else {
      setSpecialInstructions(instruction);
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-gray mb-4">Laster...</h2>
          <p className="text-medium-gray">Hvis dette tar for lang tid, <Link href="/orders/additional-services" className="text-nordic-blue hover:underline">start på nytt</Link>.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <span className="text-medium-gray">Spesielle instruksjoner</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-success-green text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="ml-2 text-success-green font-medium">Velg tid</span>
            </div>
            <div className="w-8 h-0.5 bg-success-green"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-nordic-blue text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <span className="ml-2 text-nordic-blue font-medium">Instruksjoner</span>
            </div>
            <div className="w-8 h-0.5 bg-gray-300"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="ml-2 text-gray-600">Bekreft</span>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Har du noen spesielle instruksjoner?</h2>
          <p className="text-xl text-medium-gray">
            Dette er valgfritt, men hjelper oss å gi deg den beste servicen.
          </p>
        </div>

        {/* Instructions Input */}
        <div className="bg-white rounded-2xl p-8">
          <h3 className="text-lg font-semibold text-dark-gray mb-4">Dine instruksjoner</h3>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            placeholder="Skriv dine spesielle ønsker eller instruksjoner her..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue resize-none"
            rows={6}
          />
          <p className="text-sm text-medium-gray mt-2">
            F.eks. behandling av spesielle materialer, fargepreferanser, allergier, etc.
          </p>
        </div>

        {/* Continue Section */}
        <div className="mt-12 bg-white rounded-2xl p-8">
          <div className="flex justify-between items-center">
            <Link
              href={`/orders/schedule?data=${searchParams.get('data')}`}
              className="text-medium-gray hover:text-dark-gray"
            >
              ← Tilbake til tidsvalg
            </Link>

            <button
              onClick={handleContinue}
              className="px-8 py-3 bg-nordic-blue text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors text-lg"
            >
              Fortsett til bekreftelse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}