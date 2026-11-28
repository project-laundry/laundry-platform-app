'use client';

// "What do you want washed?" editor — bags, bedding sets with the optional
// bedding ironing, and ironing counts for clothes when those are offered.
// Store-agnostic: used by the order flow's first step, the customer's order
// edit and the public price calculator.

import { BedDouble, ShoppingBag, Sparkles } from 'lucide-react';
import {
  estimatedGarments,
  formatKr,
  isIroningGroupOffered,
  PRICING,
} from '@/lib/config/pricing';
import type { OrderSelection } from '@/types/order-flow';
import {
  BagVisual,
  clamp,
  clampPieces,
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
  // Which ironing groups are on offer (OFFERED_IRONING_GROUPS in pricing.ts,
  // BUSINESS_LOGIC.md "Ironing").
  const offersEveryday = isIroningGroupOffered('everyday');
  const offersFormal = isIroningGroupOffered('shirts_dresses');
  const offersBedding = isIroningGroupOffered('bedding');

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

  const beddingIroningHint =
    sel.ironBedding && sel.beddingSets > 0
      ? `${sel.beddingSets} sett · + ${formatKr(sel.beddingSets * PRICING.ironing.bedding)}`
      : `+ ${formatKr(PRICING.ironing.bedding)} per sett`;

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
        subtitle="Tell i vanlige handleposer med klær. Du bruker dine egne poser."
      >
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
        subtitle="Ett sett er dynetrekk, laken og putevar."
      >
        <Stepper
          value={sel.beddingSets}
          onChange={setBedding}
          unit="sett"
          perUnit={`${formatKr(PRICING.per_bedding_set_ore)} / sett`}
        />

        {offersBedding && (
          <div className="mt-4">
            <IroningToggle
              label="Stryk sengetøyet"
              hint={beddingIroningHint}
              checked={sel.ironBedding}
              disabled={sel.beddingSets === 0}
              disabledHint="Legg til sengetøy først"
              onChange={(v) => onChange({ ...sel, ironBedding: v })}
            />
          </div>
        )}
      </Section>

      {(offersEveryday || offersFormal) && (
        <Section
          delay={200}
          icon={<Sparkles className="size-5" />}
          title="Stryking av klær"
          subtitle="Vil du ha noe strøket? (valgfritt)"
        >
          <div className="space-y-3">
            {offersEveryday && (
              <PieceRow
                label="Vanlige plagg"
                hint={everydayHint}
                value={sel.everydayItems}
                max={MAX_PIECES}
                onChange={setEveryday}
                action={everydayAction}
              />
            )}
            {offersFormal && (
              <PieceRow
                label="Skjorter & kjoler"
                hint={formalHint}
                value={sel.formalItems}
                max={MAX_PIECES}
                onChange={setFormal}
              />
            )}
          </div>
        </Section>
      )}
    </>
  );
}
