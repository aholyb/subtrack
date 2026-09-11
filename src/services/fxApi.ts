import { FxCache, isFxCacheValid } from '../domain/fx';

const ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

/**
 * Единственный сетевой вызов в приложении. Возвращает null при любой проблеме:
 * вызывающий код продолжит работать на прошлом кэше, а при его отсутствии
 * покажет суммы в родных валютах.
 */
export async function fetchRates(): Promise<FxCache | null> {
  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) return null;

    const body = (await response.json()) as Record<string, unknown>;
    if (body.result !== 'success') return null;

    const candidate = {
      base: 'USD' as const,
      rates: body.rates,
      fetchedAt: Date.now(),
      providerUpdatedAt:
        typeof body.time_last_update_unix === 'number'
          ? body.time_last_update_unix * 1000
          : Date.now(),
    };

    return isFxCacheValid(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
