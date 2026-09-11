import { Subscription } from '../subscription';
import { resolveCancelRoute, APP_STORE_SUBSCRIPTIONS_URL } from '../cancelRoute';

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: 3,
  createdAt: '', updatedAt: '',
  ...over,
});

describe('resolveCancelRoute', () => {
  it('для оплаты через App Store ведёт на системный экран подписок', () => {
    const route = resolveCancelRoute(sub({ paymentMethod: 'appstore' }));
    expect(route).toEqual({ kind: 'appstore', url: APP_STORE_SUBSCRIPTIONS_URL });
  });

  it('App Store важнее ссылки сервиса: подписку через Apple на сайте не отменить', () => {
    const route = resolveCancelRoute(
      sub({ paymentMethod: 'appstore', cancelUrl: 'https://netflix.com/cancelplan' }),
    );
    expect(route.kind).toBe('appstore');
  });

  it('ведёт на страницу отмены сервиса, если она известна', () => {
    const route = resolveCancelRoute(sub({ cancelUrl: 'https://netflix.com/cancelplan' }));
    expect(route).toEqual({ kind: 'web', url: 'https://netflix.com/cancelplan' });
  });

  it('падает в ручной режим с поисковым запросом, если ссылки нет', () => {
    const route = resolveCancelRoute(sub({ name: 'Местный спортзал' }));
    expect(route).toEqual({ kind: 'manual', searchQuery: 'как отменить подписку Местный спортзал' });
  });

  it('не принимает ссылку без https', () => {
    const route = resolveCancelRoute(sub({ cancelUrl: 'javascript:alert(1)' }));
    expect(route.kind).toBe('manual');
  });
});
