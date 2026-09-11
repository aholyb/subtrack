// Заглушки нативных модулей, которых нет в тестовой среде Node.
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10),
}));
