import { BackLink } from '@/components/layout/AppHeader';
import { DriverForm } from '../DriverForm';
import { requireRole } from '@/lib/auth/require-role';

export default async function NewDriverPage() {
  await requireRole(['admin']);
  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/drivers" label="Sjåfører" />
      </div>
      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Ny sjåfør
      </h1>
      <div className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <DriverForm mode="create" />
      </div>
    </div>
  );
}
