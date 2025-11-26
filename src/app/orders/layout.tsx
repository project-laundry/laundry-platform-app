'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';

const PROTECTED_ROUTES = [
  '/orders/additional-services',
  '/orders/schedule',
  '/orders/instructions',
  '/orders/confirm'
];

const START_ROUTE = '/orders/plans';

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hasRequiredData = useOrderFlowStore((state) => state.hasRequiredData());

  useEffect(() => {
    // Check if user accessed protected route without starting flow
    if (PROTECTED_ROUTES.includes(pathname) && !hasRequiredData) {
      router.replace(START_ROUTE);
    }
  }, [pathname, hasRequiredData, router]);

  return <>{children}</>;
}
