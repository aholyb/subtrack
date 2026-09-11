import { Subscription } from '../subscription';
import { spendByCategory, exportToJson } from '../analytics';
import { FxCache } from '../fx';

const cache: FxCache = {
  base: 'USD', rates: { USD: 1, EUR: 0.92 }, fetchedAt: 0, providerUpdatedAt: 0,
};

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'X', categoryId: 'video',
  amountMinor: 1000, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: null,
  createdAt: '', updatedAt: '',
  ...over,
});

describe('spendByCategory', () => {
  it('складывает подписки одной категории', () => {
    const slices = spendByCategory(
      [sub({ id: 'a' }), sub({ id: 'b', amountMinor: 2000 })], cache,
    );
    const video = slices.find((s) => s.categoryId === 'video')!;
    expect(Math.round(video.monthlyUsdMinor)).toBe(3000);
  });

  it('считает доли, дающие в сумме единицу', () => {
    const slices = spendByCategory(
      [sub({ id: 'a', categoryId: 'video' }), sub({ id: 'b', categoryId: 'music', amountMinor: 3000 })],
      cache,
    );
    expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 6);
    expect(slices.find((s) => s.categoryId === 'video')!.share).toBeCloseTo(0.25, 6);
  });

  it('пропускает категории без трат', () => {
    const slices = spendByCategory([sub()], cache);
    expect(slices.every((s) => s.monthlyUsdMinor > 0)).toBe(true);
  });

  it('сортирует по убыванию трат', () => {
    const slices = spendByCategory(
      [sub({ id: 'a', categoryId: 'video' }), sub({ id: 'b', categoryId: 'music', amountMinor: 5000 })],
      cache,
    );
    expect(slices[0].categoryId).toBe('music');
  });

  it('не считает архивные подписки', () => {
    expect(spendByCategory([sub({ status: 'canceled' })], cache)).toEqual([]);
  });

  it('пропускает неконвертируемые подписки, а не считает их нулём', () => {
    const slices = spendByCategory([sub({ currency: 'UAH', amountMinor: 50000 })], cache);
    expect(slices).toEqual([]);
  });

  it('сводит разные циклы к месячной сумме', () => {
    const slices = spendByCategory([sub({ amountMinor: 12000, cycle: 'yearly' })], cache);
    expect(Math.round(slices[0].monthlyUsdMinor)).toBe(1000);
  });
});

describe('exportToJson', () => {
  it('отдаёт разбираемый JSON с версией схемы', () => {
    const parsed = JSON.parse(exportToJson([sub()]));
    expect(parsed.version).toBe(1);
    expect(parsed.subscriptions).toHaveLength(1);
    expect(parsed.subscriptions[0].name).toBe('X');
  });
});
