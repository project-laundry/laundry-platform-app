'use client';

// "What do you want washed?" editor — bags, bedding sets and ironing counts.
// Store-agnostic: used by the order flow's first step and the public price
// calculator.

import { BedDouble, ShoppingBag, Sparkles } from 'lucide-react';
import {
  estimatedGarments,
  formatKr,
  PRICING,
} from '@/lib/config/pricing';
import type { OrderSelection } from '@/types/order-flow';
import {
  BagVisual,
  clamp,
  clampPieces,
  Explainer,
  IroningToggle,
  MAX_PIECES,
  PieceRow,
  Section,
  Stepper,
} from './primitives';

export function SelectionEditor({
  selection: sel,
  onChange,
}: {
  selection: OrderSelection;
  onChange: (next: OrderSelection) => void;
}) {
  const setBags = (n: number) => onChange({ ...sel, bags: clamp(n) });
  const setBedding = (n: number) => {
    const beddingSets = clamp(n);
    onChange({
      ...sel,
      beddingSets,
      ironBedding: beddingSets === 0 ? false : sel.ironBedding,
    });
  };
  const setEveryday = (n: number) =>
    onChange({ ...sel, everydayItems: clampPieces(n) });
  const setFormal = (n: number) =>
    onChange({ ...sel, formalItems: clampPieces(n) });

  // Everyday ironing stays off by default — most people don't iron everyday
  // clothes. For those who do, one tap fills a per-bag estimate so they never
  // have to count by hand.
  const estimate = clampPieces(estimatedGarments(sel.bags));
  const everydayHint =
    sel.everydayItems > 0
      ? `${sel.everydayItems} plagg · + ${formatKr(sel.everydayItems * PRICING.ironing.everyday)}`
      : `${formatKr(PRICING.ironing.everyday)} per plagg`;
  const everydayAction =
    sel.everydayItems === 0 && estimate > 0
      ? { label: `Bruk anslag (~${estimate})`, onClick: () => setEveryday(estimate) }
      : undefined;
  const formalHint =
    sel.formalItems > 0
      ? `${sel.formalItems} plagg · + ${formatKr(sel.formalItems * PRICING.ironing.shirts_dresses)}`
      : `${formatKr(PRICING.ironing.shirts_dresses)} per plagg`;

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
          perUnit={`${formatKr(PRICING.per_bag_ore)} / pose`}
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
          perUnit={`${formatKr(PRICING.per_bedding_set_ore)} / sett`}
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
            hint={`+ ${formatKr(PRICING.ironing.bedding)} per sett`}
            checked={sel.ironBedding}
            disabled={sel.beddingSets === 0}
            disabledHint="Legg til sengetøy først"
            onChange={(v) => onChange({ ...sel, ironBedding: v })}
          />
        </div>
      </Section>
    </>
  );
}
