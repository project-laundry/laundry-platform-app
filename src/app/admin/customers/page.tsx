import Link from 'next/link';
import { ChevronRight, Inbox } from 'lucide-react';
import { getAllCustomersWithUser } from '@/lib/database/customers';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('no-NO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function AdminCustomersPage() {
  const customers = await getAllCustomersWithUser();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Kunder
      </h1>

      {customers.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-cream-dark/80 bg-warm-white/80 px-5 py-10 text-center shadow-[var(--shadow-card)] backdrop-blur">
          <Inbox className="size-8 text-cream-dark" />
          <p className="text-medium-gray">Ingen kunder registrert</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-cream-dark/80 bg-warm-white/80 shadow-[var(--shadow-card)] backdrop-blur">
          <ul className="divide-y divide-cream-dark/60">
            {customers.map((customer) => (
              <li key={customer.id}>
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-cream/50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-dark-gray">
                      {customer.user.full_name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-medium-gray">
                      {customer.user.email} · {customer.user.phone}
                    </p>
                    <p className="mt-0.5 text-xs text-medium-gray">
                      Kunde siden {formatDate(customer.created_at)}
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
