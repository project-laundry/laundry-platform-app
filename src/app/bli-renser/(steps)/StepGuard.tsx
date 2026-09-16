'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';
import type { CleanerOnboardingData } from '@/types/cleaner-flow';

const START_ROUTE = '/bli-renser/business';

type StoredData = Partial<CleanerOnboardingData> | null;

// What must already be in the store to be on each step (cumulative).
const ROUTE_REQUIREMENTS: Record<string, (data: StoredData) => boolean> = {
  '/bli-renser/business': () => true,
  '/bli-renser/services': (d) => !!d?.businessType,
  '/bli-renser/equipment': (d) => !!d?.businessType && !!d?.baseStreet,
  '/bli-renser/profile': (d) => !!d?.businessType && !!d?.baseStreet && !!d?.machineBrand,
  '/bli-renser/confirm': (d) =>
    !!d?.businessType && !!d?.baseStreet && !!d?.machineBrand && !!d?.displayName,
};

export function StepGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const cleanerData = useCleanerOnboardingStore((state) => state.cleanerData);
  const hasHydrated = useCleanerOnboardingStore((state) => state._hasHydrated);

  useEffect(() => {
    // Wait for sessionStorage rehydration — before it the store is always empty.
    if (!hasHydrated) return;

    const requirementCheck = ROUTE_REQUIREMENTS[pathname];
    if (requirementCheck && !requirementCheck(cleanerData)) {
      router.replace(START_ROUTE);
    }
  }, [pathname, cleanerData, hasHydrated, router]);

  return <>{children}</>;
}
