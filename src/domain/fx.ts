export type FxCache = {
  base: 'USD';
  /** Сколько единиц валюты даётся за один доллар. */
  rates: Record<string, number>;
  fetchedAt: number;
  providerUpdatedAt: number;
};

export type FxFreshness = 'fresh' | 'stale' | 'missing';

export const FX_TTL_MS = 24 * 60 * 60 * 1000;

export function fxFreshness(cache: FxCache | null, now: number): FxFreshness {
  if (!cache) return 'missing';
  return now - cache.fetchedAt < FX_TTL_MS ? 'fresh' : 'stale';
}

/**
 * Возвращает null, когда честной конвертации не получается. Вызывающий код
 * обязан показать сумму в родной валюте и исключить её из долларового итога,
 * а не подставить приблизительное значение: по этой цифре принимают решения
 * о деньгах.
 */
export function toUsdMinor(
  amountMinor: number,
  currency: string,
  cache: FxCache | null,
): number | null {
  if (currency === 'USD') return amountMinor;
  if (!cache) return null;

  const rate = cache.rates[currency];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;

  return amountMinor / rate;
}

export function isFxCacheValid(value: unknown): value is FxCache {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  if (c.base !== 'USD') return false;
  if (typeof c.fetchedAt !== 'number' || typeof c.providerUpdatedAt !== 'number') return false;
  if (typeof c.rates !== 'object' || c.rates === null) return false;

  return Object.values(c.rates as Record<string, unknown>).every(
    (r) => typeof r === 'number' && Number.isFinite(r) && r > 0,
  );
}
