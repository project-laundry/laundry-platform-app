import Link from 'next/link';
import { ClipboardList, CreditCard, Shirt, Truck, Users } from 'lucide-react';
import { getAdminOverviewCounts } from '@/lib/database/admin-stats';

export default async function AdminOverviewPage() {
  const counts = await getAdminOverviewCounts();

  const tiles = [
    {
      href: '/admin/orders?status=venter',
      label: 'Venter tildeling',
      value: counts.pendingAssignmentOrders,
      icon: ClipboardList,
      alert: counts.pendingAssignmentOrders > 0,
    },
    {
      href: '/admin/orders',
      label: 'Aktive ordre',
      value: counts.activeOrders,
      icon: ClipboardList,
      alert: false,
    },
    {
      href: '/admin/cleaners',
      label: 'Rensere venter godkjenning',
      value: counts.pendingCleaners,
      icon: Shirt,
      alert: counts.pendingCleaners > 0,
    },
    {
      href: '/admin/payments?status=failed',
      label: 'Feilede betalinger',
      value: counts.failedPayments,
      icon: CreditCard,
      alert: counts.failedPayments > 0,
    },
    {
      href: '/admin/customers',
      label: 'Kunder',
      value: counts.customers,
      icon: Users,
      alert: false,
    },
    {
      href: '/admin/drivers',
      label: 'Sjåfører',
      value: counts.drivers,
      icon: Truck,
      alert: false,
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Admin</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
        Oversikt
      </h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(({ href, label, value, icon: Icon, alert }) => (
          <Link
            key={label}
            href={href}
            className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur transition-all hover:border-sea-green/50"
          >
            <span
              className={`flex size-9 items-center justify-center rounded-full ${
                alert ? 'bg-amber-50 text-amber-800' : 'bg-sea-green/12 text-sea-green'
              }`}
            >
              <Icon className="size-5" />
            </span>
            <p className="mt-3 font-serif text-2xl font-semibold tabular-nums text-dark-gray">
              {value}
            </p>
            <p className="text-sm text-medium-gray">{label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
