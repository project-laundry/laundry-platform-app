'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { createSubscriptionAction } from '../actions';

function ConfirmPageContent() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if required data not present
  useEffect(() => {
    if (!orderData?.location || !orderData?.firstPickupDate || !orderData?.address) {
      router.push('/orders/location-service');
    }
  }, [orderData, router]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Ikke valgt';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Ikke valgt';
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

    return `${dayNames[date.getDay()]} ${date.getDate()}. ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getFrequencyLabel = (isRecurring: boolean, frequency: string | null) => {
    if (!isRecurring) return 'Engangs';
    if (frequency === 'weekly') return 'Ukentlig';
    if (frequency === 'biweekly') return 'Annenhver uke';
    if (frequency === 'monthly') return 'Månedlig';
    return 'Engangs';
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData) return;

    setIsSubmitting(true);

    try {
      const result = await createSubscriptionAction({
        location: orderData.location!,
        needsIroning: orderData.needsIroning || false,
        isRecurring: orderData.isRecurring || false,
        frequency: orderData.frequency || undefined,
        firstPickupDate: orderData.firstPickupDate!,
        pickupAddress: {
          street: orderData.address!.street,
          postalCode: orderData.address!.postalCode,
          city: orderData.address!.city,
          country: 'Norge',
          specialInstructions: orderData.address!.specialInstructions || undefined,
        },
        specialInstructions: orderData.specialInstructions || undefined,
        pickupMethod: orderData.pickupMethod!,
        pickupLocationDescription: orderData.pickupLocationDescription || undefined,
      });

      if (result.displayError) {
        alert(result.displayError);
      }

      if (result.error) {
        throw new Error(result.error || 'Failed to create subscription');
      }

      // Redirect to Vipps agreement approval
      window.location.href = result.redirectUrl!;
    } catch (error) {
      console.error('Order creation failed:', error);
      alert('Det oppstod en feil. Vennligst prøv igjen.');
      setIsSubmitting(false);
    }
  };

  if (!orderData) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-gray mb-4">Laster bestillingsdetaljer...</h2>
          <p className="text-medium-gray">Hvis dette tar for lang tid, <Link href="/orders/location-service" className="text-nordic-blue hover:underline">start på nytt</Link>.</p>
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
            <span className="text-medium-gray">Bekreft bestilling</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="ml-2 text-green-500 font-medium">Tjeneste</span>
            </div>
            <div className="w-8 h-0.5 bg-green-500"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="ml-2 text-green-500 font-medium">Adresse</span>
            </div>
            <div className="w-8 h-0.5 bg-nordic-blue"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-nordic-blue text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="ml-2 text-nordic-blue font-medium">Bekreft</span>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Bekreft din bestilling</h2>
          <p className="text-xl text-medium-gray">
            Sjekk at alt stemmer og fullfør bestillingen.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="space-y-6">
            {/* Service Details */}
            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-dark-gray mb-6">Tjeneste</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-dark-gray mb-1">Lokasjon</h4>
                  <p className="text-medium-gray">{orderData.location}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-dark-gray mb-1">Hyppighet</h4>
                  <p className="text-medium-gray">
                    {getFrequencyLabel(orderData.isRecurring || false, orderData.frequency || null)}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-dark-gray mb-1">Første henting</h4>
                  <p className="text-medium-gray">{formatDate(orderData.firstPickupDate)}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-dark-gray mb-1">Tjenester</h4>
                  <p className="text-medium-gray">
                    Vask {orderData.needsIroning ? '+ Stryking' : '(bare vask)'}
                  </p>
                </div>
              </div>
            </div>

            {/* Pickup Details */}
            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-dark-gray mb-6">Hentingsdetaljer</h3>
              <div className="space-y-4">
                {orderData.address && (
                  <div>
                    <h4 className="font-semibold text-dark-gray mb-1">Adresse</h4>
                    <p className="text-medium-gray">
                      {orderData.address.street}<br/>
                      {orderData.address.postalCode} {orderData.address.city}
                    </p>
                    {orderData.address.specialInstructions && (
                      <p className="text-medium-gray italic mt-1">
                        &ldquo;{orderData.address.specialInstructions}&rdquo;
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-dark-gray mb-1">Hentingsmåte</h4>
                  <p className="text-medium-gray">
                    {orderData.pickupMethod === 'home' && '🏠 Jeg er hjemme - du kan banke på'}
                    {orderData.pickupMethod === 'entrance' && '🚪 Plasser utenfor inngangen'}
                    {orderData.pickupMethod === 'other' && '📍 Plasser et annet sted'}
                  </p>
                  {orderData.pickupMethod === 'other' && orderData.pickupLocationDescription && (
                    <p className="text-medium-gray italic mt-1">
                      Plassering: {orderData.pickupLocationDescription}
                    </p>
                  )}
                  {orderData.pickupMethod !== 'home' && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded-md">
                      <p className="text-sm text-yellow-700">
                        📸 Husk å ta bilde av posen når du plasserer den
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Special Instructions if provided */}
            {orderData.specialInstructions && (
              <div className="bg-white rounded-2xl p-8">
                <h3 className="text-lg font-semibold text-dark-gray mb-4">Spesielle instruksjoner</h3>
                <p className="text-medium-gray italic">&ldquo;{orderData.specialInstructions}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div className="space-y-6">
            <form onSubmit={handleConfirmOrder} className="space-y-6">
              {/* Pricing Information */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6">
                <div className="flex items-start">
                  <div className="text-4xl mr-4">💰</div>
                  <div>
                    <h3 className="text-xl font-bold text-dark-gray mb-3">Viktig informasjon om pris</h3>
                    <p className="text-medium-gray leading-relaxed mb-2">
                      Du betaler <span className="font-semibold text-dark-gray">ETTER</span> at renseriet har veid tøyet ditt.
                    </p>
                    <p className="text-medium-gray leading-relaxed mb-2">
                      Pris beregnes basert på faktisk vekt og valgt tjeneste (vask {orderData.needsIroning && '+ stryking'}).
                    </p>
                    <p className="text-medium-gray leading-relaxed">
                      Du vil motta Vipps-betaling når ordren er klar for levering.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method - Vipps only */}
              <div className="bg-white rounded-2xl p-8">
                <h3 className="text-lg font-semibold text-dark-gray mb-4">Betalingsmåte</h3>
                <div className="border-2 border-nordic-blue bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-center">
                    <span className="text-2xl mr-2">📱</span>
                    <span className="font-semibold text-dark-gray">Vipps</span>
                  </div>
                </div>
                <p className="text-sm text-medium-gray mt-4 text-center">
                  Du vil bli videresendt til Vipps for å godkjenne avtalen
                </p>
              </div>

              {/* Important Notice */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-blue-500 mr-3 mt-0.5">ℹ️</div>
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-1">Viktig informasjon</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Ha klærne klare i NooraCare-posen</li>
                      <li>• Du får SMS når renseren er på vei</li>
                      <li>• Levering skjer til samme adresse</li>
                      <li>• Du kan følge status i appen</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-lg font-semibold text-lg transition-colors ${
                  isSubmitting
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-nordic-blue text-white hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Behandler bestilling...
                  </span>
                ) : (
                  'Fortsett til Vipps'
                )}
              </button>

              <div className="text-center">
                <Link
                  href="/orders/instructions"
                  className="text-medium-gray hover:text-dark-gray text-sm"
                >
                  ← Tilbake til instruksjoner
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-nordic-blue"></div>
          <p className="mt-4 text-medium-gray">Laster...</p>
        </div>
      </div>
    }>
      <ConfirmPageContent />
    </Suspense>
  );
}
