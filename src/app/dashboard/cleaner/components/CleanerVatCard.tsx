import { Info } from 'lucide-react';
import { VAT_REGISTRATION_THRESHOLD_ORE, formatKr } from '@/lib/config/pricing';
import { sumCleanerPayoutOreLast12Months } from '@/lib/utils/payout';
import type { OrderWithCustomer } from '@/lib/database/orders';

interface CleanerVatCardProps {
  /** The cleaner's completed/cancelled orders (the dashboard's history list). */
  orders: OrderWithCustomer[];
}

/** Server component: what the cleaner has earned through NooraCare in the last
 *  12 months, held against the VAT registration limit. Only NooraCare income is
 *  known here, so the note says other turnover counts too. */
export function CleanerVatCard({ orders }: CleanerVatCardProps) {
  const earnedOre = sumCleanerPayoutOreLast12Months(orders);
  const percent = Math.min(100, Math.round((earnedOre / VAT_REGISTRATION_THRESHOLD_ORE) * 100));

  return (
    <section className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
      <h2 className="font-serif text-lg font-semibold text-dark-gray">Mva-grensen</h2>

      <div
        role="progressbar"
        aria-label="Opptjent siste 12 måneder mot mva-grensen"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-4 h-3 overflow-hidden rounded-full bg-cream-dark/70"
      >
        <div className="h-full rounded-full bg-sea-green" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-2 flex justify-between gap-3 text-sm tabular-nums text-medium-gray">
        <span>
          <span className="font-medium text-dark-gray">{formatKr(earnedOre)}</span> siste 12 mnd
        </span>
        <span className="shrink-0">Grense {formatKr(VAT_REGISTRATION_THRESHOLD_ORE)}</span>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-2xl bg-cream/70 px-3.5 py-2.5 text-sm text-medium-gray">
        <Info className="mt-0.5 size-4 shrink-0 text-sea-green" />
        <p>
          Du må registrere deg i Merverdiavgiftsregisteret når du har omsatt for over{' '}
          {formatKr(VAT_REGISTRATION_THRESHOLD_ORE)} i løpet av 12 måneder. Her ser du bare det du
          har tjent gjennom NooraCare – har du andre inntekter i virksomheten, teller de også med.
          Husk å sette av til skatt, NooraCare trekker ikke skatt for deg.
        </p>
      </div>
    </section>
  );
}
