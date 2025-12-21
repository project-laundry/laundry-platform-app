'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Sparkles, Calendar, RefreshCw, CreditCard, Check, ChevronLeft } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { OrderFlowProgress } from '@/components/ui/OrderFlowProgress';
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-light text-slate-900 mb-4">Laster bestillingsdetaljer...</h2>
          <p className="text-slate-500">
            Hvis dette tar for lang tid,{' '}
            <Link href="/orders/location-service" className="text-teal-600 hover:underline">
              start på nytt
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-light text-slate-900">NooraCare</h1>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Indicator */}
        <OrderFlowProgress currentStep={4} />

        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-light text-slate-900 mb-2">Bekreftelse</h2>
          <p className="text-slate-500">Gjennomgå bestillingen</p>
        </div>

        {/* Order Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Location */}
          <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mb-3">
              <MapPin className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Lokasjon</p>
            <p className="font-medium text-slate-900">{orderData.location}</p>
          </div>

          {/* Service */}
          <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mb-3">
              <Sparkles className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Tjeneste</p>
            <p className="font-medium text-slate-900">
              {orderData.needsIroning ? 'Vask & Stryking' : 'Kun Vask'}
            </p>
          </div>

          {/* Pickup Date */}
          <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Hentedato</p>
            <p className="font-medium text-slate-900 text-sm">
              {formatDate(orderData.firstPickupDate).split(' ').slice(0, 2).join(' ')}
            </p>
          </div>

          {/* Frequency */}
          <div className="bg-slate-50 rounded-lg border border-slate-100 p-4">
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-lg flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5 text-teal-600" />
            </div>
            <p className="text-xs text-slate-500 mb-1">Frekvens</p>
            <p className="font-medium text-slate-900">
              {getFrequencyLabel(orderData.isRecurring || false, orderData.frequency || null)}
            </p>
          </div>
        </div>

        {/* Address Display */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Henteadresse</h3>
          {orderData.address && (
            <div>
              <p className="font-medium text-slate-900">{orderData.address.street}</p>
              <p className="text-sm text-slate-600">
                {orderData.address.postalCode} {orderData.address.city}
              </p>
              {orderData.address.specialInstructions && (
                <p className="text-sm text-slate-600 italic mt-2">
                  &ldquo;{orderData.address.specialInstructions}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Special Instructions if provided */}
        {orderData.specialInstructions && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Spesielle instruksjoner</h3>
            <p className="text-slate-600 italic">&ldquo;{orderData.specialInstructions}&rdquo;</p>
          </div>
        )}

        {/* Price Summary */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-6">
          <div className="flex items-center mb-4">
            <CreditCard className="w-5 h-5 text-teal-600 mr-2" />
            <h3 className="text-lg font-medium text-slate-900">Prissammendrag</h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">
                {orderData.needsIroning ? 'Vask & Stryking' : 'Kun Vask'}
              </span>
              <span className="font-medium text-slate-900">
                {orderData.needsIroning ? 'Fra 299 kr' : 'Fra 199 kr'}
              </span>
            </div>

            {orderData.isRecurring && (
              <div className="flex justify-between items-center text-teal-600">
                <span>Abonnementsrabatt</span>
                <span className="font-medium">
                  -{' '}
                  {orderData.frequency === 'weekly'
                    ? '15%'
                    : orderData.frequency === 'biweekly'
                    ? '10%'
                    : '5%'}
                </span>
              </div>
            )}

            <div className="border-t border-slate-200 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-900 font-medium">Estimert pris</span>
                <span className="text-xl font-semibold text-teal-600">
                  {orderData.needsIroning ? 'Fra 299 kr' : 'Fra 199 kr'}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Endelig pris beregnes basert på vekt og antall plagg.
          </p>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Betalingsmåte</h3>
          <div className="border-2 border-teal-600 bg-teal-50/30 rounded-lg p-4">
            <div className="flex items-center justify-center">
              <span className="text-2xl mr-2">📱</span>
              <span className="font-semibold text-slate-900">Vipps</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 mt-4 text-center">
            Du vil bli videresendt til Vipps for å godkjenne avtalen
          </p>
        </div>

        {/* Submit Form */}
        <form onSubmit={handleConfirmOrder}>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full py-4 rounded-lg font-medium text-lg transition-all duration-200 shadow-sm flex items-center justify-center ${
              isSubmitting
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Behandler bestilling...
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Bekreft og betal
              </>
            )}
          </button>
        </form>

        {/* Navigation */}
        <div className="flex justify-center items-center pt-6 border-t border-slate-100 mt-8">
          <Link
            href="/orders/address"
            className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Tilbake
          </Link>
        </div>

        {/* Footer Tagline */}
        <div className="text-center mt-12">
          <p className="text-sm text-slate-400">Renhet. Omtanke. NooraCare.</p>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            <p className="mt-4 text-slate-500">Laster...</p>
          </div>
        </div>
      }
    >
      <ConfirmPageContent />
    </Suspense>
  );
}
