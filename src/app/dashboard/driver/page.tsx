import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { LogoutButton } from '@/components/ui/LogoutButton';
import { requireRole } from '@/lib/auth/require-role';
import { getDriverByUserId } from '@/lib/database/drivers';
import { getDriverRouteOrders } from '@/lib/database/orders';
import { buildDriverStops } from '@/lib/services/driver-route';
import { toISODateString } from '@/lib/utils/date';
import type { Coord } from '@/lib/utils/route';
import { DriverRouteView } from './components/DriverRouteView';

const cityKey = (city: string) => city.trim().toLowerCase();

export default async function DriverDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { authUserId, dbUser } = await requireRole(['driver', 'admin']);
  const { city: cityParam } = await searchParams;

  const firstName = (dbUser.full_name || 'Sjåfør').split(' ')[0];

  // Drivers are bound to the one city on their profile (decision 9); admins
  // are not city-bound and get city pills instead.
  const driverProfile =
    dbUser.role === 'driver' ? await getDriverByUserId(authUserId) : null;

  if (dbUser.role === 'driver' && !driverProfile) {
    return (
      <div className="min-h-screen bg-cream text-dark-gray">
        <AppHeader right={<LogoutButton />} />
        <main className="mx-auto max-w-2xl px-5 py-16">
          <div className="rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-8 text-center shadow-[var(--shadow-card)] backdrop-blur">
            <p className="font-serif text-lg font-semibold text-dark-gray">
              Sjåførprofilen din er ikke satt opp ennå
            </p>
            <p className="mt-1 text-medium-gray">
              Kontakt administrator for å få tildelt by og startpunkt.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const todayISO = toISODateString(new Date());
  const routeOrders = await getDriverRouteOrders(todayISO);

  let selectedCityKey: string | null;
  let cityOptions: { key: string; label: string; count: number }[] = [];

  if (driverProfile) {
    selectedCityKey = cityKey(driverProfile.city);
  } else {
    // Admin: one pill per city that has stops today, defaulting to the busiest.
    const cityCounts = new Map<string, { label: string; count: number }>();
    for (const order of routeOrders) {
      const key = cityKey(order.city);
      const entry = cityCounts.get(key) ?? { label: order.city.trim(), count: 0 };
      entry.count += 1;
      cityCounts.set(key, entry);
    }
    cityOptions = [...cityCounts.entries()]
      .map(([key, value]) => ({ key, label: value.label, count: value.count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'no'));

    const requestedKey = cityParam ? cityKey(cityParam) : null;
    selectedCityKey =
      requestedKey && cityCounts.has(requestedKey) ? requestedKey : (cityOptions[0]?.key ?? null);
  }

  const ordersInCity = selectedCityKey
    ? routeOrders.filter((order) => cityKey(order.city) === selectedCityKey)
    : [];
  const { stops, skippedOrderNumbers } = buildDriverStops(ordersInCity, todayISO);

  // Stored start point (drivers only; admins start from the city centre).
  const initialStart: Coord | null =
    driverProfile &&
    driverProfile.start_latitude !== null &&
    driverProfile.start_longitude !== null
      ? { latitude: driverProfile.start_latitude, longitude: driverProfile.start_longitude }
      : null;
  const startLabel = (initialStart && driverProfile?.start_label) || 'Sentrum';

  return (
    <div className="min-h-screen bg-cream pb-28 text-dark-gray">
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
        right={
          <div className="flex items-center gap-4">
            {dbUser.role === 'admin' && (
              <Link
                href="/admin/orders"
                className="text-sm font-medium text-nordic-blue hover:underline"
              >
                Admin
              </Link>
            )}
            <span className="hidden text-sm font-medium text-medium-gray sm:block">
              {dbUser.full_name}
            </span>
            <LogoutButton />
          </div>
        }
      />

      <main className="mx-auto max-w-2xl px-5 py-6">
        <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-sea-green">Sjåfør</p>
          <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-dark-gray">
            Hei, {firstName}!
          </h1>
        </div>

        <div className="mt-6">
          <DriverRouteView
            stops={stops}
            cityOptions={cityOptions}
            selectedCityKey={selectedCityKey}
            initialStart={initialStart}
            startLabel={startLabel}
            skippedOrderNumbers={skippedOrderNumbers}
          />
        </div>
      </main>
    </div>
  );
}
