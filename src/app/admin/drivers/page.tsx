import Link from 'next/link';
import { ChevronRight, Inbox, Plus } from 'lucide-react';
import { getAllDriversWithUser } from '@/lib/database/drivers';

export default async function AdminDriversPage() {
  const drivers = await getAllDriversWithUser();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Sjåfører
          </h1>
        </div>
        <Link
          href="/admin/drivers/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-cream-dark bg-white px-4 py-2 text-sm font-medium text-nordic-blue transition-all hover:border-sea-green hover:text-sea-green active:scale-[0.98]"
        >
          <Plus className="size-4" />
          Ny sjåfør
        </Link>
      </div>

      {drivers.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
          <Inbox className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Ingen sjåfører registrert</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <ul className="divide-y divide-cream-dark/60">
            {drivers.map((driver) => {
              const hasStartPoint =
                driver.start_latitude !== null && driver.start_longitude !== null;
              return (
                <li key={driver.id}>
                  <Link
                    href={`/admin/drivers/${driver.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-cream/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-dark-gray">
                        {driver.user.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-medium-gray">
                        {driver.user.email} · {driver.user.phone}
                      </p>
                      <p className="mt-0.5 text-xs text-medium-gray">
                        {driver.city} · Startpunkt:{' '}
                        {hasStartPoint
                          ? driver.start_label || 'Egendefinert'
                          : 'Sentrum (standard)'}
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
