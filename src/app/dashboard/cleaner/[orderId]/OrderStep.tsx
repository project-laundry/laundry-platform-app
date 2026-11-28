'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Check, Info, Minus, Navigation, Phone, Plus } from 'lucide-react';
import {
  markOrderReadyForDelivery,
  declineCleanerOrder,
  markOrderPickedUpAction,
  markOrderDeliveredAction,
  saveLaundryDetails,
} from '../actions';
import { IroningQuantityInput } from '../components/IroningQuantityInput';
import {
  type IroningDetails,
  calculateOrderPrice,
  computeDiscountOre,
  getEmptyIroningDetails,
  formatKr,
  formatKrExact,
  isPriceFarAboveEstimate,
  MAX_WASH_LOADS_PER_ORDER,
  OFFERED_IRONING_GROUPS,
  PRICING,
} from '@/lib/config/pricing';
import { deliveryCleanerText } from '@/lib/config/delivery';
import { WASH_RULE_CLEANER_TEXT } from '@/lib/config/washing';
import { getPickupTimeRangeLabel } from '@/lib/config/pickup-times';
import type { DeliveryIfAbsent, OrderPromo } from '@/types/database';

/** The customer's door — shown on the pickup and delivery steps. */
export interface OrderDoor {
  street: string;
  postalCode: string;
  city: string;
  instructions: string | null;
  mapsUrl: string;
  phone: string | null;
}

interface OrderStepProps {
  orderId: string;
  orderNumber: string;
  /** The step the cleaner is on. */
  step: 'pickup' | 'wash' | 'deliver';
  customerFirstName: string;
  door: OrderDoor;
  /** The customer's answer for delivery when nobody is home (null on orders from before the question existed) and their delivery note. */
  delivery: { ifAbsent: DeliveryIfAbsent | null; instructions: string | null };
  /** 'tor. 21. nov. · kl. 15:00 - 18:00' */
  pickupWhen: string;
  /** True from the customer's chosen pickup date onward (Norwegian time). */
  pickupDue: boolean;
  /** What the customer wrote about the laundry itself. */
  washInstructions: string | null;
  needsIroning: boolean;
  initialWashLoads: number;
  initialIroningDetails: IroningDetails | null;
  initialNotes: string | null;
  promo: OrderPromo | null;
  /** orders.total_cost_ore — the amount sent to Vipps at the ready step (drawn on the due date, not at once). */
  totalCostOre: number | null;
  /**
   * True when the ready-step charge failed and no later payment replaced it:
   * the customer has NOT paid. Computed by the page from the payment rows so
   * it survives reloads; the action result sets it instantly on failure.
   */
  chargeFailed: boolean;
  /**
   * True when the ready step created NO charge because the price is far above
   * the customer's estimate and NooraCare reviews it first (price guard).
   * Computed by the page from the order and its payment rows.
   */
  chargeHeld: boolean;
  /** orders.customer_estimate.estimated_total_ore — what the customer expected to pay at checkout. */
  estimatedTotalOre: number | null;
}

const CARD =
  'rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur';

const PRIMARY_BUTTON =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-nordic-blue px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-cream-dark disabled:text-medium-gray disabled:shadow-none';

const SECONDARY_BUTTON =
  'inline-flex w-full items-center justify-center gap-2 rounded-full border border-cream-dark bg-white px-6 py-3.5 font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

const DESTRUCTIVE_BUTTON =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-6 py-3.5 font-medium text-white shadow-soft transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60';

const STEPPER_BUTTON =
  'flex size-11 items-center justify-center rounded-full border border-cream-dark bg-white text-nordic-blue shadow-sm transition-all hover:border-sea-green hover:text-sea-green active:scale-90 disabled:cursor-not-allowed disabled:text-cream-dark disabled:active:scale-100';

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}

/**
 * Address, pickup instructions and the two things to do with them.
 * `instructionsLabel` names the note where it could be misread — on the
 * delivery step the note was written for the pickup.
 */
