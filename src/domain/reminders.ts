import { Subscription } from './subscription';
import { DateString, parseDate, compareDates } from './date';
import { nextBillingDate } from './billing';
import { formatMoney } from './money';

export const REMINDER_HOUR = 10;

export type PlannedReminder = {
  subscriptionId: string;
  kind: 'trial' | 'billing';
  /** Момент в локальном времени — единственное место, где оно появляется. */
  fireAt: Date;
  title: string;
  body: string;
};

export function planReminder(
  sub: Subscription,
  today: DateString,
  now: Date,
): PlannedReminder | null {
  if (sub.status !== 'active') return null;
  if (sub.reminderDaysBefore === null) return null;

  const trialAhead = sub.trialEndsAt !== null && compareDates(sub.trialEndsAt, today) >= 0;
  const kind: PlannedReminder['kind'] = trialAhead ? 'trial' : 'billing';
  const target = trialAhead
    ? sub.trialEndsAt!
    : nextBillingDate(sub.firstBillingDate, sub.cycle, today);

  const targetUtc = parseDate(target);
  const fireAt = new Date(
    targetUtc.getUTCFullYear(),
    targetUtc.getUTCMonth(),
    targetUtc.getUTCDate() - sub.reminderDaysBefore,
    REMINDER_HOUR, 0, 0, 0,
  );

  if (fireAt.getTime() <= now.getTime()) return null;

  const amount = formatMoney(sub.amountMinor, sub.currency);
  return {
    subscriptionId: sub.id,
    kind,
    fireAt,
    title: kind === 'trial' ? 'Пробный период кончается' : 'Скоро списание',
    body:
      kind === 'trial'
        ? `${sub.name}: пробный период кончается, дальше ${amount}`
        : `${sub.name} спишет ${amount}`,
  };
}
