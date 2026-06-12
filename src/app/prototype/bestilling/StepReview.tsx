'use client';

// Step 3 — review everything before the Vipps handoff.

import { CalendarDays, CreditCard, MapPin, Package, RefreshCw } from 'lucide-react';
import { type PriceResult, type Selection } from './pricing';
import { Breakdown, PriceDisclaimer } from './components';
import { FREQUENCY_LABELS, type Address, type Schedule } from './types';

function formatPickupDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const s = date.toLocaleDateString('nb-NO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function selectionSummary(sel: Selection): string {
  return (
    [
      sel.bags > 0 && `${sel.bags} ${sel.bags === 1 ? 'pose' : 'poser'} klær`,
      sel.beddingSets > 0 && `${sel.beddingSets} sett sengetøy`,
      sel.ironClothes && 'stryking av klær',
      sel.ironBedding && 'stryking av sengetøy',
    ]
      .filter(Boolean)
      .join(' · ') || '—'
  );
}

export function StepReview({
  sel,
  address,
  schedule,
  price,
}: {
  sel: Selection;
  address: Address;
  schedule: Schedule;
  price: PriceResult;
}) {
  return (
    <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <SummaryRow
        icon={<Package className="size-5" />}
        title="Dette sender du"
        value={selectionSummary(sel)}
      />
      <SummaryRow
        icon={<MapPin className="size-5" />}
        title="Henting & levering"
        value={
          address.street
            ? `${address.street}, ${address.postalCode} ${address.city ?? ''}`.trim()
            : '—'
        }
        note={address.instructions || undefined}
      />
      <SummaryRow
        icon={<CalendarDays className="size-5" />}
        title="Første henting"
        value={formatPickupDate(schedule.pickupDate)}
      />
      <SummaryRow
        icon={<RefreshCw className="size-5" />}
        title="Hyppighet"
        value={
          schedule.isRecurring
            ? `Fast – ${FREQUENCY_LABELS[schedule.frequency]}`
            : 'Én gang'
        }
      />

      <div>
        <h2 className="mb-3 font-serif text-xl font-semibold text-dark-gray">
          Prisoversikt
        </h2>
        <Breakdown price={price} />
        <PriceDisclaimer />
        <div className="mt-3 flex items-start gap-2.5 rounded-2xl bg-cream/70 px-4 py-3">
          <CreditCard className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <p className="text-sm leading-relaxed text-medium-gray">
            Du godkjenner kun en{' '}
            <span className="font-medium text-dark-gray">betalingsavtale</span>{' '}
            nå – ingenting trekkes før klærne er hentet og priset.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  icon,
  title,
  value,
  note,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.12em] text-medium-gray">
          {title}
        </p>
        <p className="mt-0.5 font-medium text-dark-gray">{value}</p>
        {note && <p className="mt-0.5 text-sm text-medium-gray">{note}</p>}
      </div>
    </div>
  );
}
