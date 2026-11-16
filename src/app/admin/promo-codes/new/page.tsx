import { BackLink } from '@/components/layout/AppHeader';
import { PromoCodeForm } from '../PromoCodeForm';
import { requireRole } from '@/lib/auth/require-role';

export default async function NewPromoCodePage() {
  await requireRole(['admin']);
  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/promo-codes" label="Rabattkoder" />
      </div>
      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Ny rabattkode
      </h1>
      <div className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <PromoCodeForm mode="create" />
      </div>
    </div>
  );
}
