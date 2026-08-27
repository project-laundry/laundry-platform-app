'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrderFlowStore } from '@/stores/order-flow-store';

const START_ROUTE = '/orders/wash';

/** Whether the stored selection has anything to wash. */
function hasItems(data: Record<string, unknown> | null): boolean {
  const sel = data?.selection as
    | { bags?: number; beddingSets?: number; everydayItems?: number; formalItems?: number }
    | undefined;
  return (
    !!sel &&
    ((sel.bags ?? 0) > 0 ||
      (sel.beddingSets ?? 0) > 0 ||
      (sel.everydayItems ?? 0) > 0 ||
      (sel.formalItems ?? 0) > 0)
  );
}

// Define what data is required for each route
const ROUTE_REQUIREMENTS: Record<string, (data: Record<string, unknown> | null) => boolean> = {
  '/orders/wash': () => true, // No requirements - entry point
  '/orders/pickup': (data) => hasItems(data),
  '/orders/confirm': (data) =>
    hasItems(data) && !!data?.city && !!data?.firstPickupDate && !!data?.address,
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
