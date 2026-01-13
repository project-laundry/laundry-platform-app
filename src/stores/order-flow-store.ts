import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { OrderData } from '@/types/order-flow';

interface OrderFlowStore {
  orderData: Partial<OrderData> | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  updateOrderData: (data: Partial<OrderData>) => void;
  resetOrderData: () => void;
  hasRequiredData: () => boolean;
}

export const useOrderFlowStore = create<OrderFlowStore>()(
  persist(
    (set, get) => ({
      orderData: null,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      updateOrderData: (data) =>
        set((state) => ({
          orderData: { ...state.orderData, ...data }
        })),

      resetOrderData: () => set({ orderData: null }),

      hasRequiredData: () => {
        const { orderData } = get();
        return orderData !== null && orderData.location !== undefined && orderData.firstPickupDate !== undefined;
      }
    }),
    {
      name: 'nooracare-order-flow',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
