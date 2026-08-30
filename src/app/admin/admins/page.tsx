import Link from 'next/link';
import { ChevronRight, Inbox, Plus } from 'lucide-react';
import { getUsersByRole } from '@/lib/database/users';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminAdminsPage() {
  const admins = await getUsersByRole('admin');

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Administratorer
          </h1>
        </div>
        <Link
          href="/admin/admins/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Ny administrator
        </Link>
      </div>

      {admins.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
          <Inbox className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Ingen administratorer registrert</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <ul className="divide-y divide-cream-dark/60">
            {admins.map((admin) => (
              <li key={admin.id}>
                <Link
                  href={`/admin/admins/${admin.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-cream/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-dark-gray">
                      {admin.full_name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-medium-gray">
                      {admin.email} · {admin.phone}
                    </p>
                    <p className="mt-0.5 text-xs text-medium-gray">
                      Opprettet {formatDate(admin.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-medium-gray" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
