import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OrderData } from '@/types/order-flow';

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
      version: 1,
      migrate: () => ({ orderData: null }),
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
