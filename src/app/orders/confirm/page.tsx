'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { OrderFlowProgress } from '@/components/ui/OrderFlowProgress';
import { isNonProduction } from '@/lib/utils/environment';
import { createSubscriptionAction, forceAcceptAgreementAction, validatePromoCodeAction } from '../actions';

function ConfirmPageContent() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);
  const hasHydrated = useOrderFlowStore((state) => state._hasHydrated);

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Auto-accept bypasses the Vipps approval flow and is only available outside
  // production. In production this stays false so users always go through Vipps.
  const showAutoAccept = isNonProduction();
  const [autoAccept, setAutoAccept] = useState(showAutoAccept);

  // Promo code state
  const [promoInput, setPromoInput] = useState(orderData?.promoCode ?? '');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>(
    orderData?.promoCode ? 'valid' : 'idle'
  );
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;

    setPromoStatus('validating');
    setPromoMessage(null);

    try {
      const result = await validatePromoCodeAction(code);
      if (result.valid) {
        setPromoStatus('valid');
        setPromoMessage(result.discountLabel ? `Kode lagt til – ${result.discountLabel}` : 'Rabattkode lagt til');
        updateOrderData({ promoCode: code });
      } else {
        setPromoStatus('invalid');
        setPromoMessage(result.error || 'Ugyldig rabattkode');
        updateOrderData({ promoCode: undefined });
      }
    } catch {
      setPromoStatus('invalid');
      setPromoMessage('Kunne ikke validere rabattkoden');
    }
  };

  const handleRemovePromo = () => {
    setPromoInput('');
    setPromoStatus('idle');
    setPromoMessage(null);
    updateOrderData({ promoCode: undefined });
  };

  // Redirect if required data not present (only after hydration)
  useEffect(() => {
    if (hasHydrated && (!orderData?.city || !orderData?.firstPickupDate || !orderData?.address)) {
      router.push('/orders/service');
    }
  }, [hasHydrated, orderData, router]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Ikke valgt';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Ikke valgt';
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

    return `${dayNames[date.getDay()]} ${date.getDate()}. ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData) return;

    setIsSubmitting(true);

    try {
      const result = await createSubscriptionAction({
        location: orderData.city!,
        needsIroning: orderData.needsIroning || false,
        isRecurring: orderData.isRecurring || false,
        frequency: orderData.frequency || undefined,
        firstPickupDate: orderData.firstPickupDate!,
        pickupAddress: {
          street: orderData.address!.street,
          postalCode: orderData.address!.postalCode,
          city: orderData.city!,
          country: 'Norge',
          specialInstructions: orderData.address!.specialInstructions || undefined,
        },
        specialInstructions: orderData.specialInstructions || undefined,
        promoCode: promoStatus === 'valid' ? promoInput.trim() || undefined : undefined,
      });

      if (result.displayError) {
        alert(result.displayError);
      }

      if (result.error) {
        throw new Error(result.error || 'Failed to create subscription');
      }

      // Check if auto-accept is enabled
      if (autoAccept && result.agreementId) {
        // Auto-accept flow
        const acceptResult = await forceAcceptAgreementAction(result.agreementId);

        if (acceptResult.success) {
          router.push('/orders/success');
        } else {
          alert(acceptResult.error || 'Auto-godkjenning feilet');
          setIsSubmitting(false);
        }
      } else {
        // Normal Vipps redirect flow
        window.location.href = result.redirectUrl!;
      }
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
            <Link href="/orders/service" className="text-teal-600 hover:underline">
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
          <h2 className="text-3xl font-light text-slate-900">Bekreftelse</h2>
        </div>

        {/* Consolidated Order Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-6 pb-4 border-b border-slate-100">
            Bestillingssammendrag
          </h3>

          <div className="space-y-6">
            {/* Schedule - Redesigned */}
            <div className="border-l-4 border-teal-500 pl-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-500 mb-2">Henteplan</p>

                  {/* Frequency Badge */}
                  <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-sm font-medium mb-3">
                    {orderData.isRecurring ? (
                      <>
                        <span className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></span>
                        {orderData.frequency === 'weekly' && 'Ukentlig'}
                        {orderData.frequency === 'biweekly' && 'Annenhver uke'}
                        {orderData.frequency === 'monthly' && 'Månedlig'}
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                        Engangsbestilling
                      </>
                    )}
                  </div>

                  {/* Schedule Details */}
                  <div className="space-y-2">
                    {orderData.isRecurring && (
                      <p className="text-slate-700">
                        Hver <span className="font-semibold">
                          {new Date(orderData.firstPickupDate || '').toLocaleDateString('no-NO', { weekday: 'long' })}
                        </span>
                      </p>
                    )}

                    {/* First Pickup - Most Prominent */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">
                        {orderData.isRecurring ? 'Første henting' : 'Hentedato'}
                      </p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatDate(orderData.firstPickupDate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Location & Service */}
            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
              <div>
                <p className="text-sm text-slate-500 mb-1">Område</p>
                <p className="text-slate-900 font-medium">{orderData.city}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500 mb-1">Tjeneste</p>
                <p className="text-slate-900 font-medium">
                  {orderData.needsIroning ? 'Vask & Stryking' : 'Kun Vask'}
                </p>
              </div>
            </div>

            {/* Address */}
            {orderData.address && (
              <div>
                <p className="text-sm text-slate-500 mb-2">Henteadresse</p>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="font-medium text-slate-900">{orderData.address.street}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    {orderData.address.postalCode} {orderData.city}
                  </p>
                  {orderData.address.specialInstructions && (
                    <p className="text-sm text-slate-600 italic mt-3 pt-3 border-t border-slate-200">
                      &ldquo;{orderData.address.specialInstructions}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Special Instructions if provided */}
            {orderData.specialInstructions && (
              <div>
                <p className="text-sm text-slate-500 mb-2">Spesielle instruksjoner</p>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-700 italic">&ldquo;{orderData.specialInstructions}&rdquo;</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Promo Code */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
          <label htmlFor="promoCode" className="block text-sm font-semibold text-slate-900 mb-3">
            Rabattkode
          </label>
          <div className="flex gap-2">
            <input
              id="promoCode"
              type="text"
              value={promoInput}
              onChange={(e) => {
                setPromoInput(e.target.value);
                if (promoStatus !== 'idle') {
                  setPromoStatus('idle');
                  setPromoMessage(null);
                }
              }}
              disabled={promoStatus === 'valid'}              
              className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 uppercase placeholder:normal-case focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 disabled:bg-slate-50 disabled:text-slate-500"
            />
            {promoStatus === 'valid' ? (
              <button
                type="button"
                onClick={handleRemovePromo}
                className="px-4 py-2.5 rounded-lg font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Fjern
              </button>
            ) : (
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={!promoInput.trim() || promoStatus === 'validating'}
                className="px-4 py-2.5 rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
              >
                {promoStatus === 'validating' ? 'Sjekker...' : 'Bruk'}
              </button>
            )}
          </div>
          {promoMessage && (
            <p className={`text-sm mt-2 ${promoStatus === 'valid' ? 'text-emerald-600' : 'text-red-600'}`}>
              {promoMessage}
            </p>
          )}
        </div>

        {/* Submit Form */}
        <form onSubmit={handleConfirmOrder}>
          {/* <p className="text-sm text-slate-600 mb-2 text-center">
            Du vil bli videresendt til Vipps for å godkjenne avtalen
          </p> */}
          <p className="text-sm text-slate-500 mb-4 text-center">
            <a
              target='_blank'
              rel="noopener noreferrer"
              href="/pris-kalkulator"
              className="text-teal-600 hover:underline"
            >
              Se prisliste
            </a>
          </p>

          {/* Auto-accept checkbox (non-production environments only) */}
          {showAutoAccept && (
            <div className="mb-4 flex items-center gap-2 justify-center">
              <input
                type="checkbox"
                id="autoAccept"
                checked={autoAccept}
                onChange={(e) => setAutoAccept(e.target.checked)}
                className="w-4 h-4 text-teal-600 bg-slate-100 border-slate-300 rounded focus:ring-teal-500 focus:ring-2"
              />
              <label htmlFor="autoAccept" className="text-sm text-slate-600 cursor-pointer">
                Auto-godkjenn avtale (testmiljø)
              </label>
            </div>
          )}

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
                {autoAccept ? 'Auto-godkjenner avtale...' : 'Behandler bestilling...'}
              </>
            ) : (
              <>
                <span className="text-2xl mr-2">📱</span>
                {autoAccept ? 'Bekreft' : 'Bekreft og betal med Vipps'}
              </>
            )}
          </button>
        </form>

        {/* Navigation */}
        <div className="flex justify-center items-center pt-6 border-t border-slate-100 mt-8">
          <Link
            href="/orders/schedule"
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
