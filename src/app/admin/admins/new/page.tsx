import { BackLink } from '@/components/layout/AppHeader';
import { AdminUserForm } from '../AdminUserForm';

export default function NewAdminPage() {
  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/admins" label="Administratorer" />
      </div>
      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Ny administrator
      </h1>
      <div className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <AdminUserForm mode="create" />
      </div>
    </div>
  );
}
