import { notFound } from 'next/navigation';
import { BackLink } from '@/components/layout/AppHeader';
import { getDriverWithUserById } from '@/lib/database/drivers';
import { DriverForm } from '../DriverForm';

export default async function EditDriverPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = await params;

  const driver = await getDriverWithUserById(driverId);
  if (!driver) {
    notFound();
  }

  const hasStartPoint = driver.start_latitude !== null && driver.start_longitude !== null;

  return (
    <div className="mx-auto max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
      <div className="mb-4">
        <BackLink href="/admin/drivers" label="Sjåfører" />
      </div>
      <h1 className="font-serif text-4xl font-semibold leading-tight text-dark-gray">
        {driver.user.full_name}
      </h1>
      <div className="mt-6 rounded-3xl border border-cream-dark/80 bg-warm-white/80 p-5 shadow-[var(--shadow-card)] backdrop-blur">
        <DriverForm
          mode="edit"
          driverId={driver.id}
          initial={{
            full_name: driver.user.full_name,
            email: driver.user.email,
            phone: driver.user.phone,
            city: driver.city === 'Oslo' ? 'Oslo' : 'Bergen',
          }}
          currentStartLabel={hasStartPoint ? driver.start_label : null}
        />
      </div>
    </div>
  );
}
