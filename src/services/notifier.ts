import * as Notifications from 'expo-notifications';
import { Subscription } from '../domain/subscription';
import { planReminder } from '../domain/reminders';
import { todayString } from '../domain/date';

/** iOS хранит не более 64 запланированных локальных уведомлений на приложение. */
export const IOS_PENDING_LIMIT = 64;

// Без обработчика уведомление, пришедшее при открытом приложении, не будет
// показано вовсе — система просто молча его проглотит.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/**
 * Пересобирает всё расписание целиком: по одному ближайшему напоминанию на
 * подписку. Планировать серию вперёд нельзя — на два десятка подписок она
 * упрётся в лимит iOS, и часть напоминаний молча пропадёт.
 */
export async function syncReminders(subs: Subscription[]): Promise<number> {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const today = todayString();
  const now = new Date();

  const planned = subs
    .map((s) => planReminder(s, today, now))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, IOS_PENDING_LIMIT);

  for (const reminder of planned) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
      },
    });
  }

  return planned.length;
}
