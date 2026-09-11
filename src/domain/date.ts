/**
 * Календарные даты подписок. Хранятся строками 'YYYY-MM-DD' и представляются
 * в UTC, чтобы переход на летнее время не сдвигал день. Локальное время
 * появляется только в todayString и при планировании уведомлений.
 */
export type DateString = string;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDate(s: DateString): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(d: Date): DateString {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayString(now: Date = new Date()): DateString {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}

/**
 * Прибавляет месяцы, прижимая день к последнему дню месяца, если такого дня
 * не существует. Вызывать всегда от исходной даты подписки, а не от прошлого
 * результата: иначе 31 января превращается в 28 февраля и навсегда остаётся
 * 28-м числом, занижая все последующие даты списаний.
 */
export function addMonthsClamped(d: Date, n: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const day = d.getUTCDate();
  const lastDayOfTarget = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, lastDayOfTarget)));
}

export function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function compareDates(a: DateString, b: DateString): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
