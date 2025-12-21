'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useCleanerOnboardingStore } from '@/stores/cleaner-onboarding-store';

const PROTECTED_ROUTES = [
  '/bli-renser/business',
  '/bli-renser/services',
  '/bli-renser/equipment',
  '/bli-renser/profile',
  '/bli-renser/confirm'
];

const START_ROUTE = '/bli-renser/signup';

export default function BliRenserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hasRequiredData = useCleanerOnboardingStore((state) => state.hasRequiredData());

  useEffect(() => {
    // Check if user accessed protected route without starting flow
    if (PROTECTED_ROUTES.includes(pathname) && !hasRequiredData) {
      router.replace(START_ROUTE);
    }
  }, [pathname, hasRequiredData, router]);

  return <>{children}</>;
}
