'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AdditionalServicesPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'single';

  const [additionalKg, setAdditionalKg] = useState(0);
  const [delicateItems, setDelicateItems] = useState(0);
  const [needsIroning, setNeedsIroning] = useState(false);

  // Additional kg step size
  const KG_STEP = 5;

  // Pricing
  const KG_PRICE = 10; // NOK per kg per month
  const DELICATE_PRICE = 75; // NOK per delicate item
  const IRONING_PRICE = 40; // NOK per item

  // Subscription plan pricing
  const PLAN_PRICES: Record<string, number> = {
    'biweekly': 249,
    'weekly': 399,
    'single': 149
  };

  // Calculate monthly recurring costs (plan + additional kg + delicate + ironing)
  const monthlyRecurringCost = useMemo(() => {
    let cost = 0;

    // Add subscription plan price
    const subscriptionPrice = PLAN_PRICES[plan] || 0;
    cost += subscriptionPrice;

    // Add additional KG (monthly recurring)
    cost += additionalKg * KG_PRICE;

    // Add delicate items and ironing (monthly recurring)
    cost += delicateItems * DELICATE_PRICE;
    if (needsIroning) {
      cost += delicateItems * IRONING_PRICE;
    }

    return cost;
  }, [additionalKg, delicateItems, needsIroning, plan]);

  const canContinue = true; // Always can continue from this page

  const handleContinue = () => {
    const params = new URLSearchParams({
      plan,
      additionalKg: additionalKg.toString(),
      delicateItems: delicateItems.toString(),
      needsIroning: needsIroning.toString(),
      monthlyRecurringCost: monthlyRecurringCost.toString()
    });
    window.location.href = `/orders/schedule?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="inline-block">
              <h1 className="text-2xl font-bold text-nordic-blue">NooraCare</h1>
            </Link>
            <span className="text-medium-gray">Tilleggstjenester</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Additional Services */}
        <div className="bg-white rounded-2xl p-8 mb-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-3xl font-bold text-dark-gray mb-4">Tilleggstjenester</h2>
              <p className="text-lg text-medium-gray">
                Tilpass din vaskeplan etter dine behov
              </p>
            </div>

            <div className="space-y-8">
              {/* Additional KG Section */}
              <div className="border-b border-gray-200 pb-8">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-dark-gray mb-2">
                    Ekstra kilo
                  </h3>
                  <p className="text-sm text-medium-gray">
                    5 kg inkludert i planen din
                  </p>
                </div>

                <div className="bg-soft-gray rounded-xl p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">⚖️</span>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-dark-gray mb-1">Ekstra kg vask per måned</h4>
                        <p className="text-sm text-medium-gray">Legg til mer kapasitet ved behov</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-nordic-blue font-semibold whitespace-nowrap block">
                        {additionalKg * KG_PRICE} kr/mnd
                      </span>
                      <span className="text-xs text-medium-gray whitespace-nowrap">
                        {KG_PRICE} kr/kg
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 justify-center">
                    <button
                      onClick={() => setAdditionalKg(Math.max(0, additionalKg - KG_STEP))}
                      disabled={additionalKg === 0}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 text-dark-gray font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[80px]">
                      <p className="text-3xl font-bold text-dark-gray">{additionalKg}</p>
                      <p className="text-xs text-medium-gray mt-1">kg ekstra</p>
                    </div>
                    <button
                      onClick={() => setAdditionalKg(additionalKg + KG_STEP)}
                      className="w-10 h-10 rounded-lg border-2 border-nordic-blue text-nordic-blue font-bold hover:bg-nordic-blue hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Delicate Wash Section */}
              <div className="border-b border-gray-200 pb-8">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-dark-gray mb-2">Delikatvask</h3>                  
                </div>

                <div className="bg-soft-gray rounded-xl p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">👔</span>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-dark-gray mb-1">Skjorter og kjoler</h4>
                        <p className="text-sm text-medium-gray">Spesiell håndtering for delikate plagg</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-nordic-blue font-semibold whitespace-nowrap block">
                        {delicateItems * DELICATE_PRICE} kr/mnd
                      </span>
                      <span className="text-xs text-medium-gray whitespace-nowrap">
                        {DELICATE_PRICE} kr/stk
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 justify-center">
                    <button
                      onClick={() => {
                        setDelicateItems(Math.max(0, delicateItems - 1));
                        if (delicateItems - 1 === 0) {
                          setNeedsIroning(false);
                        }
                      }}
                      disabled={delicateItems === 0}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 text-dark-gray font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[80px]">
                      <p className="text-3xl font-bold text-dark-gray">{delicateItems}</p>
                    </div>
                    <button
                      onClick={() => setDelicateItems(delicateItems + 1)}
                      className="w-10 h-10 rounded-lg border-2 border-nordic-blue text-nordic-blue font-bold hover:bg-nordic-blue hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Ironing Question - Shows when delicate items > 0 */}
                {delicateItems > 0 && (
                  <div className="mt-6 p-6 bg-purple-50 rounded-xl">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h4 className="font-semibold text-dark-gray mb-1">Stryking</h4>
                        <p className="text-sm text-medium-gray">
                          Trenger skjortene/kjolene å strykes?
                        </p>
                      </div>
                      <span className="text-nordic-blue font-semibold whitespace-nowrap">
                        {needsIroning ? delicateItems * IRONING_PRICE : 0} kr/mnd
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setNeedsIroning(true)}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                          needsIroning
                            ? 'bg-nordic-blue text-white'
                            : 'bg-white text-dark-gray border-2 border-gray-300 hover:border-nordic-blue'
                        }`}
                      >
                        Ja
                      </button>
                      <button
                        onClick={() => setNeedsIroning(false)}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                          !needsIroning
                            ? 'bg-nordic-blue text-white'
                            : 'bg-white text-dark-gray border-2 border-gray-300 hover:border-nordic-blue'
                        }`}
                      >
                        Nei
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

        {/* Cost Summary */}
        <div className="bg-white border-t-2 border-gray-200 shadow-lg rounded-2xl p-8 mt-8">
              {/* Monthly Recurring Costs Section */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="font-bold text-dark-gray mb-3 flex items-center gap-2">
                  <span className="text-lg">🔄</span>
                  MÅNEDLIG ABONNEMENT
                </h3>
                <div className="space-y-2">
                  {/* Subscription Plan */}
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-gray">
                      {plan === 'weekly' && 'Ukentlig vask'}
                      {plan === 'biweekly' && 'Annenhver uke'}
                      {plan === 'single' && 'Enkeltvask'}
                    </span>
                    <span className="text-dark-gray">{PLAN_PRICES[plan]} kr</span>
                  </div>

                  {/* Additional KG */}
                  {additionalKg > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-gray">Ekstra kg ({additionalKg} kg)</span>
                      <span className="text-dark-gray">{additionalKg * KG_PRICE} kr</span>
                    </div>
                  )}

                  {/* Delicate Items */}
                  {delicateItems > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-gray">Delikatvask ({delicateItems} stk)</span>
                      <span className="text-dark-gray">{delicateItems * DELICATE_PRICE} kr</span>
                    </div>
                  )}

                  {/* Ironing */}
                  {needsIroning && delicateItems > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-gray">Stryking ({delicateItems} stk)</span>
                      <span className="text-dark-gray">{delicateItems * IRONING_PRICE} kr</span>
                    </div>
                  )}
                </div>
              </div>

          {/* Total and Button */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200">
            <div>
              <p className="text-xs text-medium-gray mb-1">Totalt per måned</p>
              <p className="text-2xl font-bold text-nordic-blue">{monthlyRecurringCost} kr</p>
            </div>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="py-3 px-8 rounded-lg font-semibold transition-colors bg-nordic-blue text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fortsett
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
