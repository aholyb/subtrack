import { Subscription } from '../subscription';
import {
  createSubscription, cancelSubscription, restoreSubscription,
  updateSubscription, removeSubscription, sortByNextBilling, computeTotals,
} from '../subscriptionOps';
import { FxCache } from '../fx';

const NOW = new Date(Date.UTC(2026, 8, 11, 12, 0, 0));

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: 3,
  createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  ...over,
});

describe('createSubscription', () => {
  it('заполняет служебные поля и делает подписку активной', () => {
    const created = createSubscription(
      {
        catalogId: 'netflix', name: 'Netflix', categoryId: 'video',
        amountMinor: 1549, currency: 'USD', cycle: 'monthly',
        firstBillingDate: '2026-09-20', trialEndsAt: null,
        paymentMethod: 'card', cancelUrl: 'https://netflix.com/cancelplan',
        note: '', reminderDaysBefore: 3,
      },
      'generated-id',
      NOW,
    );

    expect(created.id).toBe('generated-id');
    expect(created.status).toBe('active');
    expect(created.canceledAt).toBeNull();
    expect(created.createdAt).toBe(NOW.toISOString());
    expect(created.updatedAt).toBe(NOW.toISOString());
  });
});

describe('cancelSubscription / restoreSubscription', () => {
  it('переводит в архив, сохраняя запись и дату отмены', () => {
    const [result] = cancelSubscription([sub()], 'a', '2026-09-11');
    expect(result.status).toBe('canceled');
    expect(result.canceledAt).toBe('2026-09-11');
    expect(result.amountMinor).toBe(1549);
  });

  it('возвращает из архива и стирает дату отмены', () => {
    const archived = cancelSubscription([sub()], 'a', '2026-09-11');
    const [restored] = restoreSubscription(archived, 'a');
    expect(restored.status).toBe('active');
    expect(restored.canceledAt).toBeNull();
  });

  it('не трогает остальные подписки', () => {
    const list = [sub({ id: 'a' }), sub({ id: 'b', name: 'Spotify' })];
    const result = cancelSubscription(list, 'a', '2026-09-11');
    expect(result.find((s) => s.id === 'b')!.status).toBe('active');
  });

  it('молча возвращает список без изменений для неизвестного id', () => {
    const list = [sub()];
    expect(cancelSubscription(list, 'нет-такого', '2026-09-11')).toEqual(list);
  });
});

describe('updateSubscription / removeSubscription', () => {
  it('обновляет поля и двигает updatedAt', () => {
    const later = new Date(Date.UTC(2026, 8, 12));
    const [result] = updateSubscription([sub()], 'a', { amountMinor: 1799 }, later);
    expect(result.amountMinor).toBe(1799);
    expect(result.updatedAt).toBe(later.toISOString());
    expect(result.createdAt).toBe(NOW.toISOString());
  });

  it('удаляет запись', () => {
    expect(removeSubscription([sub()], 'a')).toEqual([]);
  });
});

describe('sortByNextBilling', () => {
  it('ставит ближайшее списание первым', () => {
    const list = [
      sub({ id: 'later', firstBillingDate: '2026-09-25' }),
      sub({ id: 'sooner', firstBillingDate: '2026-09-13' }),
    ];
    expect(sortByNextBilling(list, '2026-09-11').map((s) => s.id))
      .toEqual(['sooner', 'later']);
  });

  it('учитывает цикл, а не только исходную дату', () => {
    const list = [
      sub({ id: 'annual', firstBillingDate: '2026-01-05', cycle: 'yearly' }),
      sub({ id: 'monthly', firstBillingDate: '2026-01-20', cycle: 'monthly' }),
    ];
    // Годовая спишется 5 января 2027, месячная — 20 сентября 2026.
    expect(sortByNextBilling(list, '2026-09-11').map((s) => s.id))
      .toEqual(['monthly', 'annual']);
  });
});

describe('computeTotals', () => {
  const cache: FxCache = {
    base: 'USD', rates: { USD: 1, EUR: 0.92 },
    fetchedAt: 0, providerUpdatedAt: 0,
  };

  it('суммирует только активные подписки', () => {
    const list = [
      sub({ id: 'a', amountMinor: 1000, cycle: 'monthly' }),
      sub({ id: 'b', amountMinor: 5000, cycle: 'monthly', status: 'canceled' }),
    ];
    const totals = computeTotals(list, cache);
    expect(Math.round(totals.monthlyUsdMinor)).toBe(1000);
    expect(Math.round(totals.yearlyUsdMinor)).toBe(12000);
  });

  it('сводит разные валюты и циклы к доллару', () => {
    const list = [
      sub({ id: 'a', amountMinor: 1000, currency: 'USD', cycle: 'monthly' }),
      sub({ id: 'b', amountMinor: 920, currency: 'EUR', cycle: 'monthly' }),
    ];
    expect(Math.round(computeTotals(list, cache).monthlyUsdMinor)).toBe(2000);
  });

  it('выносит неконвертируемые подписки отдельно, а не приписывает им нули', () => {
    const list = [
      sub({ id: 'a', amountMinor: 1000, currency: 'USD' }),
      sub({ id: 'b', amountMinor: 92000, currency: 'UAH' }),
    ];
    const totals = computeTotals(list, cache);
    expect(Math.round(totals.monthlyUsdMinor)).toBe(1000);
    expect(totals.unconvertible.map((s) => s.id)).toEqual(['b']);
  });

  it('без кэша считает доллары и откладывает всё остальное', () => {
    const list = [
      sub({ id: 'a', amountMinor: 1000, currency: 'USD' }),
      sub({ id: 'b', amountMinor: 920, currency: 'EUR' }),
    ];
    const totals = computeTotals(list, null);
    expect(Math.round(totals.monthlyUsdMinor)).toBe(1000);
    expect(totals.unconvertible.map((s) => s.id)).toEqual(['b']);
  });
});
