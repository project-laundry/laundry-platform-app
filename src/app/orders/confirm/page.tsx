'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { createSubscriptionAction, createStandaloneOrderAction } from '../actions';
import type { PickupMethod } from '@/types/database';
import { OrderData } from '@/types/order-flow';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'card' | 'vipps';
  icon: string;
}

const paymentMethods: PaymentMethod[] = [
  { id: 'vipps', name: 'Vipps', type: 'vipps', icon: '📱' },
  { id: 'card', name: 'Bankkort', type: 'card', icon: '💳' },
];

const getPlanDetails = (plan: string) => {
  const plans: { [key: string]: { name: string; price: number } } = {
    'weekly': { name: 'Ukentlig', price: 399 },
    'biweekly': { name: 'Annenhver uke', price: 249 },
    'single': { name: 'Enkeltvask', price: 149 }
  };
  return plans[plan] || { name: 'Abonnement', price: 0 };
};

function ConfirmPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderData = useOrderFlowStore<Partial<OrderData> | null>((state) => state.orderData);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string>('vipps');
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: 'Norge',
  });

  useEffect(() => {
    setShowCardForm(selectedPayment === 'card');
  }, [selectedPayment]);

  useEffect(() => {
    if (useSameAddress && orderData?.address) {
      setBillingAddress({
        street: orderData.address.street,
        city: orderData.address.city,
        postalCode: orderData.address.postalCode,
        country: 'Norge',
      });
    } else if (!useSameAddress) {
      setBillingAddress({
        street: '',
        city: '',
        postalCode: '',
        country: 'Norge',
      });
    }
  }, [useSameAddress, orderData]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Ikke valgt';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Ikke valgt';
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];

    return `${dayNames[date.getDay()]} ${date.getDate()}. ${monthNames[date.getMonth()]}`;
  };

  const handlePaymentSelect = (paymentId: string) => {
    setSelectedPayment(paymentId);
  };

  const handleCardFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBillingAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderData) return;

    setIsSubmitting(true);

    try {
      // Get the plan slug for the database
      const planSlug = orderData.plan;

      if(!planSlug) {
        throw new Error('Plan is missing');
      }

      // Check if this is a single/one-time plan
      const isSinglePlan = planSlug === 'single';

      if (isSinglePlan) {
        // Create standalone order with pending_payment status
        if (!orderData.pickupDate) {
          throw new Error('Pickup date is required for single plan');
        }

        const result = await createStandaloneOrderAction({
          planSlug,
          scheduledDate: orderData.pickupDate,
          pickupMethod: orderData.pickupMethod as PickupMethod,
          pickupLocationDescription: orderData.otherLocation || undefined,
          specialInstructions: orderData.specialInstructions || undefined,
          deliveryStreet: orderData.address?.street || '',
          deliveryPostalCode: orderData.address?.postalCode || '',
          deliveryCity: orderData.address?.city || '',
          deliveryCountry: 'Norge',
          deliverySpecialInstructions: orderData.address?.specialInstructions,
          extraKg: orderData.additionalKg || 0,
          needsIroning: orderData.needsIroning || false,
          delicateItemsCount: orderData.delicateItems || 0,
          paymentProvider: selectedPayment === 'vipps' ? 'vipps' : 'manual',
        });

        if (result.error) {
          throw new Error(result.error || 'Failed to create order');
        }
        
        window.location.href = result.redirectUrl!;
      } else {
        // Create subscription for recurring plans
        // Derive the recurring weekday from the pickupDate
        if (!orderData.pickupDate) {
          throw new Error('Pickup date is required');
        }        

        const result = await createSubscriptionAction({
          planSlug,
          firstPickupDate: orderData.pickupDate,
          pickupMethod: orderData.pickupMethod as PickupMethod,
          pickupLocationDescription: orderData.otherLocation || undefined,
          specialInstructions: orderData.specialInstructions || undefined,
          deliveryStreet: orderData.address?.street || '',
          deliveryPostalCode: orderData.address?.postalCode || '',
          deliveryCity: orderData.address?.city || '',
          deliveryCountry: 'Norge',
          deliverySpecialInstructions: orderData.address?.specialInstructions,
          extraKg: orderData.additionalKg || 0,
          needsIroning: orderData.needsIroning || false,
          delicateItemsCount: orderData.delicateItems || 0,
          paymentProvider: selectedPayment === 'vipps' ? 'vipps' : 'manual',
        });

        if (result.displayError) {
          alert(result.displayError);          
        }

        if (result.error) {
          throw new Error(result.error || 'Failed to create subscription');
        }

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
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-dark-gray mb-4">Laster bestillingsdetaljer...</h2>
          <p className="text-medium-gray">Hvis dette tar for lang tid, <Link href="/orders/additional-services" className="text-nordic-blue hover:underline">start på nytt</Link>.</p>
        </div>
      </div>
    );
  }

  // No individual items with bag-based subscription

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
              <div className="w-8 h-8 bg-success-green text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="ml-2 text-success-green font-medium">Velg tid</span>
            </div>
            <div className="w-8 h-0.5 bg-success-green"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-success-green text-white rounded-full flex items-center justify-center text-sm font-semibold">
                ✓
              </div>
              <span className="ml-2 text-success-green font-medium">Instruksjoner</span>
            </div>
            <div className="w-8 h-0.5 bg-nordic-blue"></div>
            <div className="flex items-center">
              <div className="w-8 h-8 bg-nordic-blue text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <span className="ml-2 text-nordic-blue font-medium">Bekreft & Betal</span>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Bekreft og fullfør bestilling</h2>
          <p className="text-xl text-medium-gray">
            Sjekk at alt stemmer og fullfør betaling.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Details */}
          <div className="space-y-6">
            {/* Bag Delivery Notice if user doesn't have a bag */}
            {orderData.hasBag === false && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-start">
                  <div className="text-2xl mr-3">📦</div>
                  <div>
                    <h3 className="text-lg font-semibold text-dark-gray mb-2">NooraCare-pose leveres først</h3>
                    <p className="text-medium-gray">
                      Vi leverer en gratis NooraCare-pose <span className="font-semibold text-dark-gray">dagen før</span> din valgte henting.
                      Du får SMS når posen er levert. Fyll den med tøy, og vi henter den neste dag.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Special Instructions if provided */}
            {orderData.specialInstructions && (
              <div className="bg-white rounded-2xl p-8">
                <h3 className="text-lg font-semibold text-dark-gray mb-4">Spesielle instruksjoner</h3>
                <p className="text-medium-gray italic">&ldquo;{orderData.specialInstructions}&rdquo;</p>
              </div>
            )}

            {/* Pickup Details */}
            <div className="bg-white rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-dark-gray mb-6">Hentingsdetaljer</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-dark-gray mb-1">Dato og tid</h4>
                  <p className="text-medium-gray">
                    {formatDate(orderData.pickupDate)} kl. {orderData.pickupTime}
                  </p>
                </div>

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
                  {orderData.pickupMethod === 'other' && orderData.otherLocation && (
                    <p className="text-medium-gray italic mt-1">
                      Plassering: {orderData.otherLocation}
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
          </div>

          {/* Payment and Order Summary */}
          <div className="space-y-6">
            <form onSubmit={handleConfirmOrder} className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-2xl p-8">
                <h3 className="text-lg font-semibold text-dark-gray mb-6">Bestillingssammendrag</h3>

                <div className="space-y-4 mb-6">
                  {orderData.plan && (
                    <div className="flex justify-between items-center">
                      <span className="text-medium-gray">Abonnement</span>
                      <span className="text-dark-gray font-semibold">{getPlanDetails(orderData.plan).name}</span>
                    </div>
                  )}

                  {orderData.hasBag === false && (
                    <div className="flex justify-between items-center">
                      <span className="text-medium-gray">NooraCare-pose</span>
                      <span className="text-dark-gray font-semibold">Gratis</span>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-dark-gray">Total</span>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-nordic-blue">{orderData.plan ? getPlanDetails(orderData.plan).price : 0} kr</p>
                        <p className="text-sm text-medium-gray">{orderData.plan && orderData.plan !== 'single' ? 'per måned' : 'engangsbeløp'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-2xl p-8">
                <h3 className="text-lg font-semibold text-dark-gray mb-4">Betalingsmåte</h3>
                <div className="grid grid-cols-2 gap-4">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        selectedPayment === method.id
                          ? 'border-nordic-blue bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handlePaymentSelect(method.id)}
                    >
                      <div className="flex items-center justify-center">
                        <span className="text-2xl mr-2">{method.icon}</span>
                        <span className="font-semibold text-dark-gray">{method.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Details Form */}
              {showCardForm && (
                <div className="bg-white rounded-2xl p-8">
                  <h4 className="text-lg font-semibold text-dark-gray mb-4">Kortdetaljer</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-gray mb-2">
                        Kortnummer
                      </label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={cardForm.cardNumber}
                        onChange={handleCardFormChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                        placeholder="1234 5678 9012 3456"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-dark-gray mb-2">
                          Utløpsdato
                        </label>
                        <input
                          type="text"
                          name="expiryDate"
                          value={cardForm.expiryDate}
                          onChange={handleCardFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                          placeholder="MM/YY"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-dark-gray mb-2">
                          CVV
                        </label>
                        <input
                          type="text"
                          name="cvv"
                          value={cardForm.cvv}
                          onChange={handleCardFormChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                          placeholder="123"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-dark-gray mb-2">
                        Kortholders navn
                      </label>
                      <input
                        type="text"
                        name="cardholderName"
                        value={cardForm.cardholderName}
                        onChange={handleCardFormChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue"
                        placeholder="Ola Nordmann"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Address */}
              <div className="bg-white rounded-2xl p-8">
                <h4 className="text-lg font-semibold text-dark-gray mb-4">Fakturaadresse</h4>

                {/* Use Same Address Checkbox */}
                <div className="mb-6">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useSameAddress}
                      onChange={(e) => setUseSameAddress(e.target.checked)}
                      className="w-4 h-4 text-nordic-blue bg-gray-100 border-gray-300 rounded focus:ring-nordic-blue focus:ring-2"
                    />
                    <span className="ml-3 text-sm font-medium text-dark-gray">
                      Bruk samme adresse som leveringsadresse
                    </span>
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-dark-gray mb-2">
                      Gateadresse
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={billingAddress.street}
                      onChange={handleAddressChange}
                      disabled={useSameAddress}
                      className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue ${
                        useSameAddress ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      placeholder="Storgata 1"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-dark-gray mb-2">
                        By
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={billingAddress.city}
                        onChange={handleAddressChange}
                        disabled={useSameAddress}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue ${
                          useSameAddress ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder="Bergen"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-dark-gray mb-2">
                        Postnummer
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={billingAddress.postalCode}
                        onChange={handleAddressChange}
                        disabled={useSameAddress}
                        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-nordic-blue focus:border-nordic-blue ${
                          useSameAddress ? 'bg-gray-100 cursor-not-allowed' : ''
                        }`}
                        placeholder="5001"
                        required
                      />
                    </div>
                  </div>
                </div>
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
                    : 'bg-nordic-blue text-white'
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
                  selectedPayment === 'vipps' ? 'Betal med Vipps' : 'Fullfør betaling'
                )}
              </button>

              <div className="text-center">
                <Link
                  href={`/orders/instructions?data=${searchParams.get('data')}`}
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