'use client';

// Public price calculator (/pris-kalkulator) — same selection model and
// estimate as the order flow, plus a static price list.

import { useMemo, useState } from 'react';
import { CreditCard, ListChecks, Truck } from 'lucide-react';
import {
  calculateCustomerEstimate,
  formatKr,
  IRONING_LABELS,
  PRICING,
} from '@/lib/config/pricing';
import type { OrderSelection } from '@/types/order-flow';
import { SelectionEditor } from './SelectionEditor';
import { Breakdown, PriceDisclaimer, Section } from './primitives';

const INITIAL_SELECTION: OrderSelection = {
  bags: 1,
  beddingSets: 0,
  everydayItems: 0,
  formalItems: 0,
  ironBedding: false,
};

export function EstimateCalculator() {
  const [selection, setSelection] = useState<OrderSelection>(INITIAL_SELECTION);
  const price = useMemo(() => calculateCustomerEstimate(selection), [selection]);

  return (
    <div className="mx-auto max-w-2xl">
      <SelectionEditor selection={selection} onChange={setSelection} />

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-dark-gray">
          Ditt estimat
        </h2>
        <div className="mt-3">
          <Breakdown price={price} />
        </div>
        <PriceDisclaimer />
      </section>

      <Section
        icon={<ListChecks className="size-5" />}
        title="Prisliste"
        subtitle="Alle priser inkluderer mva."
      >
        <div className="divide-y divide-cream-dark/60 text-sm">
          <PriceListRow label="Vask av klær" detail="Per pose" amount={`${formatKr(PRICING.per_bag_ore)}`} />
          <PriceListRow label="Sengetøy" detail="Per sett · egen vask" amount={`${formatKr(PRICING.per_bedding_set_ore)}`} />
          <PriceListRow
            label={`Stryking · ${IRONING_LABELS.everyday.label}`}
            detail="Per plagg"
            amount={formatKr(PRICING.ironing.everyday)}
          />
          <PriceListRow
            label={`Stryking · ${IRONING_LABELS.shirts_dresses.label}`}
            detail="Per plagg"
            amount={formatKr(PRICING.ironing.shirts_dresses)}
          />
          <PriceListRow
            label="Stryking · Sengetøy"
            detail="Per sett"
            amount={formatKr(PRICING.ironing.bedding)}
          />
          <PriceListRow
            label="Henting & levering"
            detail="Til døren"
            amount={formatKr(PRICING.pickup_delivery_fee_ore)}
            icon={<Truck className="size-4 text-sea-green" />}
          />
          <PriceListRow
            label="Servicegebyr"
            detail=""
            amount={formatKr(PRICING.service_fee_ore)}
            icon={<CreditCard className="size-4 text-sea-green" />}
          />
          <PriceListRow label="Minste bestilling" detail="" amount={formatKr(PRICING.minimum_order_ore)} />
        </div>
      </Section>
    </div>
  );
}

function PriceListRow({
  label,
  detail,
  amount,
  icon,
}: {
  label: string;
  detail: string;
  amount: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <div>
          <p className="font-medium text-dark-gray">{label}</p>
          {detail && <p className="text-medium-gray">{detail}</p>}
        </div>
      </div>
      <p className="shrink-0 font-medium tabular-nums text-dark-gray">{amount}</p>
    </div>
  );
}
