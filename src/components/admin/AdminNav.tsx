'use client';

// Section navigation for the admin area, rendered by app/admin/layout.tsx.
// A dense, horizontally scrollable pill row — mobile first.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SECTIONS = [
  { href: '/admin', label: 'Oversikt' },
  { href: '/admin/orders', label: 'Ordre' },
  { href: '/admin/cleaners', label: 'Rensere' },
  { href: '/admin/customers', label: 'Kunder' },
  { href: '/admin/payments', label: 'Betalinger' },
  { href: '/admin/drivers', label: 'Sjåfører' },
  { href: '/admin/admins', label: 'Administratorer' },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-5 overflow-x-auto px-5" aria-label="Adminseksjoner">
      <div className="flex w-max gap-2 pb-1">
        {SECTIONS.map(({ href, label }) => {
          const active =
            href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-all ${
                active
                  ? 'border-sea-green bg-sea-green/10 text-sea-green'
                  : 'border-cream-dark bg-white text-dark-gray hover:border-sea-green/50'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
