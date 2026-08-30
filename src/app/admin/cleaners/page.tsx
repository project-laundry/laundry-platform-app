import { Inbox } from 'lucide-react';
import { getAllCleanersWithUser } from '@/lib/database/cleaners';
import { StatusBadge } from '@/components/dashboard/StatusBadge';
import {
  CLEANER_VERIFICATION_LABELS,
  CLEANER_VERIFICATION_VARIANT,
} from '@/lib/utils/cleaner-status';
import { CleanerActivationButton } from './CleanerActivationButton';

export default async function AdminCleanersPage() {
  const cleaners = await getAllCleanersWithUser();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Rensere
      </h1>

      {cleaners.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
          <Inbox className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Ingen rensere registrert</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <ul className="divide-y divide-cream-dark/60">
            {cleaners.map((cleaner) => (
              <li
                key={cleaner.id}
                className="flex items-start justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-base font-semibold text-dark-gray">
                      {cleaner.display_name}
                    </p>
                    <StatusBadge variant={CLEANER_VERIFICATION_VARIANT[cleaner.verification_status]}>
                      {CLEANER_VERIFICATION_LABELS[cleaner.verification_status]}
                    </StatusBadge>
                    {cleaner.verification_status === 'approved' && !cleaner.is_accepting_orders && (
                      <StatusBadge variant="neutral">Tar ikke imot ordre</StatusBadge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-dark-gray">{cleaner.user.full_name}</p>
                  <p className="mt-0.5 truncate text-sm text-medium-gray">
                    {cleaner.base_city} · {cleaner.user.email} · {cleaner.user.phone}
                  </p>
                </div>
                <CleanerActivationButton
                  cleanerId={cleaner.id}
                  isActive={cleaner.verification_status === 'approved'}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
