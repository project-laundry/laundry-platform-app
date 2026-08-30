import { notFound } from 'next/navigation';
import { BackLink } from '@/components/layout/AppHeader';
import { getUserByIdAsAdmin } from '@/lib/database/users';
import { AdminUserForm } from '../AdminUserForm';

export default async function EditAdminPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
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
    </div>
  );
}
