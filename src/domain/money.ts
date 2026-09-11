import { BillingCycle } from './billing';

/**
 * Деньги живут в целых минорных единицах (центах). Функции ниже возвращают
 * вещественные минорные единицы намеренно: округление происходит один раз,
 * в formatMoney. Округление на каждом шаге расходится с годовой суммой.
 */
export const PERIODS_PER_YEAR: Record<BillingCycle, number> = {
  weekly: 365.25 / 7,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function yearlyMinor(amountMinor: number, cycle: BillingCycle): number {
  return amountMinor * PERIODS_PER_YEAR[cycle];
}

export function monthlyMinor(amountMinor: number, cycle: BillingCycle): number {
  return yearlyMinor(amountMinor, cycle) / 12;
}

const PREFIX_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatMoney(minor: number, currency: string): string {
  const rounded = Math.round(minor);
  const whole = Math.trunc(Math.abs(rounded) / 100);
  const cents = String(Math.abs(rounded) % 100).padStart(2, '0');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = rounded < 0 ? '-' : '';
  const symbol = PREFIX_SYMBOLS[currency];
  return symbol
    ? `${sign}${symbol}${grouped}.${cents}`
    : `${sign}${grouped}.${cents} ${currency}`;
}

/**
 * Возвращает null для любого ввода, который нельзя истолковать однозначно.
 * В частности, '15.499' отвергается, а не округляется: молча изменить сумму,
 * которую человек ввёл своими руками, недопустимо в приложении про деньги.
 */
export function parseAmountToMinor(input: string): number | null {
  const trimmed = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [whole, fraction = ''] = trimmed.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
