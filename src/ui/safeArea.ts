import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type Insets = { top: number; bottom: number; left: number; right: number };

const NO_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

export function resolveInsets(native: Insets, platform: string): Insets {
  // На вебе безопасную зону забирает #root через CSS env() — см. app/+html.tsx.
  // Прибавлять её ещё и здесь значило бы отсчитать отступ дважды.
  return platform === 'web' ? NO_INSETS : native;
}

/** Отступы безопасной зоны, уже учитывающие, кто их применяет на этой платформе. */
export function useAppInsets(): Insets {
  return resolveInsets(useSafeAreaInsets(), Platform.OS);
}
