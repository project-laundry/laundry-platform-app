import Link from 'next/link';
import { ChevronRight, Inbox, Plus } from 'lucide-react';
import {
  getAllPromoCodesWithRedemptionCount,
  type PromoCodeWithRedemptionCount,
} from '@/lib/database/promo-codes';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import { formatKr } from '@/lib/config/pricing';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function describeDiscount(code: PromoCodeWithRedemptionCount): string {
  if (code.discount_type === 'fixed') return formatKr(code.discount_value);
  return code.max_discount_ore === null
    ? `${code.discount_value} %`
    : `${code.discount_value} % (maks ${formatKr(code.max_discount_ore)})`;
}

function describeValidity(code: PromoCodeWithRedemptionCount): string | null {
  if (code.valid_from && code.valid_until) {
    return `${formatDate(code.valid_from)} – ${formatDate(code.valid_until)}`;
  }
  if (code.valid_from) return `Fra ${formatDate(code.valid_from)}`;
  if (code.valid_until) return `Til ${formatDate(code.valid_until)}`;
  return null;
}

function statusFor(code: PromoCodeWithRedemptionCount): {
  label: string;
  variant: 'success' | 'info' | 'warning' | 'neutral';
} {
  const now = new Date();
  if (!code.active) return { label: 'Inaktiv', variant: 'neutral' };
  if (code.valid_until && new Date(code.valid_until) < now) {
    return { label: 'Utløpt', variant: 'warning' };
  }
  if (code.max_redemptions !== null && code.redemption_count >= code.max_redemptions) {
    return { label: 'Brukt opp', variant: 'warning' };
  }
  if (code.valid_from && new Date(code.valid_from) > now) {
    return { label: 'Kommer', variant: 'info' };
  }
  return { label: 'Aktiv', variant: 'success' };
}

export default async function AdminPromoCodesPage() {
  const codes = await getAllPromoCodesWithRedemptionCount();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Rabattkoder
          </h1>
        </div>
        <Link
          href="/admin/promo-codes/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Ny rabattkode
        </Link>
      </div>

      {codes.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
          <Inbox className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Ingen rabattkoder opprettet</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <ul className="divide-y divide-cream-dark/60">
            {codes.map((code) => {
              const status = statusFor(code);
              const validity = describeValidity(code);
              return (
                <li key={code.id}>
                  <Link
                    href={`/admin/promo-codes/${code.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-cream/50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-dark-gray">{code.code}</p>
                        <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-medium-gray">
                        {describeDiscount(code)}
                        {validity ? ` · ${validity}` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-medium-gray">
                        {code.max_redemptions !== null
                          ? `${code.redemption_count} av ${code.max_redemptions} brukt`
                          : `${code.redemption_count} brukt`}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-medium-gray" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
