import { redirect } from 'next/navigation';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { createClient } from '@/lib/supabase/server';
import { getCleanerByUserId } from '@/lib/database/cleaners';
import { getUsersById } from '@/lib/database/users';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { CleanerSettingsForm } from './CleanerSettingsForm';

export default async function CleanerSettingsPage() {
  // Same guard as the cleaner dashboard: any cleaner with a profile may edit,
  // regardless of verification status.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const dbUser = await getUsersById(user.id);
  if (!dbUser || dbUser.role !== 'cleaner') {
    redirect('/dashboard');
  }

  const cleaner = await getCleanerByUserId(user.id);
  if (!cleaner) {
    redirect('/bli-renser/business');
  }

  return (
    <div className="min-h-screen bg-cream text-dark-gray">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% -10%, hsl(var(--sea-green) / 0.16), transparent 60%), radial-gradient(90% 60% at 110% 10%, hsl(var(--nordic-blue) / 0.10), transparent 55%)',
        }}
      />

      <AppHeader
        maxWidth="max-w-2xl"
        right={
          <div className="flex items-center gap-4">
            <span className="text-sm text-medium-gray">{cleaner.display_name}</span>
            <LogoutButton />
          </div>
        }
      />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <div className="mb-4">
          <BackLink href="/dashboard/cleaner" label="Tilbake til dashboard" />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">
            Renser
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Innstillinger
          </h1>
        </div>

        <CleanerSettingsForm cleaner={cleaner} />
      </main>
    </div>
  );
}
