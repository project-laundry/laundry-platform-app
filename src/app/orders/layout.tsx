'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';

const START_ROUTE = '/orders/service';

// Define what data is required for each route
const ROUTE_REQUIREMENTS: Record<string, (data: Record<string, unknown> | null) => boolean> = {
  '/orders/service': () => true, // No requirements - entry point
  '/orders/address': (data) => data?.needsIroning !== undefined,
  '/orders/schedule': (data) => !!data?.city && data?.needsIroning !== undefined,
  '/orders/confirm': (data) => !!data?.city && !!data?.firstPickupDate && !!data?.address,
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const orderData = useOrderFlowStore((state) => state.orderData);
  const hasHydrated = useOrderFlowStore((state) => state._hasHydrated);

  useEffect(() => {
    // Wait for hydration before checking
    if (!hasHydrated) return;

    const requirementCheck = ROUTE_REQUIREMENTS[pathname];
    if (requirementCheck && !requirementCheck(orderData as Record<string, unknown> | null)) {
      router.replace(START_ROUTE);
    }
  }, [pathname, orderData, hasHydrated, router]);

  return <>{children}</>;
}
