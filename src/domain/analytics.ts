import { Subscription, CategoryId, CATEGORIES } from './subscription';
import { monthlyMinor } from './money';
import { FxCache, toUsdMinor } from './fx';

export type CategorySlice = {
  categoryId: CategoryId;
  label: string;
  color: string;
  monthlyUsdMinor: number;
  /** Доля от общих трат, 0..1. */
  share: number;
};

export function spendByCategory(
  list: Subscription[], cache: FxCache | null,
): CategorySlice[] {
  const totals = new Map<CategoryId, number>();

  for (const s of list) {
    if (s.status !== 'active') continue;
    // Неконвертируемая подписка выпадает из графика целиком: приписать ей
    // ноль значило бы нарисовать неверные доли.
    const usd = toUsdMinor(s.amountMinor, s.currency, cache);
    if (usd === null) continue;
    totals.set(s.categoryId, (totals.get(s.categoryId) ?? 0) + monthlyMinor(usd, s.cycle));
  }

  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  if (grand === 0) return [];

  return [...totals.entries()]
    .map(([categoryId, monthlyUsdMinor]) => {
      const meta = CATEGORIES.find((c) => c.id === categoryId)!;
      return {
        categoryId,
        label: meta.label,
        color: meta.color,
        monthlyUsdMinor,
        share: monthlyUsdMinor / grand,
      };
    })
    .sort((a, b) => b.monthlyUsdMinor - a.monthlyUsdMinor);
}

export function exportToJson(list: Subscription[]): string {
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), subscriptions: list },
    null,
    2,
  );
}