function Door({ door, instructionsLabel }: { door: OrderDoor; instructionsLabel?: string }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-medium text-dark-gray">{door.street}</p>
        <p className="text-sm text-medium-gray">
          {door.postalCode} {door.city}
        </p>
      </div>
      {door.instructions && (
        <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-dark-gray">
          <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
          <div>
            {instructionsLabel && <p className="font-medium">{instructionsLabel}</p>}
            <p className="whitespace-pre-line">{door.instructions}</p>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <a
          href={door.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-cream-dark bg-white px-4 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green"
        >
          <Navigation className="size-4" />
          Veibeskrivelse
        </a>
        {door.phone && (
          <a
            href={`tel:${door.phone.replace(/\s/g, '')}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-cream-dark bg-white px-4 py-2.5 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green"
          >
            <Phone className="size-4" />
            Ring kunden
          </a>
        )}
      </div>
    </div>
  );
}

/** Second tap of every step: the same two buttons, in the primary button's place. */
function ConfirmRow({
  isLoading,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  isLoading: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onCancel} disabled={isLoading} className={`${SECONDARY_BUTTON} flex-1`}>
        Avbryt
      </button>
      <button type="button" onClick={onConfirm} disabled={isLoading} className={`${PRIMARY_BUTTON} flex-1`}>
        {isLoading ? 'Oppdaterer...' : confirmLabel}
      </button>
    </div>
  );
}

/**
 * The one thing the cleaner does next on an order — pick up, wash or deliver —
 * as a single card with a single primary button. Every button asks once more
 * before it writes, because no step can be undone by the cleaner.
 */
export function OrderStep({
  orderId,
  orderNumber,
  step,
  customerFirstName,
  door,
  delivery,
  pickupWhen,
  pickupDue,
  washInstructions,
  needsIroning,
  initialWashLoads,
  initialIroningDetails,
  initialNotes,
  promo,
  totalCostOre,
  chargeFailed,
  chargeHeld,
  estimatedTotalOre,
}: OrderStepProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [chargeFailedNow, setChargeFailedNow] = useState(false);

  const [washLoads, setWashLoads] = useState(initialWashLoads);
  const [ironingDetails, setIroningDetails] = useState<IroningDetails>(
    initialIroningDetails || getEmptyIroningDetails()
  );
  const [notes, setNotes] = useState(initialNotes || '');
  const [showNotes, setShowNotes] = useState(Boolean(initialNotes));

  const showChargeFailed = chargeFailed || chargeFailedNow;

  const laundryDetails = {
    wash_loads: washLoads,
    ironing_details: needsIroning ? ironingDetails : null,
  };
  const price = calculateOrderPrice(laundryDetails);
  const discountOre = promo ? computeDiscountOre(price.total_ore, promo) : 0;
  const customerPaysOre = Math.max(0, price.total_ore - discountOre);
  // Same rule the server applies in markOrderReadyAndCharge (full price before
  // promo against the estimate): confirming will NOT charge the customer.
  const willHoldCharge =
    customerPaysOre > 0 && isPriceFarAboveEstimate(price.total_ore, estimatedTotalOre);

  // Runs the step's writes in order; stops at the first failure.
  const run = async (
    actions: (() => Promise<{ success: boolean; error?: string; chargeFailed?: boolean }>)[],
    onDone?: () => void
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      for (const action of actions) {
        const result = await action();
        if (!result.success) {
          setError(result.error || 'Kunne ikke oppdatere ordren');
          return;
        }
        if (result.chargeFailed) setChargeFailedNow(true);
      }
      setConfirming(false);
      if (onDone) onDone();
      else router.refresh();
    } catch {
      setError('En feil oppstod');
    } finally {
      setIsLoading(false);
    }
  };

  const errorNote = error && (
    <div className="flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <p>{error}</p>
    </div>
  );

  // Step 1: pick up at the customer's door
  if (step === 'pickup') {
    return (
      <section className={`${CARD} space-y-4`}>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-dark-gray">
            Hent tøyet hos {customerFirstName}
          </h2>
          <p className="mt-1 tabular-nums text-medium-gray">{pickupWhen}</p>
        </div>

        <Door door={door} />

        {!pickupDue && (
          <Warning>
            Hentedatoen er ikke kommet ennå. Hent bare tidligere hvis du har avtalt det med kunden.
          </Warning>
        )}
        {errorNote}

        {declining ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <p className="text-medium-gray">
              Vil du avslå ordre #{orderNumber}? Vi gir oppdraget til en annen renser hvis noen er ledig. Hvis ikke, følger NooraCare det opp.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeclining(false)}
                disabled={isLoading}
                className={`${SECONDARY_BUTTON} flex-1`}
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() =>
                  run([() => declineCleanerOrder(orderId)], () => router.push('/dashboard/cleaner'))
                }
                disabled={isLoading}
                className={`${DESTRUCTIVE_BUTTON} flex-1`}
              >
                {isLoading ? 'Avslår...' : 'Ja, avslå'}
              </button>
            </div>
          </div>
        ) : confirming ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <p className="text-medium-gray">Bekreft at du har hentet tøyet hos kunden.</p>
            <ConfirmRow
              isLoading={isLoading}
              confirmLabel="Bekreft henting"
              onCancel={() => setConfirming(false)}
              onConfirm={() => run([() => markOrderPickedUpAction(orderId)])}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <button type="button" onClick={() => setConfirming(true)} className={PRIMARY_BUTTON}>
              Jeg har hentet tøyet
            </button>
            <p className="text-sm text-medium-gray">
              <button
                type="button"
                onClick={() => setDeclining(true)}
                className="font-medium text-red-600 underline-offset-2 hover:underline"
              >
                Kan du ikke ta oppdraget?
              </button>
            </p>
          </div>
        )}
      </section>
    );
  }

  // Step 2: wash, count the loads, mark ready — which charges the customer
  if (step === 'wash') {
    return (
      <section className={`${CARD} space-y-4`}>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-dark-gray">Vask og tell opp</h2>
          <p className="mt-1 text-medium-gray">
            Én vask er én full maskin, inntil 5 kg. Sengetøy vaskes for seg og teller som egen vask.
          </p>
          <p className="mt-1 text-medium-gray">{WASH_RULE_CLEANER_TEXT}</p>
        </div>

        {washInstructions && (
          <div className="flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-dark-gray">
            <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
            <p className="whitespace-pre-line">
              <span className="font-medium">Fra kunden:</span> {washInstructions}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-dark-gray">Antall vask</p>
            <p className="text-sm tabular-nums text-medium-gray">
              {formatKr(PRICING.price_per_load_ore)} per vask
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-label="Færre"
              onClick={() => setWashLoads(Math.max(0, washLoads - 1))}
              disabled={confirming || washLoads === 0}
              className={STEPPER_BUTTON}
            >
              <Minus className="size-5" />
            </button>
            <span
              aria-live="polite"
              className="w-10 text-center font-serif text-2xl font-semibold tabular-nums text-dark-gray"
            >
              {washLoads}
            </span>
            <button
              type="button"
              aria-label="Flere"
              onClick={() => setWashLoads(washLoads + 1)}
              disabled={confirming || washLoads >= MAX_WASH_LOADS_PER_ORDER}
              className={STEPPER_BUTTON}
            >
              <Plus className="size-5" />
            </button>
          </div>
        </div>

        {needsIroning && (
          <div className="border-t border-cream-dark/60 pt-4">
            <p className="font-medium text-dark-gray">Stryking</p>
            <p className="text-sm text-medium-gray">
              Kunden har bestilt stryking av sengetøy. Tell opp settene du har strøket.
            </p>
            <div className="divide-y divide-cream-dark/60">
              {OFFERED_IRONING_GROUPS.map((category) => (
                <IroningQuantityInput
                  key={category}
                  category={category}
                  value={ironingDetails[category]}
                  onChange={(value) => setIroningDetails((prev) => ({ ...prev, [category]: value }))}
                  disabled={confirming}
                  max={MAX_WASH_LOADS_PER_ORDER}
                />
              ))}
            </div>
          </div>
        )}

        {washLoads > 0 && (
          <div className="rounded-2xl border border-dashed border-sea-green/40 bg-sea-green/5 px-4 py-3 tabular-nums">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-medium text-dark-gray">Du får</span>
              <span className="font-serif text-2xl font-semibold text-dark-gray">
                {formatKrExact(price.cleaner_payout_ore)}
              </span>
            </div>
            <div className="mt-1 flex justify-between gap-3 text-sm text-medium-gray">
              <span>Kunden betaler</span>
              <span>{formatKrExact(customerPaysOre)}</span>
            </div>
            <details className="mt-2 text-sm text-medium-gray">
              <summary className="cursor-pointer font-medium text-sea-green">Vis utregning</summary>
              <dl className="mt-2 space-y-1">
                <div className="flex justify-between gap-3">
                  <dt>{washLoads} vask</dt>
                  <dd>{formatKrExact(price.loads_subtotal_ore)}</dd>
                </div>
                {price.ironing_subtotal_ore > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt>Stryking</dt>
                    <dd>{formatKrExact(price.ironing_subtotal_ore)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <dt>Henting og levering</dt>
                  <dd>{formatKrExact(price.pickup_delivery_ore)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Serviceavgift</dt>
                  <dd>{formatKrExact(price.service_fee_ore)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-sea-green/20 pt-1 text-dark-gray">
                  <dt>{price.minimum_applied ? 'Totalt (minstebeløp)' : 'Totalt'}</dt>
                  <dd>{formatKrExact(price.total_ore)}</dd>
                </div>
                {discountOre > 0 && (
                  <div className="flex justify-between gap-3">
                    <dt>Rabatt{promo ? ` (${promo.code})` : ''}</dt>
                    <dd>−{formatKrExact(discountOre)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-2">
                Du får {PRICING.cleaner_payout_percent} % av totalen
                {discountOre > 0 ? ' – rabatten dekkes av NooraCare, ikke av deg.' : '.'}
              </p>
            </details>
          </div>
        )}

        {showNotes ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-dark-gray">Notat om prisen</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={confirming}
              rows={2}
              placeholder="F.eks. spesielle hensyn, ekstra arbeid..."
              className="w-full resize-none rounded-2xl border border-cream-dark bg-white px-4 py-3 text-dark-gray outline-none transition-colors placeholder:text-medium-gray/60 focus:border-sea-green focus:ring-2 focus:ring-sea-green/20 disabled:bg-cream/50"
            />
          </label>
        ) : (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="font-medium text-sea-green underline-offset-2 hover:underline"
          >
            Legg til notat om prisen
          </button>
        )}

        {errorNote}

        {confirming ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <p className="text-medium-gray">
              {willHoldCharge ? (
                <>
                  Prisen er mye høyere enn det kunden regnet med (ca.{' '}
                  <span className="tabular-nums">{formatKr(estimatedTotalOre ?? 0)}</span>). NooraCare
                  ser over prisen før kunden belastes – sjekk at antall vask stemmer.
                </>
              ) : customerPaysOre > 0 ? (
                <>
                  Prisen sendes til kunden, og Vipps trekker{' '}
                  <span className="font-semibold tabular-nums text-dark-gray">
                    {formatKrExact(customerPaysOre)}
                  </span>{' '}
                  i løpet av et par dager.
                </>
              ) : (
                'Rabatten dekker hele beløpet, så kunden belastes ikke.'
              )}{' '}
              Antall vask kan ikke endres etterpå.
            </p>
            <ConfirmRow
              isLoading={isLoading}
              confirmLabel={customerPaysOre > 0 && !willHoldCharge ? 'Bekreft og belast' : 'Bekreft'}
              onCancel={() => setConfirming(false)}
              onConfirm={() =>
                run([
                  () => saveLaundryDetails(orderId, laundryDetails, notes.trim() || undefined),
                  () => markOrderReadyForDelivery(orderId),
                ])
              }
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={washLoads === 0}
            className={PRIMARY_BUTTON}
          >
            {washLoads === 0 ? 'Tell opp vasken først' : 'Tøyet er klart til levering'}
          </button>
        )}
      </section>
    );
  }

  // Step 3: deliver back to the customer
  return (
    <section className={`${CARD} space-y-4`}>
      <div>
        <h2 className="font-serif text-2xl font-semibold text-dark-gray">
          Lever tøyet til {customerFirstName}
        </h2>
        {/* Same window as the pickup (pickup-times.ts) */}
        <p className="mt-1 tabular-nums text-medium-gray">kl. {getPickupTimeRangeLabel()}</p>
      </div>

      {chargeHeld ? (
        <Warning>
          Prisen er mye høyere enn det kunden regnet med, så NooraCare ser over den før kunden
          belastes. Du leverer tøyet som normalt, og utbetalingen din kommer til vanlig tid.
        </Warning>
      ) : showChargeFailed ? (
        <Warning>
          Belastningen av kunden feilet. Admin følger opp betalingen – du leverer tøyet som normalt.
        </Warning>
      ) : (
        <p className="flex items-center gap-2 text-sm text-sea-green">
          <Check className="size-4 shrink-0" />
          {totalCostOre !== null && totalCostOre > 0
            ? `Betalingen på ${formatKrExact(totalCostOre)} er sendt til Vipps`
            : 'Kunden skal ikke betale noe for denne ordren'}
        </p>
      )}

      <Door door={door} instructionsLabel="Kundens beskjed ved henting" />

      {delivery.ifAbsent ? (
        <div className="rounded-2xl border border-dashed border-sea-green/40 bg-sea-green/5 px-4 py-3 text-sm text-dark-gray">
          <p className="font-medium">Hvis kunden ikke er hjemme</p>
          <p className="mt-0.5">{deliveryCleanerText(delivery.ifAbsent)}</p>
          {delivery.instructions && (
            <p className="mt-2 whitespace-pre-line">
              <span className="font-medium">Beskjed fra kunden om levering:</span>{' '}
              {delivery.instructions}
            </p>
          )}
        </div>
      ) : (
        <Warning>{deliveryCleanerText(null)}</Warning>
      )}
      {errorNote}

      {confirming ? (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
          <p className="text-medium-gray">Bekreft at tøyet er levert. Dette kan ikke angres.</p>
          <ConfirmRow
            isLoading={isLoading}
            confirmLabel="Bekreft levering"
            onCancel={() => setConfirming(false)}
            onConfirm={() => run([() => markOrderDeliveredAction(orderId)])}
          />
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={PRIMARY_BUTTON}>
          Tøyet er levert
        </button>
      )}
    </section>
  );
}
