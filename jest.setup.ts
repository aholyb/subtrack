// Заглушки нативных модулей, которых нет в тестовой среде Node.
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10),
}));

// Официальный мок библиотеки: хранит значения в памяти на время теста.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Отдаёт нулевые отступы вместо обращения к нативному провайдеру.
// Мок отдаётся через export default, поэтому его разворачиваем.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default);
