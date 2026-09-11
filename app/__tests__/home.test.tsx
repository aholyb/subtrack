import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Home from '../(tabs)/index';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const addNetflix = () =>
  useSubscriptions.getState().add({
    catalogId: 'netflix', name: 'Netflix', categoryId: 'video',
    amountMinor: 1549, currency: 'USD', cycle: 'monthly',
    firstBillingDate: '2099-09-20', trialEndsAt: null,
    paymentMethod: 'card', cancelUrl: null, note: '', reminderDaysBefore: 3,
  });

beforeEach(() => {
  useSubscriptions.setState({ items: [], hasHydrated: true });
  useFx.setState({
    cache: { base: 'USD', rates: { USD: 1 }, fetchedAt: Date.now(), providerUpdatedAt: Date.now() },
    hasHydrated: true,
  });
});

describe('главный экран', () => {
  it('показывает пустое состояние, когда подписок нет', async () => {
    await render(<Home />);
    expect(screen.getByText(/Пока пусто/)).toBeTruthy();
  });

  it('показывает подписку и её месячную стоимость', async () => {
    addNetflix();
    await render(<Home />);
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText('$15.49 / мес')).toBeTruthy();
  });

  it('показывает итог за месяц и за год', async () => {
    addNetflix();
    await render(<Home />);
    expect(screen.getByText('$15.49')).toBeTruthy();
    expect(screen.getByText('($185.88 / год)')).toBeTruthy();
  });

  it('не показывает архивные подписки в списке активных', async () => {
    const id = addNetflix();
    useSubscriptions.getState().cancel(id, '2026-09-11');
    await render(<Home />);
    expect(screen.queryByText('Netflix')).toBeNull();
  });
});
