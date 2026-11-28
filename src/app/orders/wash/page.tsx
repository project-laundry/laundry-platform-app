'use client';

// Step 1 — what the customer wants washed.

import { useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { WashingMachine } from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { calculateCustomerEstimate } from '@/lib/config/pricing';
import { track } from '@/lib/analytics/posthog';
import type { OrderSelection } from '@/types/order-flow';
import { OrderFlowShell } from '@/components/order-flow/OrderFlowShell';
import { SelectionEditor } from '@/components/order-flow/SelectionEditor';
import { Breakdown, PriceDisclaimer, Section } from '@/components/order-flow/primitives';
import {
  PACKING_GUIDE,
  PACKING_RULE,
  WASH_INSTRUCTIONS_LABEL,
  WASH_INSTRUCTIONS_MAX_LENGTH,
  WASH_INSTRUCTIONS_PLACEHOLDER,
} from '@/lib/config/washing';

const DEFAULT_SELECTION: OrderSelection = {
  bags: 1,
  beddingSets: 0,
  everydayItems: 0,
  formalItems: 0,
  ironBedding: false,
};

export default function WashPage() {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);
  const hasHydrated = useOrderFlowStore((state) => state._hasHydrated);

  const selection = orderData?.selection ?? DEFAULT_SELECTION;
  const price = useMemo(() => calculateCustomerEstimate(selection), [selection]);

  // Seed the default selection into the store on first visit so the step-2
  // route guard (which requires a non-empty selection) sees it.
  useEffect(() => {
    if (hasHydrated && !orderData?.selection) {
      updateOrderData({ selection: DEFAULT_SELECTION });
    }
  }, [hasHydrated, orderData?.selection, updateOrderData]);

  return (
    <OrderFlowShell
      step={1}
      price={price}
      canAdvance={price.hasItems}
      isNavigating={isNavigating}
      onAdvance={() => {
        track('order_step_completed', {
          step: 1,
          bags: selection.bags,
          bedding_sets: selection.beddingSets,
          estimate_ore: price.totalOre,
        });
        startNavigation(() => router.push('/orders/pickup'));
      }}
    >
      <SelectionEditor
        selection={selection}
        onChange={(next) => updateOrderData({ selection: next })}
      />

      <Section
        delay={200}
        icon={<WashingMachine className="size-5" />}
        title="Slik pakker du"
        subtitle={PACKING_RULE}
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-medium-gray marker:text-sea-green">
          {PACKING_GUIDE.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium text-dark-gray">
            {WASH_INSTRUCTIONS_LABEL}
          </span>
          <textarea
            value={orderData?.washInstructions ?? ''}
            onChange={(e) => updateOrderData({ washInstructions: e.target.value })}
            rows={2}
            maxLength={WASH_INSTRUCTIONS_MAX_LENGTH}
            placeholder={WASH_INSTRUCTIONS_PLACEHOLDER}
            className="w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20"
          />
        </label>
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
    </OrderFlowShell>
  );
}
