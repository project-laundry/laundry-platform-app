import { notFound } from 'next/navigation';
import { BackLink } from '@/components/layout/AppHeader';
import { getUserByIdAsAdmin } from '@/lib/database/users';
import { AdminUserForm } from '../AdminUserForm';
import { AdminActiveButton } from '../AdminActiveButton';
import { requireRole } from '@/lib/auth/require-role';

export default async function EditAdminPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { authUserId } = await requireRole(['admin']);
  const { userId } = await params;

  const user = await getUserByIdAsAdmin(userId);
  if (!user || user.role !== 'admin') {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/admins" label="Administratorer" />
      </div>
      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        {user.full_name}
      </h1>
      <div className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <AdminUserForm
          mode="edit"
          userId={user.id}
          initial={{ full_name: user.full_name, email: user.email, phone: user.phone }}
        />
      </div>
      <div className="mt-5 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <h2 className="font-serif text-lg font-semibold text-dark-gray">Tilgang</h2>
        <p className="mt-2 text-sm text-medium-gray">
          {user.deleted_at
            ? 'Kontoen er deaktivert. Den kan ikke logge inn og får ingen e-poster til administratorer.'
            : 'Kontoen er aktiv: den kan logge inn i admin og får e-postene til administratorer.'}
        </p>
        {user.id === authUserId ? (
          <p className="mt-3 text-sm text-medium-gray">Du kan ikke deaktivere din egen konto.</p>
        ) : (
          <div className="mt-3">
            <AdminActiveButton userId={user.id} active={!user.deleted_at} />
          </div>
        )}
      </div>
    </div>
  );
}
