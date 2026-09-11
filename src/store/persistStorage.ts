import AsyncStorage from '@react-native-async-storage/async-storage';

type StateStorage = {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
};

/**
 * Заглушка для сборки веба: статический рендеринг выполняет сторы в Node, где
 * нет window, а веб-реализация AsyncStorage обращается к localStorage и падает.
 * Ничего не сохраняем и ничего не читаем — на сервере состояния и не должно
 * быть, оно появится в браузере при гидратации.
 */
export const noopStorage: StateStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

export function pickStorage(real: StateStorage, hasWindow: boolean): StateStorage {
  return hasWindow ? real : noopStorage;
}

export function persistStorage(): StateStorage {
  return pickStorage(AsyncStorage, typeof window !== 'undefined');
}
