'use client';

// Step 3 — review everything, then hand off to Vipps to approve the payment
// agreement (nothing is charged until the cleaner has priced the pickup).
// Steps 1–2 work logged out; this step asks the visitor to log in first, and
// the login/signup pages bring them back here (the order lives in localStorage).

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
} from 'lucide-react';
import { useOrderFlowStore } from '@/stores/order-flow-store';
import { calculateCustomerEstimate } from '@/lib/config/pricing';
import type { OrderSelection } from '@/types/order-flow';
import { isNonProduction } from '@/lib/utils/environment';
import { createClient } from '@/lib/supabase/client';
import { withNext } from '@/lib/auth/next-path';
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
  // Auto-accept bypasses the Vipps approval flow and is only available outside
  // production. In production this stays false so users always go through Vipps.
  const showAutoAccept = isNonProduction();
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
      setPromoMessage('Kunne ikke sjekke rabattkoden. Prøv igjen.');
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

    setSubmitError(null);
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
        termsAccepted,
      });

      if (result.error) {
        // displayError is the customer-facing reason when there is one
        // (e.g. the promo code no longer applies); otherwise stay generic.
        setSubmitError(result.displayError || 'Det oppstod en feil. Prøv igjen.');
        setIsSubmitting(false);
        return;
      }

      if (autoAccept && result.agreementId) {
        // Auto-accept flow (non-production)
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
      price={price}
      canAdvance={
        signedIn === true &&
        price.hasItems &&
        !!orderData?.city &&
        !!orderData?.firstPickupDate &&
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
        <Breakdown price={price} />
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
