import { Subscription, NewSubscriptionInput } from './subscription';
import { DateString, compareDates } from './date';
import { nextBillingDate } from './billing';
import { monthlyMinor, yearlyMinor } from './money';
import { FxCache, toUsdMinor } from './fx';

export function createSubscription(
  input: NewSubscriptionInput,
  id: string,
  now: Date,
): Subscription {
  return {
    ...input,
    id,
    status: 'active',
    canceledAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function mapById(
  list: Subscription[],
  id: string,
  fn: (s: Subscription) => Subscription,
): Subscription[] {
  return list.map((s) => (s.id === id ? fn(s) : s));
}

export function cancelSubscription(
  list: Subscription[], id: string, on: DateString,
): Subscription[] {
  return mapById(list, id, (s) => ({ ...s, status: 'canceled', canceledAt: on }));
}

export function restoreSubscription(list: Subscription[], id: string): Subscription[] {
  return mapById(list, id, (s) => ({ ...s, status: 'active', canceledAt: null }));
}

export function updateSubscription(
  list: Subscription[], id: string, patch: Partial<Subscription>, now: Date,
): Subscription[] {
  return mapById(list, id, (s) => ({ ...s, ...patch, updatedAt: now.toISOString() }));
}

export function removeSubscription(list: Subscription[], id: string): Subscription[] {
  return list.filter((s) => s.id !== id);
}

export function sortByNextBilling(
  list: Subscription[], today: DateString,
): Subscription[] {
  return [...list].sort((a, b) =>
    compareDates(
      nextBillingDate(a.firstBillingDate, a.cycle, today),
      nextBillingDate(b.firstBillingDate, b.cycle, today),
    ),
  );
}

export type Totals = {
  /** Вещественные минорные единицы; округляет formatMoney. */
  monthlyUsdMinor: number;
  yearlyUsdMinor: number;
  /** Подписки, которые не удалось привести к доллару — показываются отдельно. */
  unconvertible: Subscription[];
};

export function computeTotals(list: Subscription[], cache: FxCache | null): Totals {
  const totals: Totals = { monthlyUsdMinor: 0, yearlyUsdMinor: 0, unconvertible: [] };

  for (const s of list) {
    if (s.status !== 'active') continue;

    const usd = toUsdMinor(s.amountMinor, s.currency, cache);
    if (usd === null) {
      totals.unconvertible.push(s);
      continue;
    }
    totals.monthlyUsdMinor += monthlyMinor(usd, s.cycle);
    totals.yearlyUsdMinor += yearlyMinor(usd, s.cycle);
  }

  return totals;
}
