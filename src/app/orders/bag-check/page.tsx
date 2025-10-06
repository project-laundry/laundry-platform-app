'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AdditionalServicesPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || 'single';

  const [hasBag, setHasBag] = useState<boolean | null>(null);
  const [whiteBags, setWhiteBags] = useState(0);
  const [blackBags, setBlackBags] = useState(0);
  const [delicateItems, setDelicateItems] = useState(0);
  const [hasDelicateBag, setHasDelicateBag] = useState<boolean | null>(null);
  const [needsIroning, setNeedsIroning] = useState(false);

  // Pricing
  const BAG_PRICE = 50; // NOK per bag
  const DELICATE_PRICE = 75; // NOK per delicate item
  const IRONING_PRICE = 40; // NOK per item

  // Minimum bags required based on whether user has a bag
  const minBags = hasBag === false ? 1 : 0;

  const totalCost = useMemo(() => {
    let cost = 0;
    const totalBags = whiteBags + blackBags;

    // If user doesn't have a bag, first bag is free
    if (hasBag === false && totalBags > 0) {
      cost += (totalBags - 1) * BAG_PRICE;
    } else {
      cost += totalBags * BAG_PRICE;
    }

    cost += delicateItems * DELICATE_PRICE;
    if (needsIroning) {
      cost += delicateItems * IRONING_PRICE;
    }
    return cost;
  }, [whiteBags, blackBags, delicateItems, needsIroning, hasBag]);

  const canContinue = useMemo(() => {
    if (hasBag === null) return false;
    if (hasBag === false && (whiteBags + blackBags) < 1) return false;
    return true;
  }, [hasBag, whiteBags, blackBags]);

  const handleBagAnswer = (answer: boolean) => {
    setHasBag(answer);
    if (answer === false) {
      // If they don't have a bag, set minimum 1 bag
      if (whiteBags + blackBags < 1) {
        setWhiteBags(1);
      }
    }
  };

  const handleContinue = () => {
    const params = new URLSearchParams({
      plan,
      hasBag: hasBag?.toString() || 'false',
      whiteBags: whiteBags.toString(),
      blackBags: blackBags.toString(),
      delicateItems: delicateItems.toString(),
      hasDelicateBag: hasDelicateBag?.toString() || 'false',
      needsIroning: needsIroning.toString(),
      additionalCost: totalCost.toString()
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
        {/* Bag Verification Question */}
        <div className="bg-white rounded-2xl p-8 mb-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🛍️</div>
            <h2 className="text-3xl font-bold text-dark-gray mb-4">Har du en NooraCare-pose?</h2>
            <p className="text-lg text-medium-gray">
              For å bestille vask trenger du minst én NooraCare-pose
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <button
              onClick={() => handleBagAnswer(false)}
              className={`p-8 rounded-xl border-2 transition-all ${
                hasBag === false
                  ? 'border-nordic-blue bg-nordic-blue bg-opacity-5'
                  : 'border-gray-200 hover:border-nordic-blue'
              }`}
            >
              <div className="text-4xl mb-3">📦</div>
              <h3 className="font-semibold text-dark-gray mb-2 text-lg">Nei, jeg trenger en pose</h3>
              <p className="text-sm text-medium-gray">
                Vi sender deg minst én pose (gratis)
              </p>
            </button>

            <button
              onClick={() => handleBagAnswer(true)}
              className={`p-8 rounded-xl border-2 transition-all ${
                hasBag === true
                  ? 'border-nordic-blue bg-nordic-blue bg-opacity-5'
                  : 'border-gray-200 hover:border-nordic-blue'
              }`}
            >
              <div className="text-4xl mb-3">✅</div>
              <h3 className="font-semibold text-dark-gray mb-2 text-lg">Ja, jeg har allerede en</h3>
              <p className="text-sm text-medium-gray">
                Du kan legge til flere om nødvendig
              </p>
            </button>
          </div>
        </div>

        {/* Additional Services - Shows after bag question answered */}
        {hasBag !== null && (
          <div className="bg-white rounded-2xl p-8 mb-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✨</div>
              <h2 className="text-3xl font-bold text-dark-gray mb-4">Tilleggstjenester</h2>
              {hasBag === false ? (
                <p className="text-lg text-medium-gray">
                  Du trenger minst én pose for å komme i gang
                </p>
              ) : (
                <p className="text-lg text-medium-gray">
                  Flott! Legg til flere tjenester om nødvendig
                </p>
              )}
            </div>

            <div className="space-y-8">
              {/* Regular Bags Section */}
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-xl font-semibold text-dark-gray mb-6">
                  {hasBag === false ? 'Antall vaskposer (minimum 1)' : 'Ekstra vaskposer (valgfritt)'}
                </h3>

                {/* White Bags */}
                <div className="bg-soft-gray rounded-xl p-6 mb-4">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">⚪</span>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-dark-gray mb-1">Hvite vaskposer</h4>
                        <p className="text-sm text-medium-gray">For hvitt og lyst tøy</p>
                      </div>
                    </div>
                    <span className="text-nordic-blue font-semibold whitespace-nowrap">
                      {hasBag === false && (whiteBags + blackBags) === 1 ? 'Gratis' : `+${BAG_PRICE} NOK/stk`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 justify-center">
                    <button
                      onClick={() => setWhiteBags(Math.max(0, whiteBags - 1))}
                      disabled={whiteBags === 0 || (hasBag === false && whiteBags === 1 && blackBags === 0)}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 text-dark-gray font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[80px]">
                      <p className="text-3xl font-bold text-dark-gray">{whiteBags}</p>
                    </div>
                    <button
                      onClick={() => setWhiteBags(whiteBags + 1)}
                      className="w-10 h-10 rounded-lg border-2 border-nordic-blue text-nordic-blue font-bold hover:bg-nordic-blue hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Black Bags */}
                <div className="bg-soft-gray rounded-xl p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">⚫</span>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-dark-gray mb-1">Svarte vaskposer</h4>
                        <p className="text-sm text-medium-gray">For mørkt og farget tøy</p>
                      </div>
                    </div>
                    <span className="text-nordic-blue font-semibold whitespace-nowrap">
                      {hasBag === false && (whiteBags + blackBags) === 1 ? 'Gratis' : `+${BAG_PRICE} NOK/stk`}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 justify-center">
                    <button
                      onClick={() => setBlackBags(Math.max(0, blackBags - 1))}
                      disabled={blackBags === 0 || (hasBag === false && blackBags === 1 && whiteBags === 0)}
                      className="w-10 h-10 rounded-lg border-2 border-gray-300 text-dark-gray font-bold hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[80px]">
                      <p className="text-3xl font-bold text-dark-gray">{blackBags}</p>
                    </div>
                    <button
                      onClick={() => setBlackBags(blackBags + 1)}
                      className="w-10 h-10 rounded-lg border-2 border-nordic-blue text-nordic-blue font-bold hover:bg-nordic-blue hover:text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Delicate Wash Section */}
              <div className="border-b border-gray-200 pb-8">
                <h3 className="text-xl font-semibold text-dark-gray mb-6">Delikatvask</h3>

                <div className="bg-soft-gray rounded-xl p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">👔</span>
                      <div className="flex-grow">
                        <h4 className="font-semibold text-dark-gray mb-1">Skjorter og kjoler</h4>
                        <p className="text-sm text-medium-gray">Spesiell håndtering for delikate plagg</p>
                      </div>
                    </div>
                    <span className="text-nordic-blue font-semibold whitespace-nowrap">+{DELICATE_PRICE} NOK/stk</span>
                  </div>
                  <div className="flex items-center gap-4 justify-center">
                    <button
                      onClick={() => {
                        setDelicateItems(Math.max(0, delicateItems - 1));
                        if (delicateItems - 1 === 0) {
                          setHasDelicateBag(null);
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

                {/* Delicate Bag Question - Shows when delicate items > 0 */}
                {delicateItems > 0 && (
                  <div className="mt-6 p-6 bg-blue-50 rounded-xl">
                    <h4 className="font-semibold text-dark-gray mb-4">Har du en spesialpose?</h4>
                    <p className="text-sm text-medium-gray mb-4">
                      For delikate plagg anbefaler vi en spesialpose (som en dresspose)
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setHasDelicateBag(true)}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                          hasDelicateBag === true
                            ? 'bg-nordic-blue text-white'
                            : 'bg-white text-dark-gray border-2 border-gray-300 hover:border-nordic-blue'
                        }`}
                      >
                        Ja
                      </button>
                      <button
                        onClick={() => setHasDelicateBag(false)}
                        className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
                          hasDelicateBag === false
                            ? 'bg-nordic-blue text-white'
                            : 'bg-white text-dark-gray border-2 border-gray-300 hover:border-nordic-blue'
                        }`}
                      >
                        Nei
                      </button>
                    </div>
                  </div>
                )}

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
                      <span className="text-nordic-blue font-semibold whitespace-nowrap">+{IRONING_PRICE} NOK/stk</span>
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

            {/* Spacer for fixed bottom bar */}
            <div className="h-32"></div>
          </div>
        )}

        {/* Fixed Bottom Bar - Total Cost Summary */}
        {hasBag !== null && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-medium-gray">Din pris</p>
                  <p className="text-2xl font-bold text-nordic-blue">{totalCost} NOK</p>
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
        )}
      </div>
    </div>
  );
}
