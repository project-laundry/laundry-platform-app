'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderSelectionAction } from '@/app/orders/actions';
import { calculateCustomerEstimate } from '@/lib/config/pricing';
import { SelectionEditor } from '@/components/order-flow/SelectionEditor';
import { Breakdown, PriceDisclaimer } from '@/components/order-flow/primitives';
import type { CustomerEstimate } from '@/types/database';
import type { OrderSelection } from '@/types/order-flow';
import { Pencil, Check, X, Shirt, ShoppingBag, BedDouble } from 'lucide-react';

interface EditableOrderSelectionProps {
  orderId: string;
  initialEstimate: CustomerEstimate | null;
  initialNeedsIroning: boolean;
  isEditable: boolean;
}

function toSelection(estimate: CustomerEstimate): OrderSelection {
  return {
    bags: estimate.bags,
    beddingSets: estimate.bedding_sets,
    everydayItems: estimate.iron_everyday_items,
    formalItems: estimate.iron_formal_items,
    ironBedding: estimate.iron_bedding,
  };
}

// The customer's checkout selection as compact row labels (zeros omitted).
function getEstimateRows(estimate: CustomerEstimate) {
  const rows: { icon: typeof ShoppingBag; label: string }[] = [];
  if (estimate.bags > 0) {
    rows.push({
      icon: ShoppingBag,
      label: estimate.bags === 1 ? '1 pose klesvask' : `${estimate.bags} poser klesvask`,
    });
  }
  if (estimate.bedding_sets > 0) {
    rows.push({ icon: BedDouble, label: `${estimate.bedding_sets} sengesett` });
  }
  if (estimate.iron_everyday_items > 0) {
    rows.push({
      icon: Shirt,
      label:
        estimate.iron_everyday_items === 1
          ? '1 vanlig plagg strykes'
          : `${estimate.iron_everyday_items} vanlige plagg strykes`,
    });
  }
  if (estimate.iron_formal_items > 0) {
    rows.push({
      icon: Shirt,
      label:
        estimate.iron_formal_items === 1
          ? '1 skjorte eller finplagg strykes'
          : `${estimate.iron_formal_items} skjorter og finklær strykes`,
    });
  }
  if (estimate.iron_bedding) {
    rows.push({ icon: BedDouble, label: 'Sengetøy strykes' });
  }
  return rows;
}

export function EditableOrderSelection({
  orderId,
  initialEstimate,
  initialNeedsIroning,
  isEditable,
}: EditableOrderSelectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<OrderSelection>(() =>
    initialEstimate
      ? toSelection(initialEstimate)
      : { bags: 0, beddingSets: 0, everydayItems: 0, formalItems: 0, ironBedding: false }
  );
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const price = useMemo(() => calculateCustomerEstimate(draft), [draft]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateOrderSelectionAction(orderId, draft);

      if (!result.success) {
        alert(result.error || 'En feil oppstod');
        setIsLoading(false);
        return;
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating order selection:', error);
      alert('En feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (initialEstimate) setDraft(toSelection(initialEstimate));
    setIsEditing(false);
  };

  // Legacy orders without a stored estimate: nothing sane to seed the editor
  // with, so show the coarse ironing preference read-only.
  if (!initialEstimate) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Shirt className="size-4 shrink-0 text-sea-green" />
          <span className="text-sm text-dark-gray">Stryking</span>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            initialNeedsIroning
              ? 'bg-sea-green/10 text-sea-green'
              : 'bg-cream-dark/60 text-medium-gray'
          }`}
        >
          {initialNeedsIroning ? 'Ja' : 'Nei'}
        </span>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <SelectionEditor selection={draft} onChange={setDraft} />
        <Breakdown price={price} />
        <PriceDisclaimer />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !price.hasItems}
            className="inline-flex items-center gap-2 rounded-full bg-nordic-blue px-4 py-2 text-sm font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none"
          >
            <Check className="size-3.5" />
            {isLoading ? 'Lagrer...' : 'Lagre'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X className="size-3.5" />
            Avbryt
          </button>
        </div>
      </div>
    );
  }

  const rows = getEstimateRows(initialEstimate);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1.5 text-sm text-dark-gray">
        {rows.map((row) => (
          <p key={row.label} className="flex items-center gap-2 tabular-nums">
            <row.icon className="size-4 shrink-0 text-sea-green" />
            {row.label}
          </p>
        ))}
      </div>
      {isEditable && (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label="Rediger bestilling"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-nordic-blue transition-all hover:bg-cream hover:text-sea-green active:scale-90"
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </div>
  );
}
