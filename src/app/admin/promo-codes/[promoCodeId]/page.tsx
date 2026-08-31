import { notFound } from 'next/navigation';
import { BackLink } from '@/components/layout/AppHeader';
import { getPromoCodeWithRedemptions } from '@/lib/database/promo-codes';
import { PromoCodeForm } from '../PromoCodeForm';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function EditPromoCodePage({
  params,
}: {
  params: Promise<{ promoCodeId: string }>;
}) {
  const { promoCodeId } = await params;

  const promo = await getPromoCodeWithRedemptions(promoCodeId);
  if (!promo) {
    notFound();
  }

  const initial = {
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: String(
      promo.discount_type === 'fixed'
        ? Math.round(promo.discount_value / 100)
        : promo.discount_value
    ),
    max_discount_kr:
      promo.max_discount_ore === null ? '' : String(Math.round(promo.max_discount_ore / 100)),
    valid_from: promo.valid_from ? promo.valid_from.slice(0, 10) : '',
    valid_until: promo.valid_until ? promo.valid_until.slice(0, 10) : '',
    max_redemptions: promo.max_redemptions === null ? '' : String(promo.max_redemptions),
    active: promo.active,
  };

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/promo-codes" label="Rabattkoder" />
      </div>
      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        {promo.code}
      </h1>

      <div className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <PromoCodeForm mode="edit" promoCodeId={promo.id} initial={initial} />
      </div>

      <h2 className="mt-8 font-serif text-2xl font-semibold text-dark-gray">
        Bruk ({promo.redemptions.length})
      </h2>
      {promo.redemptions.length === 0 ? (
        <p className="mt-3 text-medium-gray">Ingen har brukt koden ennå.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <ul className="divide-y divide-cream-dark/60">
            {promo.redemptions.map((redemption) => (
              <li
                key={redemption.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <p className="min-w-0 truncate text-sm text-dark-gray">
                  {redemption.customer?.user.full_name ?? 'Slettet kunde'}
                </p>
                <p className="shrink-0 text-sm text-medium-gray">
                  {formatDate(redemption.redeemed_at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
