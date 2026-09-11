import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FxCache, fxFreshness, isFxCacheValid } from '../domain/fx';
import { fetchRates } from '../services/fxApi';

type FxState = {
  cache: FxCache | null;
  hasHydrated: boolean;
  /** Тянет курсы, если кэш протух или отсутствует. force обходит проверку. */
  refresh: (force?: boolean) => Promise<void>;
};

export const useFx = create<FxState>()(
  persist(
    (set, get) => ({
      cache: null,
      hasHydrated: false,

      refresh: async (force = false) => {
        if (!force && fxFreshness(get().cache, Date.now()) === 'fresh') return;
        const fresh = await fetchRates();
        if (fresh) set({ cache: fresh });
      },
    }),
    {
      name: 'subtrack.fx.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ cache: s.cache }),
      onRehydrateStorage: () => (state) => {
        useFx.setState({
          hasHydrated: true,
          cache: isFxCacheValid(state?.cache) ? state.cache : null,
        });
      },
    },
  ),
);
