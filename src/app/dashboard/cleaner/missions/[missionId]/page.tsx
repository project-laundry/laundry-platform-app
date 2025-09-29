'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type OrderPhase = 'assigned' | 'en_route_pickup' | 'at_pickup' | 'picked_up' | 'washing' | 'en_route_delivery' | 'delivered';

interface OrderProgress {
  phase: OrderPhase;
  timestamp?: Date;
  photo?: string;
  notes?: string;
}

interface MissionDetails {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    email: string;
  };
  pickupAddress: string;
  deliveryAddress: string;
  items: {
    type: string;
    quantity: number;
    specialCare?: boolean;
  }[];
  specialInstructions?: string;
  estimatedPickupTime: string;
  estimatedDeliveryTime: string;
  payment: number;
  currentPhase: OrderPhase;
  progress: OrderProgress[];
}

const mockMission: MissionDetails = {
  id: '1',
  orderNumber: 'RV-2024-001234',
  customer: {
    name: 'Emma Hansen',
    phone: '+47 123 45 678',
    email: 'emma.hansen@email.com'
  },
  pickupAddress: 'Sandviken 12, 5020 Bergen',
  deliveryAddress: 'Sandviken 12, 5020 Bergen',
  items: [
    { type: 'Skjorter', quantity: 3, specialCare: false },
    { type: 'Bukser', quantity: 2, specialCare: false },
    { type: 'Kjoler', quantity: 1, specialCare: true }
  ],
  specialInstructions: 'Ring på døren, ikke summer. Hunden bjeffer mye.',
  estimatedPickupTime: '14:00 - 15:00',
  estimatedDeliveryTime: '16:00 - 17:00 (i morgen)',
  payment: 150,
  currentPhase: 'assigned',
  progress: [
    {
      phase: 'assigned',
      timestamp: new Date(),
      notes: 'Oppdrag tildelt'
    }
  ]
};

const phaseLabels: Record<OrderPhase, string> = {
  assigned: 'Tildelt',
  en_route_pickup: 'På vei til henting',
  at_pickup: 'Ankommet hentested',
  picked_up: 'Hentet',
  washing: 'Under vask',
  en_route_delivery: 'På vei til levering',
  delivered: 'Levert'
};

const phaseIcons: Record<OrderPhase, string> = {
  assigned: '📋',
  en_route_pickup: '🚗',
  at_pickup: '📍',
  picked_up: '✅',
  washing: '🧺',
  en_route_delivery: '🚚',
  delivered: '🎉'
};

