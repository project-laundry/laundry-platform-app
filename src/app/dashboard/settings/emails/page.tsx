import { redirect } from 'next/navigation';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { getViewer, getViewerCustomer } from '@/lib/auth/view-as';
import { EMAIL_PREFERENCES_PATH } from '@/lib/config/email-preferences';
import { EmailPreferencesForm } from './EmailPreferencesForm';

export const metadata = { title: 'E-poster – NooraCare' };

export default async function EmailPreferencesPage() {
  // Signed-out customers come from the link in an e-mail: send them through
  // login and back here (requireRole would drop the return path).
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/auth/login?next=${encodeURIComponent(EMAIL_PREFERENCES_PATH)}`);
  }
  if (viewer.dbUser.role !== 'customer') {
    redirect('/dashboard');
  }
  const customer = await getViewerCustomer(viewer);
  if (!customer) {
    redirect('/auth/signup');
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
        right={
          <div className="flex items-center gap-4">
            <span className="hidden text-sm font-medium text-medium-gray sm:block">
              {viewer.dbUser.full_name}
            </span>
            <LogoutButton />
          </div>
        }
      />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <div className="mb-4">
          <BackLink href="/dashboard/settings" label="Tilbake til Min konto" />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Min konto</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            E-poster
          </h1>
        </div>

        <p className="mt-3 text-medium-gray">
          Velg hvilke e-poster du vil ha fra oss. Noen sendes alltid, fordi de bekrefter bestillingen,
          prisen eller en endring.
        </p>
        <EmailPreferencesForm initial={customer.email_preferences ?? {}} />
      </main>
    </div>
  );
}
