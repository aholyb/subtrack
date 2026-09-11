import { fetchRates } from '../fxApi';

const okBody = {
  result: 'success',
  base_code: 'USD',
  time_last_update_unix: 1789000000,
  rates: { USD: 1, EUR: 0.92, UAH: 41.5 },
};

const mockFetch = (body: unknown, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok, json: async () => body,
  }) as unknown as typeof fetch;
};

describe('fetchRates', () => {
  it('превращает ответ провайдера в запись кэша', async () => {
    mockFetch(okBody);
    const cache = (await fetchRates())!;
    expect(cache.base).toBe('USD');
    expect(cache.rates.EUR).toBe(0.92);
    expect(cache.providerUpdatedAt).toBe(1789000000 * 1000);
    expect(cache.fetchedAt).toBeGreaterThan(0);
  });

  it('возвращает null на сетевую ошибку, а не бросает исключение', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await expect(fetchRates()).resolves.toBeNull();
  });

  it('возвращает null при ответе не 2xx', async () => {
    mockFetch(okBody, false);
    await expect(fetchRates()).resolves.toBeNull();
  });

  it('отвергает ответ неверной формы, а не кладёт мусор в кэш', async () => {
    mockFetch({ result: 'success', rates: { EUR: 'дорого' } });
    await expect(fetchRates()).resolves.toBeNull();
  });

  it('отвергает ответ с result != success', async () => {
    mockFetch({ ...okBody, result: 'error' });
    await expect(fetchRates()).resolves.toBeNull();
  });
});
