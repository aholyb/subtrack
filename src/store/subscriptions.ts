import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { Subscription, NewSubscriptionInput } from '../domain/subscription';
import { DateString } from '../domain/date';
import {
  createSubscription, cancelSubscription, restoreSubscription,
  updateSubscription, removeSubscription,
} from '../domain/subscriptionOps';

type SubscriptionsState = {
  items: Subscription[];
  hasHydrated: boolean;
  add: (input: NewSubscriptionInput) => string;
  update: (id: string, patch: Partial<Subscription>) => void;
  cancel: (id: string, on: DateString) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;
};

export const useSubscriptions = create<SubscriptionsState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,

      add: (input) => {
        const id = randomUUID();
        set((s) => ({ items: [...s.items, createSubscription(input, id, new Date())] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ items: updateSubscription(s.items, id, patch, new Date()) })),
      cancel: (id, on) => set((s) => ({ items: cancelSubscription(s.items, id, on) })),
      restore: (id) => set((s) => ({ items: restoreSubscription(s.items, id) })),
      remove: (id) => set((s) => ({ items: removeSubscription(s.items, id) })),
    }),
    {
      name: 'subtrack.subscriptions.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        // Повреждённая запись не должна ронять старт: стор просто останется пустым.
        useSubscriptions.setState({
          hasHydrated: true,
          items: Array.isArray(state?.items) ? state.items : [],
        });
      },
    },
  ),
);
