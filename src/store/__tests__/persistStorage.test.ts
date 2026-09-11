import { pickStorage, noopStorage } from '../persistStorage';

describe('pickStorage', () => {
  it('в браузере отдаёт настоящее хранилище', () => {
    const real = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
    expect(pickStorage(real, true)).toBe(real);
  });

  it('без window отдаёт заглушку, а не падает', () => {
    const real = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
    expect(pickStorage(real, false)).toBe(noopStorage);
    expect(real.setItem).not.toHaveBeenCalled();
  });
});

describe('noopStorage', () => {
  it('читает пустоту и молча проглатывает запись', async () => {
    await expect(noopStorage.getItem('ключ')).resolves.toBeNull();
    await expect(noopStorage.setItem('ключ', 'значение')).resolves.toBeUndefined();
    await expect(noopStorage.removeItem('ключ')).resolves.toBeUndefined();
  });
});
