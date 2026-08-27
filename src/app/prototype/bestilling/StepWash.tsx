'use client';

// Step 1 — what the customer wants washed.

import { BedDouble, ShoppingBag, Sparkles } from 'lucide-react';
import {
  estimatedGarments,
  formatKr,
  PROTO_PRICING,
  type Selection,
} from './pricing';
import {
  BagVisual,
  Breakdown,
  clamp,
  Explainer,
  IroningToggle,
  MAX_PIECES,
  PieceRow,
  PriceDisclaimer,
  Section,
  Stepper,
} from './components';
import type { PriceResult } from './pricing';

const clampPieces = (n: number) => Math.max(0, Math.min(MAX_PIECES, n));

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
    setSel((s) => ({ ...s, bags: clamp(n) }));
  const setBedding = (n: number) =>
    setSel((s) => {
      const beddingSets = clamp(n);
      return {
        ...s,
        beddingSets,
        ironBedding: beddingSets === 0 ? false : s.ironBedding,
      };
    });
  const setEveryday = (n: number) =>
    setSel((s) => ({ ...s, everydayItems: clampPieces(n) }));
  const setFormal = (n: number) =>
    setSel((s) => ({ ...s, formalItems: clampPieces(n) }));

  // Everyday ironing stays off by default — most people don't iron everyday
  // clothes. For those who do, one tap fills a per-bag estimate so they never
  // have to count by hand.
  const estimate = clampPieces(estimatedGarments(sel.bags));
  const everydayHint =
    sel.everydayItems > 0
      ? `${sel.everydayItems} plagg · + ${formatKr(sel.everydayItems * PROTO_PRICING.iron_per_garment_ore)}`
      : `${formatKr(PROTO_PRICING.iron_per_garment_ore)} per plagg`;
  const everydayAction =
    sel.everydayItems === 0 && estimate > 0
      ? { label: `Bruk anslag (~${estimate})`, onClick: () => setEveryday(estimate) }
      : undefined;
  const formalHint =
    sel.formalItems > 0
      ? `${sel.formalItems} plagg · + ${formatKr(sel.formalItems * PROTO_PRICING.iron_formal_per_item_ore)}`
      : `${formatKr(PROTO_PRICING.iron_formal_per_item_ore)} per plagg`;

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
        <div className="space-y-3">
          <PieceRow
            label="Vanlige plagg"
            hint={everydayHint}
            value={sel.everydayItems}
            max={MAX_PIECES}
            onChange={setEveryday}
            action={everydayAction}
          />
          <PieceRow
            label="Skjorter & kjoler"
            hint={formalHint}
            value={sel.formalItems}
            max={MAX_PIECES}
            onChange={setFormal}
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
