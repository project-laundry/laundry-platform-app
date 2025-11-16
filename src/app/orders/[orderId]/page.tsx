'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface OrderStatus {
  id: string;
  status: 'pending' | 'assigned' | 'awaiting_pickup' | 'picked_up' | 'in_progress' | 'ready_for_delivery' | 'delivered';
  assignedCleaner?: {
    name: string;
    rating: number;
    phone: string;
  };
  photoUploaded?: boolean;
}

const statusLabels = {
  pending: 'Venter på tildeling',
  assigned: 'Tildelt renser',
  awaiting_pickup: 'Venter på henting',
  picked_up: 'Hentet',
  in_progress: 'Under vask',
  ready_for_delivery: 'Klar for levering',
  delivered: 'Levert'
};

const statusSteps = [
  { key: 'pending', label: 'Bestilling mottatt', icon: '📝' },
  { key: 'assigned', label: 'Renser tildelt', icon: '👤' },
  { key: 'awaiting_pickup', label: 'Last opp bilde av pose', icon: '📸' },
  { key: 'picked_up', label: 'Hentet', icon: '🚗' },  
  { key: 'delivered', label: 'Levert', icon: '✅' }
];

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [orderData, setOrderData] = useState<OrderStatus | null>(null);

  useEffect(() => {
    // Mock order data - in real app this would come from API
    const mockOrder: OrderStatus = {
      id: orderId,
      status: 'awaiting_pickup',
      assignedCleaner: {
        name: 'Lisa Hansen',
        rating: 4.9,
        phone: '+47 987 65 432'
      },
      photoUploaded: false
    };

    setOrderData(mockOrder);
  }, [orderId]);

  const getStepStatus = (stepKey: string) => {
    if (!orderData) return 'upcoming';

    const currentIndex = statusSteps.findIndex(step => step.key === orderData.status);
    const stepIndex = statusSteps.findIndex(step => step.key === stepKey);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-gray mb-4">Laster bestilling...</h2>
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
            <span className="text-medium-gray">Bestilling {orderId}</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Følg din bestilling</h2>
          <p className="text-xl text-medium-gray">
            Bestilling #{orderId} • {statusLabels[orderData.status]}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Status Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-xl font-semibold text-dark-gray mb-8">Status</h3>

              <div className="space-y-8">
                {statusSteps.map((step, index) => {
                  const status = getStepStatus(step.key);
                  return (
                    <div key={step.key} className="flex items-start">
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        status === 'completed' ? 'bg-success-green text-white' :
                        status === 'current' ? 'bg-nordic-blue text-white' :
                        'bg-gray-200 text-gray-500'
                      }`}>
                        {status === 'completed' ? '✓' : step.icon}
                      </div>

                      {/* Content */}
                      <div className="ml-4 flex-1">
                        <h4 className={`text-lg font-semibold ${
                          status === 'completed' ? 'text-success-green' :
                          status === 'current' ? 'text-nordic-blue' :
                          'text-gray-500'
                        }`}>
                          {step.label}
                        </h4>

                        {/* Special content for current step */}
                        {status === 'current' && step.key === 'assigned' && orderData.assignedCleaner && (
                          <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800 mb-2">
                              <strong>{orderData.assignedCleaner.name}</strong> er tildelt din bestilling
                            </p>
                            <div className="flex items-center space-x-4 text-sm text-blue-700">
                              <span>⭐ {orderData.assignedCleaner.rating}/5</span>
                              <span>📞 {orderData.assignedCleaner.phone}</span>
                            </div>
                          </div>
                        )}

                        {status === 'current' && step.key === 'awaiting_pickup' && (
                          <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800 mb-3">
                              Last opp et bilde av vaskepose så sjåføren enkelt kan finne den
                            </p>
                            {!orderData.photoUploaded ? (
                              <Link
                                href="/orders/upload-photo"
                                className="inline-block bg-nordic-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                              >
                                📸 Last opp bilde nå
                              </Link>
                            ) : (
                              <div className="flex items-center text-sm text-green-700">
                                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Bilde lastet opp
                              </div>
                            )}
                          </div>
                        )}

                        {status === 'current' && step.key === 'picked_up' && (
                          <div className="mt-2 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                              Klærne dine er hentet og er på vei til renseri
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Connector Line */}
                      {index < statusSteps.length - 1 && (
                        <div className={`absolute left-6 mt-12 w-0.5 h-8 ${
                          getStepStatus(statusSteps[index + 1].key) === 'completed' ? 'bg-success-green' :
                          status === 'current' ? 'bg-nordic-blue' :
                          'bg-gray-200'
                        }`} style={{ marginLeft: '1.5rem' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Order Details Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-dark-gray mb-4">Handlinger</h3>
              <div className="space-y-3">                
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-nordic-blue transition-colors">
                  <div className="font-medium text-dark-gray">Endre leveringsadresse</div>
                  <div className="text-sm text-medium-gray">Hvis du ikke er hjemme</div>
                </button>
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-red-300 transition-colors text-red-600">
                  <div className="font-medium">Avbryt bestilling</div>
                  <div className="text-sm text-red-500">Kun mulig før henting</div>
                </button>
              </div>
            </div>

            {/* Estimated Times */}
            <div className="bg-white rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-dark-gray mb-4">Forventet tid</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-medium-gray">Henting:</span>
                  <span className="font-medium text-dark-gray">I dag 14:00-16:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-medium-gray">Levering:</span>
                  <span className="font-medium text-dark-gray">Torsdag 14:00-16:00</span>
                </div>
              </div>
            </div>

            {/* Support */}
            <div className="bg-nordic-blue/5 rounded-2xl p-6 border border-nordic-blue/20">
              <h3 className="text-lg font-semibold text-dark-gray mb-2">Trenger du hjelp?</h3>
              <p className="text-sm text-medium-gray mb-4">
                Vi er her for å hjelpe deg med spørsmål om bestillingen din.
              </p>
              <div className="flex gap-2">
                <a
                  href="mailto:hei@renvask.no"
                  className="text-sm bg-nordic-blue text-white px-4 py-2 rounded-lg hover:bg-blue-600"
                >
                  E-post
                </a>                
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-12">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-medium-gray hover:text-dark-gray"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Tilbake til dashbord
          </Link>
        </div>
      </div>
    </div>
  );
}