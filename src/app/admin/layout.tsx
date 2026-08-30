import Link from 'next/link';
import { Route } from 'lucide-react';
import { AppHeader } from '@/components/layout/AppHeader';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { AdminNav } from '@/components/admin/AdminNav';
import { requireRole } from '@/lib/auth/require-role';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(['admin']);

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      {/* Atmospheric backdrop — soft sea-green wash over warm cream. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      <AppHeader
        maxWidth="max-w-5xl"
        right={
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/driver"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-nordic-blue hover:underline"
            >
              <Route className="size-4" />
              Kjøreplan
            </Link>
            <LogoutButton />
          </div>
        }
      />

      <main className="mx-auto max-w-5xl px-5 pb-16 pt-6">
        <AdminNav />
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
