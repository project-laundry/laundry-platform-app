import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CleanerOnboardingData } from '@/types/cleaner-flow';

interface CleanerOnboardingStore {
  cleanerData: Partial<CleanerOnboardingData> | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  updateCleanerData: (data: Partial<CleanerOnboardingData>) => void;
  resetCleanerData: () => void;
  hasRequiredData: () => boolean;
}

export const useCleanerOnboardingStore = create<CleanerOnboardingStore>()(
  persist(
    (set, get) => ({
      cleanerData: null,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      updateCleanerData: (data) =>
        set((state) => ({
          cleanerData: { ...state.cleanerData, ...data }
        })),

      resetCleanerData: () => set({ cleanerData: null }),

      hasRequiredData: () => {
        const { cleanerData } = get();
        return cleanerData !== null && cleanerData.businessType !== undefined;
      }
    }),
    {
      name: 'nooracare-cleaner-onboarding',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
