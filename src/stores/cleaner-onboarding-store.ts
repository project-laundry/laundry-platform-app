import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CleanerOnboardingData } from '@/types/cleaner-flow';

interface CleanerOnboardingStore {
  cleanerData: Partial<CleanerOnboardingData> | null;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
  updateCleanerData: (data: Partial<CleanerOnboardingData>) => void;
  resetCleanerData: () => void;
}

export const useCleanerOnboardingStore = create<CleanerOnboardingStore>()(
  persist(
    (set) => ({
      cleanerData: null,
      _hasHydrated: false,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      updateCleanerData: (data) =>
        set((state) => ({
          cleanerData: { ...state.cleanerData, ...data }
        })),

      resetCleanerData: () => set({ cleanerData: null }),
    }),
    {
      name: 'nooracare-cleaner-onboarding',
      // v1: machineCondition values changed ('very-good' → 'very_good').
      // Persisted pre-v1 state is incompatible — drop it and start fresh.
      version: 1,
      migrate: () => ({ cleanerData: null }),
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
