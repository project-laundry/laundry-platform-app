import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OrderData } from '@/types/order-flow';
import { withoutUnofferedIroning } from '@/lib/config/pricing';

interface OrderFlowStore {
  orderData: Partial<OrderData> | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  updateOrderData: (data: Partial<OrderData>) => void;
  resetOrderData: () => void;
}

export const useOrderFlowStore = create<OrderFlowStore>()(
  persist(
    (set) => ({
      orderData: null,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      updateOrderData: (data) =>
        set((state) => ({
          orderData: { ...state.orderData, ...data }
        })),

      resetOrderData: () => set({ orderData: null }),
    }),
    {
      name: 'nooracare-order-flow',
      // v1: selection-based flow. Persisted pre-redesign state (needsIroning,
      // no selection) is incompatible — drop it and start fresh.
      // v2: ironing hidden. A v1 selection may still carry ironing counts the
      // customer can no longer see or change — zero them, keep the rest.
      version: 2,
      migrate: (persisted, version) => {
        const orderData = (persisted as { orderData?: Partial<OrderData> | null })?.orderData;
        if (version < 1 || !orderData) return { orderData: null };
        return {
          orderData: orderData.selection
            ? { ...orderData, selection: withoutUnofferedIroning(orderData.selection) }
            : orderData,
        };
      },
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
