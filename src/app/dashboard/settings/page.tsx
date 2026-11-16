import { redirect } from 'next/navigation';
import { KeyRound, MapPin, UserRound } from 'lucide-react';
import { AppHeader, BackLink } from '@/components/layout/AppHeader';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { requireRole } from '@/lib/auth/require-role';
import { getCustomerByUserId } from '@/lib/database/customers';
import { getActiveSubscriptionByCustomerId } from '@/lib/database/subscriptions';
import { getActiveOrdersBySubscriptionId } from '@/lib/database/orders';
import { SettingsSection } from './SettingsSection';
import { ContactForm } from './ContactForm';
import { PasswordForm } from './PasswordForm';
import { SubscriptionAddressForm } from './SubscriptionAddressForm';

export default async function CustomerSettingsPage() {
  // Customers only; other roles are sent to /dashboard, which routes them on.
  const { authUserId, dbUser } = await requireRole(['customer']);

  const customer = await getCustomerByUserId(authUserId);
  if (!customer) {
    redirect('/auth/signup');
  }

  // getActiveSubscriptionByCustomerId also returns pending_payment rows —
  // the address section only makes sense for an active subscription.
  const subscription = await getActiveSubscriptionByCustomerId(customer.id);
  const address =
    subscription?.status === 'active' ? (subscription.order_defaults?.initial_address ?? null) : null;
  const locationCity = subscription?.order_defaults?.location_city ?? null;

  let hasUpcomingOrder = false;
  if (subscription && address) {
    const activeOrders = await getActiveOrdersBySubscriptionId(subscription.id);
    hasUpcomingOrder = activeOrders.some(
      (order) => order.status === 'pending_assignment' || order.status === 'pickup_scheduled'
    );
  }

  // Signup stores +47 + 8 digits; staff-created rows may lack the prefix.
  const phoneDigits = dbUser.phone.replace(/^\+47/, '');

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
              {dbUser.full_name}
            </span>
            <LogoutButton />
          </div>
        }
      />

      <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
        <div className="mb-4">
          <BackLink href="/dashboard" label="Tilbake til dashbord" />
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Kunde</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Min konto
          </h1>
        </div>

        <SettingsSection icon={<UserRound className="size-5" />} title="Kontaktinformasjon">
          <ContactForm
            initialFullName={dbUser.full_name}
            initialPhoneDigits={phoneDigits}
            email={dbUser.email}
          />
        </SettingsSection>

        <SettingsSection icon={<KeyRound className="size-5" />} title="Passord">
          <PasswordForm />
        </SettingsSection>

        <SettingsSection icon={<MapPin className="size-5" />} title="Henteadresse for abonnementet">
          {address && locationCity ? (
            <SubscriptionAddressForm
              initialStreet={address.street}
              initialPostalCode={address.postal_code}
              locationCity={locationCity}
              initialSpecialInstructions={address.special_instructions ?? ''}
              hasUpcomingOrder={hasUpcomingOrder}
            />
          ) : (
            <p className="text-sm text-medium-gray">
              Du har ikke et aktivt abonnement. Adressen for enkeltbestillinger endrer du fra
              bestillingssiden.
            </p>
          )}
        </SettingsSection>
      </main>
    </div>
  );
}
