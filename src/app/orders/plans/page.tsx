'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Plan {
  id: 'weekly' | 'biweekly' | 'single';
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'biweekly',
    name: 'Annenhver uke',
    price: 249,
    description: 'Vaskes annenhver uke',
    features: [
      'Henting annenhver uke',
      'Fast vaskedag hver 14. dag',
      'Inntil 5 kg tøy per henting',
      'SMS-varsling',
      'Standard vasketid (2-3 dager)',
      'Kan avbrytes når som helst',
    ]
  },
  {
    id: 'weekly',
    name: 'Ukentlig',
    price: 399,
    description: 'Vaskes hver uke',
    popular: true,
    features: [
      'Ukentlig henting og levering',
      'Fast vaskedag hver uke',
      'Inntil 5 kg tøy per henting',
      'SMS-varsling',
      'Prioritert behandling',
      'Kan avbrytes når som helst',
    ]
  },
  {
    id: 'single',
    name: 'Enkeltvask',
    price: 149,
    description: 'Betal per vask',
    features: [
      'Ingen abonnement',
      'Bestill når du trenger det',
      'Inntil 5 kg tøy per vask',
      'Standard vasketid (3-4 dager)',
      'SMS-varsling',
      'Ingen bindingstid',
    ]
  }
];

export default function PlansPage() {
  const searchParams = useSearchParams();
  const addressParam = searchParams.get('address');
  const [selectedPlan, setSelectedPlan] = useState<string>('weekly');

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    console.log('Selected plan:', selectedPlan);
    // Redirect to additional services page after plan selection
    window.location.href = `/orders/additional-services?plan=${selectedPlan}`;
  };

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
        {/* Page Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-dark-gray mb-4">Velg din plan</h2>
          <p className="text-xl text-medium-gray mb-2">
            Velg planen som passer best for dine behov
          </p>
          <p className="text-sm text-medium-gray">
            Du kan endre eller avbryte når som helst
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl p-8 border-2 transition-all relative flex flex-col ${
                plan.popular
                  ? 'border-nordic-blue'
                  : 'border-gray-200'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-nordic-blue text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Mest populær
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-dark-gray mb-2">{plan.name}</h3>
                <div className="mb-3">
                  <span className="text-4xl font-bold text-dark-gray">{plan.price}</span>
                  <span className="text-lg text-medium-gray font-normal"> NOK/mnd</span>
                </div>
                <p className="text-medium-gray">{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-6 flex-grow">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-fresh-green mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-dark-gray">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Select Button */}
              <button
                onClick={() => {
                  setSelectedPlan(plan.id);
                  window.location.href = `/orders/additional-services?plan=${plan.id}`;
                }}
                className="w-full py-3 px-6 rounded-lg font-semibold transition-colors bg-white text-nordic-blue border-2 border-nordic-blue hover:bg-nordic-blue hover:text-white cursor-pointer"
              >
                Velg plan
              </button>
            </div>
          ))}
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-medium-gray hover:text-dark-gray">
            ← Tilbake til dashbord
          </Link>
        </div>
      </div>
    </div>
  );
}