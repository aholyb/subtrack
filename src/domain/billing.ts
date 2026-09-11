import {
  DateString, parseDate, formatDate, addDays, addMonthsClamped, diffInDays,
} from './date';

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export const MONTHS_PER_CYCLE: Record<Exclude<BillingCycle, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * Ближайшее списание — это самое раннее вхождение цикла, не раньше сегодняшнего дня.
 * Каждое вхождение вычисляется от исходной даты подписки (якоря), а не от
 * предыдущего вхождения: см. addMonthsClamped.
 */
export function nextBillingDate(
  firstBillingDate: DateString,
  cycle: BillingCycle,
  today: DateString,
): DateString {
  const anchor = parseDate(firstBillingDate);
  const now = parseDate(today);

  if (anchor.getTime() >= now.getTime()) return firstBillingDate;

  if (cycle === 'weekly') {
    const periods = Math.ceil(diffInDays(anchor, now) / 7);
    return formatDate(addDays(anchor, periods * 7));
  }

  const monthsPerCycle = MONTHS_PER_CYCLE[cycle];
  const monthDiff =
    (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - anchor.getUTCMonth());

  let periods = Math.max(0, Math.floor(monthDiff / monthsPerCycle));
  while (addMonthsClamped(anchor, periods * monthsPerCycle).getTime() < now.getTime()) {
    periods += 1;
  }
  return formatDate(addMonthsClamped(anchor, periods * monthsPerCycle));
}

export function daysUntilBilling(
  firstBillingDate: DateString,
  cycle: BillingCycle,
  today: DateString,
): number {
  const next = nextBillingDate(firstBillingDate, cycle, today);
  return diffInDays(parseDate(today), parseDate(next));
}
