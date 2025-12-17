'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import {
  IRONING_PRICE_NOK,
  DELICATE_PRICE_NOK,
  EXTRA_KG_PRICE_NOK,
  oreToNok,
} from '@/lib/config/pricing';
import { SubscriptionFrequency } from '@/types/database';
import { Sparkles, Scale, Shirt, RefreshCw, Plus, Minus } from 'lucide-react';

interface AdditionalServicesFormProps {
  planSlug: string;
  planName: string;
  planPriceOre: number;
  planFrequency: SubscriptionFrequency;
}

export function AdditionalServicesForm({
  planName,
  planPriceOre,
  planFrequency,
}: AdditionalServicesFormProps) {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  const [additionalKg, setAdditionalKg] = useState(0);
  const [delicateItems, setDelicateItems] = useState(0);
  const [needsIroning, setNeedsIroning] = useState(false);

  // Initialize form state from store
  useEffect(() => {
    if (orderData) {
      setAdditionalKg(orderData.additionalKg ?? 0);
      setDelicateItems(orderData.delicateItems ?? 0);
      setNeedsIroning(orderData.needsIroning ?? false);
    }
  }, [orderData]);

  // Additional kg step size
  const KG_STEP = 5;

  // Plan price in NOK
  const planPriceNok = oreToNok(planPriceOre);

  // Calculate monthly recurring costs (plan + additional kg + delicate + ironing)
  const monthlyRecurringCost = useMemo(() => {
    let cost = planPriceNok;

    // Add additional KG (monthly recurring)
    cost += additionalKg * EXTRA_KG_PRICE_NOK;

    // Add delicate items and ironing (monthly recurring)
    cost += delicateItems * DELICATE_PRICE_NOK;
    if (needsIroning) {
      cost += delicateItems * IRONING_PRICE_NOK;
    }

    return cost;
  }, [additionalKg, delicateItems, needsIroning, planPriceNok]);

  const handleContinue = () => {
    updateOrderData({
      additionalKg,
      delicateItems,
      needsIroning
    });
    router.push('/orders/schedule');
  };

  // Get display name for plan frequency
  const getPlanDisplayName = () => {
    switch (planFrequency) {
      case 'weekly':
        return 'Ukentlig vask';
      case 'biweekly':
        return 'Annenhver uke';
      case 'monthly':
        return 'Månedlig vask';
      case 'on_demand':
        return 'Enkeltvask';
      default:
        return planName;
    }
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
            <div className="mb-4 flex justify-center">
              <div className="bg-blue-50 rounded-full p-4">
                <Sparkles className="w-12 h-12 text-nordic-blue" />
              </div>
            </div>
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
                    <div className="bg-blue-50 rounded-lg p-2 flex-shrink-0">
                      <Scale className="w-6 h-6 text-nordic-blue" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-semibold text-dark-gray mb-1">Ekstra kg vask per måned</h4>
                      <p className="text-sm text-medium-gray">Legg til mer kapasitet ved behov</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-nordic-blue font-semibold whitespace-nowrap block">
                      {additionalKg * EXTRA_KG_PRICE_NOK} kr/mnd
                    </span>
                    <span className="text-xs text-medium-gray whitespace-nowrap">
                      {EXTRA_KG_PRICE_NOK} kr/kg
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 justify-center">
                  <button
                    onClick={() => setAdditionalKg(Math.max(0, additionalKg - KG_STEP))}
                    disabled={additionalKg === 0}
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 text-dark-gray font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-center min-w-[80px]">
                    <p className="text-3xl font-bold text-dark-gray">{additionalKg}</p>
                    <p className="text-xs text-medium-gray mt-1">kg ekstra</p>
                  </div>
                  <button
                    onClick={() => setAdditionalKg(additionalKg + KG_STEP)}
                    className="w-10 h-10 rounded-lg border-2 border-nordic-blue text-nordic-blue font-bold hover:bg-nordic-blue hover:text-white flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
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
                    <div className="bg-purple-50 rounded-lg p-2 flex-shrink-0">
                      <Shirt className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-semibold text-dark-gray mb-1">Skjorter og kjoler</h4>
                      <p className="text-sm text-medium-gray">Spesiell håndtering for delikate plagg</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-nordic-blue font-semibold whitespace-nowrap block">
                      {delicateItems * DELICATE_PRICE_NOK} kr/mnd
                    </span>
                    <span className="text-xs text-medium-gray whitespace-nowrap">
                      {DELICATE_PRICE_NOK} kr/stk
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
                    className="w-10 h-10 rounded-lg border-2 border-gray-300 text-dark-gray font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="text-center min-w-[80px]">
                    <p className="text-3xl font-bold text-dark-gray">{delicateItems}</p>
                  </div>
                  <button
                    onClick={() => setDelicateItems(delicateItems + 1)}
                    className="w-10 h-10 rounded-lg border-2 border-nordic-blue text-nordic-blue font-bold hover:bg-nordic-blue hover:text-white flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
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
                      {needsIroning ? delicateItems * IRONING_PRICE_NOK : 0} kr/mnd
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
              <RefreshCw className="w-5 h-5 text-blue-600" />
              MÅNEDLIG ABONNEMENT
            </h3>
            <div className="space-y-2">
              {/* Subscription Plan */}
              <div className="flex justify-between text-sm">
                <span className="text-dark-gray">{getPlanDisplayName()}</span>
                <span className="text-dark-gray">{planPriceNok} kr</span>
              </div>

              {/* Additional KG */}
              {additionalKg > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-gray">Ekstra kg ({additionalKg} kg)</span>
                  <span className="text-dark-gray">{additionalKg * EXTRA_KG_PRICE_NOK} kr</span>
                </div>
              )}

              {/* Delicate Items */}
              {delicateItems > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-gray">Delikatvask ({delicateItems} stk)</span>
                  <span className="text-dark-gray">{delicateItems * DELICATE_PRICE_NOK} kr</span>
                </div>
              )}

              {/* Ironing */}
              {needsIroning && delicateItems > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-dark-gray">Stryking ({delicateItems} stk)</span>
                  <span className="text-dark-gray">{delicateItems * IRONING_PRICE_NOK} kr</span>
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
              className="py-3 px-8 rounded-lg font-semibold transition-colors bg-[hsl(var(--nordic-blue))] text-white hover:bg-[hsl(var(--nordic-blue))]/90"
            >
              Fortsett
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
