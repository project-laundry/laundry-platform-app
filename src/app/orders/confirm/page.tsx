'use client';

// Step 3 — review everything, then hand off to Vipps to approve the payment
// agreement (nothing is charged until the cleaner has priced the pickup).
// The whole flow requires an account (src/proxy.ts sends signed-out visitors to
// signup/login). The login prompt here only shows if the session ended while
// the customer was in the flow; the order lives in localStorage, so they
// continue here afterwards.

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CalendarDays,
  CreditCard,
  LogIn,
  MapPin,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { calculateCustomerEstimate, estimateAfterPromo } from '@/lib/config/pricing';
import { SUBSCRIPTIONS_OFFERED } from '@/lib/config/subscriptions';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import {
  DELIVERY_QUESTION,
  deliveryIfAbsentLabel,
  isDeliveryIfAbsent,
} from '@/lib/config/delivery';
import type { OrderSelection } from '@/types/order-flow';
import { createClient } from '@/lib/supabase/client';
import { withNext } from '@/lib/auth/next-path';
import { track } from '@/lib/analytics/posthog';
import {
  createSubscriptionAction,
  forceAcceptAgreementAction,
  validatePromoCodeAction,
} from '../actions';
import { OrderFlowShell } from '@/components/order-flow/OrderFlowShell';
import { Breakdown, PriceDisclaimer } from '@/components/order-flow/primitives';
import { FormCheckbox } from '@/components/forms/FormCheckbox';

