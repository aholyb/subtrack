import { FX_TTL_MS, FxCache, fxFreshness, toUsdMinor, isFxCacheValid } from '../fx';

const NOW = Date.UTC(2026, 8, 11, 12, 0, 0);

const cache = (fetchedAt: number): FxCache => ({
  base: 'USD',
  rates: { USD: 1, EUR: 0.92, UAH: 41.5 },
  fetchedAt,
  providerUpdatedAt: fetchedAt,
});

describe('fxFreshness', () => {
  it('называет кэш свежим в пределах суток', () => {
    expect(fxFreshness(cache(NOW - 1000), NOW)).toBe('fresh');
    expect(fxFreshness(cache(NOW - FX_TTL_MS + 1), NOW)).toBe('fresh');
  });

  it('называет кэш протухшим после суток', () => {
    expect(fxFreshness(cache(NOW - FX_TTL_MS - 1), NOW)).toBe('stale');
  });

  it('отличает отсутствие кэша', () => {
    expect(fxFreshness(null, NOW)).toBe('missing');
  });
});

describe('toUsdMinor', () => {
  it('переводит доллары в доллары без всякого кэша', () => {
    expect(toUsdMinor(1549, 'USD', null)).toBe(1549);
  });

  it('конвертирует по курсу', () => {
    expect(toUsdMinor(920, 'EUR', cache(NOW))).toBeCloseTo(1000, 6);
  });

  it('конвертирует и по протухшему кэшу', () => {
    // Протухший курс лучше отсутствия цифры: разница за сутки — доли процента,
    // и пользователь видит подпись с датой курса.
    expect(toUsdMinor(920, 'EUR', cache(NOW - FX_TTL_MS - 1))).toBeCloseTo(1000, 6);
  });

  it('возвращает null для чужой валюты без кэша и не выдумывает курс', () => {
    expect(toUsdMinor(920, 'EUR', null)).toBeNull();
  });

  it('возвращает null для валюты, которой нет в курсах', () => {
    expect(toUsdMinor(1000, 'XYZ', cache(NOW))).toBeNull();
  });

  it('возвращает null, если курс нулевой или отрицательный', () => {
    const broken: FxCache = { ...cache(NOW), rates: { ...cache(NOW).rates, EUR: 0 } };
    expect(toUsdMinor(920, 'EUR', broken)).toBeNull();
  });
});

describe('isFxCacheValid', () => {
  it('принимает корректную запись', () => {
    expect(isFxCacheValid(cache(NOW))).toBe(true);
  });

  it('отвергает мусор, а не роняет приложение', () => {
    expect(isFxCacheValid(null)).toBe(false);
    expect(isFxCacheValid({})).toBe(false);
    expect(isFxCacheValid({ base: 'USD', rates: 'нет' })).toBe(false);
    expect(isFxCacheValid({ base: 'USD', rates: { EUR: 'дорого' }, fetchedAt: 1, providerUpdatedAt: 1 })).toBe(false);
  });
});
