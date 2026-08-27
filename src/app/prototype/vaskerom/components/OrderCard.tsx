'use client';

// Expandable order card for the Vaskerom flow. Collapsed it shows the customer,
// status and a one-line content summary; expanded it becomes the per-order
// registration: steppers (seeded from the customer's order, editable) plus the
// single advance action — "Start arbeid", then "Fullfør og belast" which, in the
// real system, prices the order and triggers the Vipps Recurring charge. Once
// Klar the card is a read-only receipt: what was done + the charge confirmation.

import {
  BedDouble,
  Check,
  CheckCircle2,
  ChevronDown,
  Minus,
  Pencil,
  Plus,
  Shirt,
  Sparkles,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react';
import {
  ADVANCE_LABEL,
  ALL_FIELDS,
  contentSummary,
  contentsEqual,
  contentTotal,
  IRON_FIELDS,
  WASH_FIELDS,
  type ContentField,
  type FieldCfg,
  type WashOrder,
} from '../washroom';

const FIELD_ICON: Record<ContentField, LucideIcon> = {
  washClothes: WashingMachine,
  washBedding: BedDouble,
  ironEveryday: Shirt,
  ironFormal: Sparkles,
  ironBedding: BedDouble,
};

interface OrderCardProps {
  order: WashOrder;
  isOpen: boolean;
  onToggle: () => void;
  onBump: (field: ContentField, delta: number) => void;
  onAdvance: () => void;
}

export function OrderCard({ order, isOpen, onToggle, onBump, onAdvance }: OrderCardProps) {
  const { status } = order;
  const changed = !contentsEqual(order.requested, order.registered);
  const total = contentTotal(order.registered);

  const pill =
    status === 'mottatt'
      ? 'bg-cream-dark/60 text-medium-gray'
      : status === 'arbeid'
        ? 'bg-nordic-blue/12 text-nordic-blue'
        : 'bg-sea-green/15 text-sea-green';
  const pillLabel =
    status === 'mottatt' ? 'Mottatt' : status === 'arbeid' ? 'I arbeid' : 'Klar';
  const accent =
    status === 'arbeid'
      ? 'border-l-nordic-blue'
      : status === 'klar'
        ? 'border-l-sea-green'
        : 'border-l-cream-dark';

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-l-4 border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur ${accent}`}
    >
      {/* Collapsed header — whole row toggles the editor open. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-cream/40"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight text-dark-gray">
            {order.customer_name}
          </p>
          <p className="font-mono text-xs text-medium-gray">{order.order_number}</p>
          <p className="mt-1.5 text-sm text-medium-gray">
            {contentSummary(order.registered)}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${pill}`}>
          {pillLabel}
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-medium-gray transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-1 border-t border-cream-dark/60 px-4 pb-4 pt-3 duration-300">
          {order.notes && (
            <p className="mb-3 rounded-2xl bg-cream/70 px-3 py-2 text-xs text-dark-gray">
              {order.notes}
            </p>
          )}

          {status === 'klar' ? (
            <Receipt order={order} />
          ) : (
            <>
              <p className="mb-3 flex items-start gap-1.5 text-xs text-medium-gray">
                <Pencil className="mt-0.5 size-3.5 shrink-0" />
                {changed
                  ? 'Justert fra kundens bestilling.'
                  : 'Forhåndsutfylt fra kundens bestilling – juster til det du faktisk mottok.'}
              </p>

              <FieldGroup title="Vaskelaster" fields={WASH_FIELDS} order={order} onBump={onBump} />
              <FieldGroup
                title="Stryk"
                fields={IRON_FIELDS}
                order={order}
                onBump={onBump}
                className="mt-4"
              />

              <button
                type="button"
                onClick={onAdvance}
                disabled={status === 'arbeid' && total === 0}
                className={`mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-base font-semibold text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none ${
                  status === 'arbeid' ? 'bg-sea-green' : 'bg-nordic-blue'
                }`}
              >
                {status === 'arbeid' ? (
                  <Check className="size-5" />
                ) : (
                  <WashingMachine className="size-5" />
                )}
                {ADVANCE_LABEL[status]}
              </button>
              {status === 'arbeid' && (
                <p className="mt-2 text-center text-xs text-medium-gray">
                  Bekrefter arbeidet og sender betalingen til Vipps.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface FieldGroupProps {
  title: string;
  fields: FieldCfg[];
  order: WashOrder;
  onBump: (field: ContentField, delta: number) => void;
  className?: string;
}

function FieldGroup({ title, fields, order, onBump, className = '' }: FieldGroupProps) {
  return (
    <div className={className}>
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-medium-gray">
        {title}
      </p>
      <div className="space-y-2">
        {fields.map((field) => (
          <CounterRow
            key={field.id}
            cfg={field}
            value={order.registered[field.id]}
            onBump={(delta) => onBump(field.id, delta)}
          />
        ))}
      </div>
    </div>
  );
}

interface CounterRowProps {
  cfg: FieldCfg;
  value: number;
  onBump: (delta: number) => void;
}

function CounterRow({ cfg, value, onBump }: CounterRowProps) {
  const Icon = FIELD_ICON[cfg.id];
  const active = value > 0;
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-cream/60 px-3 py-2">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
          active ? 'bg-sea-green text-white' : 'bg-sea-green/12 text-sea-green'
        }`}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-tight text-dark-gray">{cfg.label}</p>
        <p className="text-xs text-medium-gray">{cfg.hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onBump(-1)}
          disabled={value === 0}
          aria-label={`Færre ${cfg.label}`}
          className="flex size-8 items-center justify-center rounded-full border border-cream-dark text-dark-gray transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:opacity-30 disabled:hover:border-cream-dark disabled:hover:text-dark-gray"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="w-6 text-center font-serif text-xl font-semibold tabular-nums text-dark-gray">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onBump(1)}
          aria-label={`Flere ${cfg.label}`}
          className="flex size-8 items-center justify-center rounded-full bg-sea-green text-white shadow-soft transition-all hover:brightness-110 active:scale-90"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// Read-only view once the order is Klar: the registered contents + charge stamp.
function Receipt({ order }: { order: WashOrder }) {
  const done = ALL_FIELDS.filter((f) => order.registered[f.id] > 0);
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {done.length === 0 ? (
          <span className="text-xs text-medium-gray">Ingen registrering.</span>
        ) : (
          done.map((f) => {
            const Icon = FIELD_ICON[f.id];
            return (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-dark-gray"
              >
                <Icon className="size-3.5 text-sea-green" />
                {order.registered[f.id]} {f.label}
              </span>
            );
          })
        )}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-sea-green/10 px-3 py-2.5 text-sm font-medium text-sea-green">
        <CheckCircle2 className="size-4 shrink-0" />
        Belastet i Vipps{order.charged_at ? ` kl. ${order.charged_at}` : ''} · klar til henting
      </div>
    </div>
  );
}
