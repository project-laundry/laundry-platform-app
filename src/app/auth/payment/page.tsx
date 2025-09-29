'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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

const planNames = {
  starter: 'Start',
  family: 'Familie',
  premium: 'Premium'
};

const planPrices = {
  starter: 500,
  family: 1000,
  premium: 2000
};

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan') || 'family';
  const addressParam = searchParams.get('address');

  // Parse the delivery address from URL params
  const deliveryAddress = useMemo(() => {
    if (!addressParam) return null;
    try {
      return JSON.parse(decodeURIComponent(addressParam));
    } catch {
      return null;
    }
  }, [addressParam]);

  const [selectedPayment, setSelectedPayment] = useState<string>('vipps');
  const [showCardForm, setShowCardForm] = useState(false);
  const [cardForm, setCardForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
  });

  const [useSameAddress, setUseSameAddress] = useState(false);
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    postalCode: '',
    country: 'Norge',
  });

  useEffect(() => {
    setShowCardForm(selectedPayment === 'card');
  }, [selectedPayment]);

  // Handle "use same address" checkbox
  useEffect(() => {
    if (useSameAddress && deliveryAddress) {
      setBillingAddress({
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        postalCode: deliveryAddress.postalCode,
        country: deliveryAddress.country,
      });
    } else if (!useSameAddress) {
      setBillingAddress({
        street: '',
        city: '',
        postalCode: '',
        country: 'Norge',
      });
    }
  }, [useSameAddress]); // Remove deliveryAddress from dependencies

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Payment submission:', {
      plan: planId,
      paymentMethod: selectedPayment,
      cardForm: selectedPayment === 'card' ? cardForm : null,
      billingAddress
    });

    // Mock success - redirect to success page
    window.location.href = '/auth/success';
  };

  const currentPlan = planNames[planId as keyof typeof planNames] || 'Familie';
  const currentPrice = planPrices[planId as keyof typeof planPrices] || 1000;

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Order Summary */}
          <div>
            <h2 className="text-2xl font-bold text-dark-gray mb-8">Ordresammendrag</h2>

            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-bold text-dark-gray">{currentPlan}-planen</h3>
                  <p className="text-medium-gray">Månedlig abonnement</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-dark-gray">{currentPrice} NOK</p>
                  <p className="text-sm text-medium-gray">per måned</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-medium-gray">Subtotal</span>
                  <span className="text-dark-gray">{currentPrice} NOK</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-medium-gray">MVA (25%)</span>
                  <span className="text-dark-gray">{Math.round(currentPrice * 0.25)} NOK</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-dark-gray">Total</span>
                    <span className="text-lg font-bold text-dark-gray">
                      {Math.round(currentPrice * 1.25)} NOK
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-soft-gray rounded-lg">
                <p className="text-sm text-medium-gray">
                  💡 Du kan avbryte når som helst. Ingen bindingstid.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div>
            <h2 className="text-2xl font-bold text-dark-gray mb-8">Betaling</h2>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Payment Method Selection */}
              <div>
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
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
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

              {/* Delivery Address Display (if available) */}
              {deliveryAddress && (
                <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                  <h4 className="text-lg font-semibold text-dark-gray mb-4">Leveringsadresse</h4>
                  <div className="text-medium-gray space-y-1">
                    <p>{deliveryAddress.street}</p>
                    <p>{deliveryAddress.postalCode} {deliveryAddress.city}</p>
                    <p>{deliveryAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Billing Address */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-dark-gray mb-4">Fakturaadresse</h4>

                {/* Use Same Address Checkbox */}
                {deliveryAddress && (
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
                )}

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

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-nordic-blue text-white font-semibold py-4 rounded-lg hover:bg-blue-600 transition-colors text-lg"
              >
                {selectedPayment === 'vipps' ? 'Betal med Vipps' : 'Fullfør betaling'}
              </button>
            </form>

            {/* Back Link */}
            <div className="text-center mt-8">
              <Link href="/auth/plans" className="text-medium-gray hover:text-dark-gray">
                ← Tilbake til planvalg
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}