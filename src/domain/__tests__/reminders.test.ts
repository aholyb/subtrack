import { Subscription } from '../subscription';
import { planReminder, REMINDER_HOUR } from '../reminders';

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: 3,
  createdAt: '', updatedAt: '',
  ...over,
});

const NOW = new Date(2026, 8, 11, 9, 0, 0); // 11 сентября, 09:00 по местному

describe('planReminder', () => {
  it('ставит напоминание на 10:00 за указанное число дней до списания', () => {
    const planned = planReminder(sub(), '2026-09-11', NOW)!;
    expect(planned.kind).toBe('billing');
    expect(planned.fireAt.getFullYear()).toBe(2026);
    expect(planned.fireAt.getMonth()).toBe(8);
    expect(planned.fireAt.getDate()).toBe(17); // 20 сентября минус 3 дня
    expect(planned.fireAt.getHours()).toBe(REMINDER_HOUR);
  });

  it('называет сервис и сумму в тексте', () => {
    const planned = planReminder(sub(), '2026-09-11', NOW)!;
    expect(planned.body).toContain('Netflix');
    expect(planned.body).toContain('$15.49');
  });

  it('отдаёт приоритет пробному периоду', () => {
    const planned = planReminder(
      sub({ trialEndsAt: '2026-09-15' }), '2026-09-11', NOW,
    )!;
    expect(planned.kind).toBe('trial');
    expect(planned.fireAt.getDate()).toBe(12); // 15 сентября минус 3 дня
  });

  it('игнорирует уже закончившийся пробный период', () => {
    const planned = planReminder(
      sub({ trialEndsAt: '2026-09-01' }), '2026-09-11', NOW,
    )!;
    expect(planned.kind).toBe('billing');
  });

  it('ничего не планирует при reminderDaysBefore: null', () => {
    expect(planReminder(sub({ reminderDaysBefore: null }), '2026-09-11', NOW)).toBeNull();
  });

  it('ничего не планирует для архивной подписки', () => {
    expect(planReminder(sub({ status: 'canceled' }), '2026-09-11', NOW)).toBeNull();
  });

  it('ничего не планирует, если момент уже прошёл', () => {
    // Списание 12 сентября, напоминание за 3 дня — это 9 сентября, позади.
    const planned = planReminder(
      sub({ firstBillingDate: '2026-09-12' }), '2026-09-11', NOW,
    );
    expect(planned).toBeNull();
  });
});
