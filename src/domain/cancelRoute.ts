import { Subscription } from './subscription';

/** Открывает системный экран «Подписки» в Настройках, минуя App Store. */
export const APP_STORE_SUBSCRIPTIONS_URL = 'itms-apps://apps.apple.com/account/subscriptions';

export type CancelRoute =
  | { kind: 'appstore'; url: string }
  | { kind: 'web'; url: string }
  | { kind: 'manual'; searchQuery: string };

export function resolveCancelRoute(sub: Subscription): CancelRoute {
  // Оплата через Apple отменяется только в настройках устройства: страница
  // сервиса в этом случае в лучшем случае бесполезна, в худшем — вводит в
  // заблуждение, показывая, что подписки у сервиса нет.
  if (sub.paymentMethod === 'appstore') {
    return { kind: 'appstore', url: APP_STORE_SUBSCRIPTIONS_URL };
  }

  if (sub.cancelUrl && sub.cancelUrl.startsWith('https://')) {
    return { kind: 'web', url: sub.cancelUrl };
  }

  return { kind: 'manual', searchQuery: `как отменить подписку ${sub.name}` };
}
