import * as Notifications from 'expo-notifications';
import { Subscription } from '../../domain/subscription';
import { syncReminders, IOS_PENDING_LIMIT } from '../notifier';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2099-01-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: 3,
  createdAt: '', updatedAt: '',
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
  (Notifications.cancelAllScheduledNotificationsAsync as jest.Mock).mockResolvedValue(undefined);
  (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('id');
});

describe('syncReminders', () => {
  it('стирает старое расписание перед тем, как ставить новое', async () => {
    await syncReminders([sub()]);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('планирует по одному ближайшему напоминанию на подписку', async () => {
    const count = await syncReminders([sub({ id: 'a' }), sub({ id: 'b' })]);
    expect(count).toBe(2);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('передаёт триггер с конкретной датой', async () => {
    await syncReminders([sub()]);
    const arg = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(arg.trigger.type).toBe('date');
    expect(arg.trigger.date).toBeInstanceOf(Date);
    expect(arg.content.body).toContain('Netflix');
  });

  it('не планирует ничего для архивных подписок и подписок без напоминания', async () => {
    const count = await syncReminders([
      sub({ id: 'a', status: 'canceled' }),
      sub({ id: 'b', reminderDaysBefore: null }),
    ]);
    expect(count).toBe(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('держится ниже лимита iOS в 64 уведомления', async () => {
    const many = Array.from({ length: 100 }, (_, i) => sub({ id: String(i) }));
    const count = await syncReminders(many);
    expect(count).toBe(IOS_PENDING_LIMIT);
    expect(count).toBeLessThanOrEqual(64);
  });

  it('ничего не планирует без разрешения и не падает', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    await expect(syncReminders([sub()])).resolves.toBe(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
