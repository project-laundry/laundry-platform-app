'use client';

// Step 1 — what the customer wants washed.

import { BedDouble, ShoppingBag, Sparkles } from 'lucide-react';
import {
  estimatedGarments,
  formatKr,
  ironClothesPerBagOre,
  PROTO_PRICING,
  type Selection,
} from './pricing';
import {
  BagVisual,
  Breakdown,
  clamp,
  Explainer,
  IroningToggle,
  PriceDisclaimer,
  Section,
  Stepper,
} from './components';
import type { PriceResult } from './pricing';

export function StepWash({
  sel,
  setSel,
  price,
}: {
  sel: Selection;
  setSel: React.Dispatch<React.SetStateAction<Selection>>;
  price: PriceResult;
}) {
  const setBags = (n: number) =>
    setSel((s) => {
      const bags = clamp(n);
      return { ...s, bags, ironClothes: bags === 0 ? false : s.ironClothes };
    });
  const setBedding = (n: number) =>
    setSel((s) => {
      const beddingSets = clamp(n);
      return {
        ...s,
        beddingSets,
        ironBedding: beddingSets === 0 ? false : s.ironBedding,
      };
    });

  return (
    <>
      <Section
        delay={80}
        icon={<ShoppingBag className="size-5" />}
        title="Klær"
        subtitle="Hvor mange poser sender du?"
      >
        <Explainer>
          <span className="font-medium text-dark-gray">1 pose</span> tilsvarer
          omtrent én standard pose fra dagligvarebutikken.
        </Explainer>

        <Stepper
          value={sel.bags}
          onChange={setBags}
          unit={sel.bags === 1 ? 'pose' : 'poser'}
          perUnit={`${formatKr(PROTO_PRICING.per_bag_ore)} / pose`}
        />

        {sel.bags > 0 && <BagVisual count={sel.bags} />}
      </Section>

      <Section
        delay={140}
        icon={<BedDouble className="size-5" />}
        title="Sengetøy"
        subtitle="Vil du sende med sengetøy?"
      >
        <Explainer>
          Sengetøy vaskes for seg.{' '}
          <span className="font-medium text-dark-gray">Hvert sett</span> teller
          som én egen vask.
        </Explainer>

        <Stepper
          value={sel.beddingSets}
          onChange={setBedding}
          unit="sett"
          perUnit={`${formatKr(PROTO_PRICING.per_bedding_set_ore)} / sett`}
        />
      </Section>

      <Section
        delay={200}
        icon={<Sparkles className="size-5" />}
        title="Stryking"
        subtitle="Vil du ha noe strøket? (valgfritt)"
      >
        <Explainer>
          Klær strykes per plagg. Vi anslår{' '}
          <span className="font-medium text-dark-gray">
            ca. {PROTO_PRICING.garments_per_bag} plagg per pose
          </span>{' '}
          à {formatKr(PROTO_PRICING.iron_per_garment_ore)}.
        </Explainer>

        <div className="space-y-3">
          <IroningToggle
            label="Stryk klærne mine"
            hint={
              sel.bags > 0
                ? `+ ca. ${formatKr(ironClothesPerBagOre() * sel.bags)} (${estimatedGarments(sel.bags)} plagg)`
                : `+ ca. ${formatKr(ironClothesPerBagOre())} per pose`
            }
            checked={sel.ironClothes}
            disabled={sel.bags === 0}
            disabledHint="Legg til klær først"
            onChange={(v) => setSel((s) => ({ ...s, ironClothes: v }))}
          />
          <IroningToggle
            label="Stryk sengetøyet"
            hint={`+ ${formatKr(PROTO_PRICING.iron_bedding_per_set_ore)} per sett`}
            checked={sel.ironBedding}
            disabled={sel.beddingSets === 0}
            disabledHint="Legg til sengetøy først"
            onChange={(v) => setSel((s) => ({ ...s, ironBedding: v }))}
          />
        </div>
      </Section>

      <section className="mt-8 animate-in fade-in slide-in-from-bottom-3 duration-700 [animation-delay:260ms]">
        <h2 className="font-serif text-xl font-semibold text-dark-gray">
          Din bestilling
        </h2>
        <div className="mt-3">
          <Breakdown price={price} />
        </div>
        <PriceDisclaimer />
      </section>
    </>
  );
}
