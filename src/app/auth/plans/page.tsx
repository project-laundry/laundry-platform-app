'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Plan {
  id: 'starter' | 'family' | 'premium';
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Start',
    price: 500,
    description: 'Perfekt for enkeltpersoner',
    features: [
      'Opptil 3 hentinger per måned',
      'Standard vasketid (2-3 dager)',
      'Grunnleggende kundestøtte',
      'SMS-varsling',
    ]
  },
  {
    id: 'family',
    name: 'Familie',
    price: 1000,
    description: 'Ideell for familier',
    popular: true,
    features: [
      'Ubegrenset antall hentinger',
      'Prioritert behandling',
      'Familievennlige tjenester',
      'SMS og e-postvarsling',
      '24/7 kundestøtte',
      'Spesialomsorg for barnetøy',
    ]
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 2000,
    description: 'Prioritert service og omsorg',
    features: [
      'Ubegrenset hentinger',
      'Ekspresservice (samme dag)',
      'Premium omsorg og behandling',
      'Dedikert kunderådgiver',
      'Alle kommunikasjonskanaler',
      'Forsikring opp til 10 000 NOK',
      'Miljøvennlige produkter',
    ]
  }
];

export default function PlansPage() {
  const [selectedPlan, setSelectedPlan] = useState<string>('family');

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    console.log('Selected plan:', selectedPlan);
    // Redirect to payment page with selected plan
    window.location.href = `/auth/payment?plan=${selectedPlan}`;
  };

  return (
    <div className="min-h-screen bg-soft-gray">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-nordic-blue">RenVask</h1>
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
              className={`bg-white rounded-2xl p-8 border-2 cursor-pointer transition-all relative ${
                selectedPlan === plan.id
                  ? 'border-nordic-blue shadow-lg'
                  : plan.popular
                  ? 'border-nordic-blue'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-nordic-blue text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Mest populær
                </div>
              )}

              {/* Selection Indicator */}
              <div className="absolute top-4 right-4">
                <div className={`w-6 h-6 rounded-full border-2 ${
                  selectedPlan === plan.id
                    ? 'border-nordic-blue bg-nordic-blue'
                    : 'border-gray-300'
                } flex items-center justify-center`}>
                  {selectedPlan === plan.id && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-dark-gray mb-2">{plan.name}</h3>
                <div className="mb-3">
                  <span className="text-4xl font-bold text-dark-gray">{plan.price}</span>
                  <span className="text-lg text-medium-gray font-normal"> NOK/mnd</span>
                </div>
                <p className="text-medium-gray">{plan.description}</p>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <svg className="w-5 h-5 text-fresh-green mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-dark-gray">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={handleContinue}
            className="bg-nordic-blue text-white font-semibold px-12 py-4 rounded-lg hover:bg-blue-600 transition-colors text-lg"
          >
            Fortsett med {plans.find(p => p.id === selectedPlan)?.name}
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link href="/auth/signup" className="text-medium-gray hover:text-dark-gray">
            ← Tilbake til registrering
          </Link>
        </div>
      </div>
    </div>
  );
}