export default function MissionDetailsPage() {
  const params = useParams();
  const [mission] = useState<MissionDetails>(mockMission);
  const [currentPhase, setCurrentPhase] = useState<OrderPhase>(mission.currentPhase);
  const [photoCapture, setPhotoCapture] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);

  const phases: OrderPhase[] = ['assigned', 'en_route_pickup', 'at_pickup', 'picked_up', 'washing', 'en_route_delivery', 'delivered'];
  const currentPhaseIndex = phases.indexOf(currentPhase);

  const handlePhaseUpdate = (newPhase: OrderPhase) => {
    setCurrentPhase(newPhase);
    // In real app, this would make an API call
  };

  const handlePhotoCapture = () => {
    // In real app, this would trigger camera
    setShowPhotoCapture(true);
  };

  const canProgressTo = (phase: OrderPhase) => {
    const phaseIndex = phases.indexOf(phase);
    return phaseIndex <= currentPhaseIndex + 1;
  };

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/cleaner"
              className="text-nordic-blue hover:text-blue-600"
            >
              ← Tilbake til dashboard
            </Link>
            <h1 className="text-xl font-bold text-dark-gray">Oppdrag {mission.orderNumber}</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Progress */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-dark-gray mb-6">Oppdrags fremdrift</h2>

          <div className="space-y-4">
            {phases.map((phase, index) => {
              const isCompleted = index < currentPhaseIndex;
              const isCurrent = index === currentPhaseIndex;
              const isNext = index === currentPhaseIndex + 1;

              return (
                <div
                  key={phase}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                    isCompleted
                      ? 'bg-green-50 border border-green-200'
                      : isCurrent
                      ? 'bg-blue-50 border border-blue-200'
                      : isNext
                      ? 'bg-gray-50 border border-gray-200 hover:bg-gray-100 cursor-pointer'
                      : 'bg-gray-50 border border-gray-200 opacity-50'
                  }`}
                  onClick={() => isNext && handlePhaseUpdate(phase)}
                >
                  <div className={`text-2xl ${isCompleted ? 'opacity-50' : ''}`}>
                    {phaseIcons[phase]}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold ${
                      isCompleted ? 'text-green-800' :
                      isCurrent ? 'text-blue-800' : 'text-gray-600'
                    }`}>
                      {phaseLabels[phase]}
                    </h3>
                    {isCurrent && (
                      <p className="text-sm text-blue-600">Nåværende status</p>
                    )}
                    {isNext && (
                      <p className="text-sm text-gray-500">Klikk for å oppdatere</p>
                    )}
                  </div>
                  {isCompleted && (
                    <div className="text-green-600">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Information */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-dark-gray mb-6">Kundeinformasjon</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-dark-gray mb-3">Kontakt</h3>
              <div className="space-y-2">
                <p><span className="text-medium-gray">Navn:</span> {mission.customer.name}</p>
                <p><span className="text-medium-gray">Telefon:</span>
                  <a href={`tel:${mission.customer.phone}`} className="text-nordic-blue hover:underline ml-2">
                    {mission.customer.phone}
                  </a>
                </p>
                <p><span className="text-medium-gray">E-post:</span>
                  <a href={`mailto:${mission.customer.email}`} className="text-nordic-blue hover:underline ml-2">
                    {mission.customer.email}
                  </a>
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-dark-gray mb-3">Adresser</h3>
              <div className="space-y-2">
                <p><span className="text-medium-gray">Henting:</span> {mission.pickupAddress}</p>
                <p><span className="text-medium-gray">Levering:</span> {mission.deliveryAddress}</p>
              </div>
            </div>
          </div>

          {mission.specialInstructions && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">Spesielle instruksjoner</h4>
              <p className="text-yellow-700">{mission.specialInstructions}</p>
            </div>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-dark-gray mb-6">Bestillingsdetaljer</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-dark-gray mb-3">Plagg</h3>
              <div className="space-y-2">
                {mission.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-dark-gray">
                      {item.quantity}x {item.type}
                      {item.specialCare && <span className="text-yellow-600 ml-1">⭐</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-dark-gray mb-3">Tidsplan</h3>
              <div className="space-y-2">
                <p><span className="text-medium-gray">Henting:</span> {mission.estimatedPickupTime}</p>
                <p><span className="text-medium-gray">Levering:</span> {mission.estimatedDeliveryTime}</p>
                <p><span className="text-medium-gray">Betaling:</span> <span className="font-bold text-green-600">{mission.payment} NOK</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={handlePhotoCapture}
            className="bg-nordic-blue text-white font-semibold py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            📷 Ta bilde
          </button>

          <button className="bg-green-500 text-white font-semibold py-3 rounded-lg hover:bg-green-600 transition-colors">
            📞 Ring kunde
          </button>
        </div>

        {/* Photo Capture Modal */}
        {showPhotoCapture && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-bold text-dark-gray mb-4">Ta bilde av oppdraget</h3>
              <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4">
                <p className="text-gray-500">Kamera vil åpne her</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPhotoCapture(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
                >
                  Avbryt
                </button>
                <button
                  onClick={() => setShowPhotoCapture(false)}
                  className="flex-1 bg-nordic-blue text-white py-2 rounded-lg hover:bg-blue-600"
                >
                  Ta bilde
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}