const RETURN_PATH = '/orders/confirm';

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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  // null = not checked yet; the Vipps button stays disabled until we know.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  // Auto-accept bypasses the Vipps approval flow. The checkbox only exists in
  // builds made with NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT=true (local dev and
  // staging); production never sets it. The server action re-checks the same
  // flag plus the Vipps test API, so this is a convenience, not the gate.
  // Keep the literal `process.env.NEXT_PUBLIC_…` read: Next.js only inlines a
  // public var into the client bundle when it is referenced exactly like this.
  const showAutoAccept = process.env.NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT === 'true';
  const [autoAccept, setAutoAccept] = useState(showAutoAccept);
  // Terms + angrerett consent. Deliberately not persisted in the order-flow
  // store: it resets on every visit so the consent stamped on the agreement
  // was given by the signed-in customer in this session.
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Promo code state. The field stays folded behind a link unless a code is
  // already applied — a prominent code box sends people off to hunt for one.
  const [promoOpen, setPromoOpen] = useState(!!orderData?.promoCode);
  const [promoInput, setPromoInput] = useState(orderData?.promoCode ?? '');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>(
    orderData?.promoCode ? 'valid' : 'idle'
  );
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  const selection = orderData?.selection ?? EMPTY_SELECTION;
  const price = useMemo(() => calculateCustomerEstimate(selection), [selection]);
  // Discount preview: only while the code is validated. The terms come from
  // validatePromoCodeAction and live in the order-flow store next to the code.
  const { discountOre, totalOre: discountedTotalOre } = estimateAfterPromo(
    price.totalOre,
    promoStatus === 'valid' ? orderData?.promoTerms : null
  );

  useEffect(() => {
    let cancelled = false;
    createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(!!data.user);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (submitError) {
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [submitError]);

  // Signed-out visitors are normally sent to signup before step 1; count how
  // often the fallback wall on this step still shows.
  useEffect(() => {
    if (signedIn === false) track('checkout_login_wall_shown');
  }, [signedIn]);

  const handleApplyPromo = async () => {
    const code = promoInput.trim();
    if (!code) return;

    setPromoStatus('validating');
    setPromoMessage(null);

    try {
      const result = await validatePromoCodeAction(code);
      track('promo_code_applied', { valid: result.valid, code: code.toUpperCase(), reason: null });
      if (result.valid) {
        setPromoStatus('valid');
        setPromoMessage(result.discountLabel ? `Kode lagt til – ${result.discountLabel}` : 'Rabattkode lagt til');
        updateOrderData({ promoCode: code, promoTerms: result.terms });
      } else {
        setPromoStatus('invalid');
        setPromoMessage(result.error || 'Ugyldig rabattkode');
        updateOrderData({ promoCode: undefined, promoTerms: undefined });
      }
    } catch {
      track('promo_code_applied', { valid: false, code: code.toUpperCase(), reason: 'error' });
      setPromoStatus('invalid');
      setPromoMessage('Kunne ikke sjekke rabattkoden. Prøv igjen.');
    }
  };

  const handleRemovePromo = () => {
    setPromoInput('');
    setPromoStatus('idle');
    setPromoMessage(null);
    updateOrderData({ promoCode: undefined, promoTerms: undefined });
  };

  const handleSubmit = async () => {
    if (!orderData || isSubmitting) return;
    const deliveryIfAbsent = orderData.deliveryIfAbsent;
    if (!isDeliveryIfAbsent(deliveryIfAbsent)) return;

    setSubmitError(null);
    setIsSubmitting(true);

    // While subscriptions aren't offered, never send a recurring choice that
    // an older visit left in localStorage (the server ignores it as well).
    const isRecurring = SUBSCRIPTIONS_OFFERED && (orderData.isRecurring || false);

    try {
      const result = await createSubscriptionAction({
        location: orderData.city!,
        selection,
        isRecurring,
        frequency: isRecurring ? orderData.frequency || undefined : undefined,
        firstPickupDate: orderData.firstPickupDate!,
        pickupAddress: {
          street: orderData.address!.street,
          postalCode: orderData.address!.postalCode,
          city: orderData.city!,
          country: 'Norge',
          specialInstructions: orderData.address!.specialInstructions || undefined,
        },
        deliveryIfAbsent,
        deliveryInstructions: orderData.deliveryInstructions || undefined,
        washInstructions: orderData.washInstructions || undefined,
        promoCode: promoStatus === 'valid' ? promoInput.trim() || undefined : undefined,
        termsAccepted,
      });

      if (result.error) {
        // displayError is the customer-facing reason when there is one
        // (e.g. the promo code no longer applies); otherwise stay generic.
        setSubmitError(result.displayError || 'Det oppstod en feil. Prøv igjen.');
        setIsSubmitting(false);
        return;
      }

      // Sent with sendBeacon: the next line may leave the page for Vipps.
      track(
        'checkout_vipps_started',
        {
          recurring: orderData.isRecurring || false,
          frequency: orderData.frequency || null,
          city: orderData.city ?? null,
          estimate_ore: price.totalOre,
          promo: promoStatus === 'valid',
          auto_accept: autoAccept,
        },
        { beforeNavigation: true }
      );

      if (autoAccept && result.agreementId) {
        // Auto-accept flow (opt-in flag, Vipps test API only)
        const acceptResult = await forceAcceptAgreementAction(result.agreementId);

        if (acceptResult.success) {
          router.push('/orders/success');
        } else {
          setSubmitError(acceptResult.error || 'Auto-godkjenning feilet');
          setIsSubmitting(false);
        }
      } else {
        // Normal Vipps redirect flow
        setRedirecting(true);
        window.location.href = result.redirectUrl!;
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      setSubmitError('Det oppstod en feil. Prøv igjen.');
      setRedirecting(false);
      setIsSubmitting(false);
    }
  };

  const address = orderData?.address;

  return (
    <OrderFlowShell
      step={3}
      price={discountOre > 0 ? { ...price, totalOre: discountedTotalOre } : price}
      canAdvance={
        signedIn === true &&
        price.hasItems &&
        !!orderData?.city &&
        !!orderData?.firstPickupDate &&
        isDeliveryIfAbsent(orderData?.deliveryIfAbsent) &&
        termsAccepted
      }
      onAdvance={handleSubmit}
      isSubmitting={isSubmitting}
    >
      {submitError && (
        <div
          ref={errorRef}
          className="mt-6 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 animate-in fade-in slide-in-from-top-1 duration-300"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {signedIn === false && (
        <div className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur animate-in fade-in slide-in-from-bottom-3 duration-500">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sea-green/12 text-sea-green">
              <LogIn className="size-5" />
            </span>
            <div>
              <h2 className="font-serif text-lg font-semibold leading-none text-dark-gray">
                Logg inn for å fullføre
              </h2>
              <p className="mt-1 text-sm text-medium-gray">
                Bestillingen din er lagret, så du fortsetter her etterpå.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Link
              href={withNext('/auth/login', RETURN_PATH)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Logg inn
            </Link>
            <Link
              href={withNext('/auth/signup', RETURN_PATH)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-cream-dark bg-white px-6 py-3.5 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
            >
              Opprett konto
            </Link>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-700">
        <SummaryRow
          icon={<Package className="size-5" />}
          title="Dette sender du"
          value={selectionSummary(selection)}
          note={orderData?.washInstructions?.trim() || undefined}
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
          masked
        />
        <SummaryRow
          icon={<CalendarDays className="size-5" />}
          title={SUBSCRIPTIONS_OFFERED ? 'Første henting' : 'Henting'}
          value={formatPickupDate(orderData?.firstPickupDate)}
          note={
            orderData?.firstPickupDate
              ? `kl. ${getPickupTimeRangeLabel()}`
              : undefined
          }
        />
        {SUBSCRIPTIONS_OFFERED && (
          <SummaryRow
            icon={<RefreshCw className="size-5" />}
            title="Hyppighet"
            value={
              orderData?.isRecurring && orderData.frequency
                ? `Fast – ${FREQUENCY_LABELS[orderData.frequency]}`
                : 'Én gang'
            }
          />
        )}

        <SummaryRow
          icon={<Truck className="size-5" />}
          title={DELIVERY_QUESTION}
          value={deliveryIfAbsentLabel(orderData?.deliveryIfAbsent)}
          note={orderData?.deliveryInstructions || undefined}
          masked
        />

        {/* The one thing that makes people hesitate at the Vipps button sits
            right here, not under the price list. */}
        <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-sea-green/40 bg-sea-green/5 px-4 py-3">
          <CreditCard className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <p className="text-sm leading-relaxed text-medium-gray">
            Du godkjenner kun en{' '}
            <span className="font-medium text-dark-gray">betalingsavtale</span>{' '}
            nå – ingenting trekkes før tøyet er hentet og priset.
          </p>
        </div>
      </div>

      <div
        className="mt-8 animate-in fade-in slide-in-from-bottom-3 duration-700"
        style={{ animationDelay: '120ms' }}
      >
        <h2 className="mb-3 font-serif text-xl font-semibold text-dark-gray">
          Prisoversikt
        </h2>
        <Breakdown
          price={price}
          discount={
            discountOre > 0
              ? { code: promoInput.trim().toUpperCase(), amountOre: discountOre }
              : undefined
          }
        />
        <PriceDisclaimer />

        {/* Promo code: a link until opened, so it doesn't invite a code hunt. */}
        <div className="mt-4">
          {!promoOpen ? (
            <button
              type="button"
              onClick={() => setPromoOpen(true)}
              className="text-sm font-medium text-sea-green underline-offset-2 hover:underline"
            >
              Har du en rabattkode?
            </button>
          ) : (
            <div className="animate-in fade-in slide-in-from-top-1 duration-300">
              <label htmlFor="promoCode" className="mb-1.5 block text-sm font-medium text-dark-gray">
                Rabattkode
              </label>
              <div className="flex gap-2">
                <input
                  id="promoCode"
                  type="text"
                  autoFocus={!orderData?.promoCode}
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
            </div>
          )}
        </div>

        {/* Required consent: sales terms + privacy policy + the express request
            to start within the angrefrist (angrerettloven § 22 c). The Vipps
            button stays disabled until this is ticked; the server action
            rejects a checkout without it. */}
        <div className="mt-6">
          <FormCheckbox
            checked={termsAccepted}
            onChange={setTermsAccepted}
            label={
              <>
                Jeg aksepterer{' '}
                <Link
                  href="/salgsvilkar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-nordic-blue underline-offset-2 hover:underline"
                >
                  salgsvilkårene
                </Link>{' '}
                og{' '}
                <Link
                  href="/personvern"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-nordic-blue underline-offset-2 hover:underline"
                >
                  personvernerklæringen
                </Link>
                , og ber om at tjenesten starter før angrefristen på 14 dager er ute. Jeg er
                klar over at angreretten faller bort når vasken er fullført.
              </>
            }
          />
        </div>

        {/* Auto-accept checkbox — only in builds with NEXT_PUBLIC_VIPPS_ALLOW_FORCE_ACCEPT=true */}
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
  masked = false,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  note?: string;
  /** Personal data (the address): hidden in session replay recordings. */
  masked?: boolean;
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
        <p className="mt-0.5 font-medium text-dark-gray" data-ph-mask={masked ? '' : undefined}>
          {value}
        </p>
        {note && (
          <p className="mt-0.5 text-sm text-medium-gray" data-ph-mask={masked ? '' : undefined}>
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
