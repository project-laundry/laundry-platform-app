'use client';

// Step 3 — review everything, then hand off to Vipps to approve the payment
// agreement (nothing is charged until the cleaner has priced the pickup).

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  CreditCard,
  MapPin,
  Package,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { calculateCustomerEstimate } from '@/lib/config/pricing';
import type { OrderSelection } from '@/types/order-flow';
import { isNonProduction } from '@/lib/utils/environment';
import {
  createSubscriptionAction,
  forceAcceptAgreementAction,
  validatePromoCodeAction,
} from '../actions';
import { OrderFlowShell } from '@/components/order-flow/OrderFlowShell';
import { Breakdown, PriceDisclaimer, Section } from '@/components/order-flow/primitives';

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Ukentlig',
  biweekly: 'Annenhver uke',
  monthly: 'Månedlig',
};

const EMPTY_SELECTION: OrderSelection = {
  bags: 0,
  beddingSets: 0,
  everydayItems: 0,
  formalItems: 0,
  ironBedding: false,
};

function formatPickupDate(iso: string | undefined): string {
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

function selectionSummary(sel: OrderSelection): string {
  return (
    [
      sel.bags > 0 && `${sel.bags} ${sel.bags === 1 ? 'pose' : 'poser'} klær`,
      sel.beddingSets > 0 && `${sel.beddingSets} sett sengetøy`,
      sel.everydayItems > 0 && `${sel.everydayItems} vanlige plagg strøket`,
      sel.formalItems > 0 && `${sel.formalItems} skjorter/kjoler strøket`,
      sel.ironBedding && 'stryking av sengetøy',
    ]
      .filter(Boolean)
      .join(' · ') || '—'
  );
}

export default function ConfirmPage() {
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const updateOrderData = useOrderFlowStore((state) => state.updateOrderData);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  // Auto-accept bypasses the Vipps approval flow and is only available outside
  // production. In production this stays false so users always go through Vipps.
  const showAutoAccept = isNonProduction();
  const [autoAccept, setAutoAccept] = useState(showAutoAccept);

  // Promo code state
  const [promoInput, setPromoInput] = useState(orderData?.promoCode ?? '');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>(
    orderData?.promoCode ? 'valid' : 'idle'
  );
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const selection = orderData?.selection ?? EMPTY_SELECTION;
  const price = useMemo(() => calculateCustomerEstimate(selection), [selection]);

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;

    setPromoStatus('validating');
    setPromoMessage(null);

    try {
      const result = await validatePromoCodeAction(code);
      if (result.valid) {
        setPromoStatus('valid');
        setPromoMessage(result.discountLabel ? `Kode lagt til – ${result.discountLabel}` : 'Rabattkode lagt til');
        updateOrderData({ promoCode: code });
      } else {
        setPromoStatus('invalid');
        setPromoMessage(result.error || 'Ugyldig rabattkode');
        updateOrderData({ promoCode: undefined });
      }
    } catch {
      setPromoStatus('invalid');
      setPromoMessage('Kunne ikke validere rabattkoden');
    }
  };

  const handleRemovePromo = () => {
    setPromoInput('');
    setPromoStatus('idle');
    setPromoMessage(null);
    updateOrderData({ promoCode: undefined });
  };

  const handleSubmit = async () => {
    if (!orderData || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const result = await createSubscriptionAction({
        location: orderData.city!,
        selection,
        isRecurring: orderData.isRecurring || false,
        frequency: orderData.frequency || undefined,
        firstPickupDate: orderData.firstPickupDate!,
        pickupAddress: {
          street: orderData.address!.street,
          postalCode: orderData.address!.postalCode,
          city: orderData.city!,
          country: 'Norge',
          specialInstructions: orderData.address!.specialInstructions || undefined,
        },
        promoCode: promoStatus === 'valid' ? promoInput.trim() || undefined : undefined,
      });

      if (result.displayError) {
        alert(result.displayError);
      }

      if (result.error) {
        throw new Error(result.error || 'Failed to create subscription');
      }

      if (autoAccept && result.agreementId) {
        // Auto-accept flow (non-production)
        const acceptResult = await forceAcceptAgreementAction(result.agreementId);

        if (acceptResult.success) {
          router.push('/orders/success');
        } else {
          alert(acceptResult.error || 'Auto-godkjenning feilet');
          setIsSubmitting(false);
        }
      } else {
        // Normal Vipps redirect flow
        setRedirecting(true);
        window.location.href = result.redirectUrl!;
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      alert('Det oppstod en feil. Vennligst prøv igjen.');
      setRedirecting(false);
      setIsSubmitting(false);
    }
  };

  const address = orderData?.address;

  return (
    <OrderFlowShell
      step={3}
      price={price}
      canAdvance={price.hasItems && !!orderData?.city && !!orderData?.firstPickupDate}
      onAdvance={handleSubmit}
      isSubmitting={isSubmitting}
    >
      <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
        <SummaryRow
          icon={<Package className="size-5" />}
          title="Dette sender du"
          value={selectionSummary(selection)}
        />
        <SummaryRow
          icon={<MapPin className="size-5" />}
          title="Henting & levering"
          value={
            address?.street
              ? `${address.street}, ${address.postalCode} ${orderData?.city ?? ''}`.trim()
              : '—'
          }
          note={address?.specialInstructions || undefined}
        />
        <SummaryRow
          icon={<CalendarDays className="size-5" />}
          title="Første henting"
          value={formatPickupDate(orderData?.firstPickupDate)}
        />
        <SummaryRow
          icon={<RefreshCw className="size-5" />}
          title="Hyppighet"
          value={
            orderData?.isRecurring && orderData.frequency
              ? `Fast – ${FREQUENCY_LABELS[orderData.frequency]}`
              : 'Én gang'
          }
        />
      </div>

      <Section
        delay={120}
        icon={<Tag className="size-5" />}
        title="Rabattkode"
        subtitle="Har du en kode? (valgfritt)"
      >
        <div className="flex gap-2">
          <input
            id="promoCode"
            type="text"
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value);
              if (promoStatus !== 'idle') {
                setPromoStatus('idle');
                setPromoMessage(null);
              }
            }}
            disabled={promoStatus === 'valid'}
            className="min-w-0 flex-1 rounded-2xl border border-cream-dark bg-white px-4 py-3 uppercase text-dark-gray outline-none transition-colors placeholder:normal-case placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50 disabled:text-medium-gray"
          />
          {promoStatus === 'valid' ? (
            <button
              type="button"
              onClick={handleRemovePromo}
              className="shrink-0 rounded-2xl border border-cream-dark bg-white px-4 py-3 font-medium text-medium-gray transition-colors hover:border-sea-green/50 hover:text-dark-gray"
            >
              Fjern
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApplyPromo}
              disabled={!promoInput.trim() || promoStatus === 'validating'}
              className="shrink-0 rounded-2xl bg-sea-green px-4 py-3 font-medium text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray"
            >
              {promoStatus === 'validating' ? 'Sjekker …' : 'Bruk'}
            </button>
          )}
        </div>
        {promoMessage && (
          <p className={`mt-2 text-sm ${promoStatus === 'valid' ? 'text-sea-green' : 'text-red-600'}`}>
            {promoMessage}
          </p>
        )}
      </Section>

      <div className="mt-8">
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

        {/* Auto-accept checkbox (non-production environments only) */}
        {showAutoAccept && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <input
              type="checkbox"
              id="autoAccept"
              checked={autoAccept}
              onChange={(e) => setAutoAccept(e.target.checked)}
              className="size-4 rounded border-cream-dark text-sea-green focus:ring-2 focus:ring-sea-green/30"
            />
            <label htmlFor="autoAccept" className="cursor-pointer text-sm text-medium-gray">
              Auto-godkjenn avtale (testmiljø)
            </label>
          </div>
        )}
      </div>

      {/* Full-screen overlay while handing off to Vipps */}
      {redirecting && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-dark-gray/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-white px-6 py-8 shadow-2xl">
            <span
              className="size-7 animate-spin rounded-full border-2 border-cream-dark"
              style={{ borderTopColor: '#FF5B24' }}
            />
            <p className="text-medium-gray">Sender deg til Vipps …</p>
          </div>
        </div>
      )}
    </OrderFlowShell>
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
