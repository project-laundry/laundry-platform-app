'use client';

// Step 1 — what the customer wants washed.

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { calculateCustomerEstimate } from '@/lib/config/pricing';
import type { OrderSelection } from '@/types/order-flow';
import { OrderFlowShell } from '@/components/order-flow/OrderFlowShell';
import { SelectionEditor } from '@/components/order-flow/SelectionEditor';
import { Breakdown, PriceDisclaimer } from '@/components/order-flow/primitives';

const DEFAULT_SELECTION: OrderSelection = {
  bags: 1,
  beddingSets: 0,
  everydayItems: 0,
  formalItems: 0,
  ironBedding: false,
};

export default function WashPage() {
  const router = useRouter();
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
      onAdvance={() => router.push('/orders/pickup')}
    >
      <SelectionEditor
        selection={selection}
        onChange={(next) => updateOrderData({ selection: next })}
      />

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
