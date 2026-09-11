import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Archive from '../archive';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));

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

describe('архив', () => {
  it('пуст, пока ничего не отменено', async () => {
    addNetflix();
    await render(<Archive />);
    expect(screen.getByText('Архив пуст.')).toBeTruthy();
  });

  it('показывает отменённую подписку и годовую сумму, которую больше не платишь', async () => {
    const id = addNetflix();
    useSubscriptions.getState().cancel(id, '2026-09-11');
    await render(<Archive />);
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText('Не платишь $185.88 в год')).toBeTruthy();
  });

  it('возвращает подписку в активные', async () => {
    const id = addNetflix();
    useSubscriptions.getState().cancel(id, '2026-09-11');
    await render(<Archive />);
    await fireEvent.press(screen.getByText('Вернуть в активные'));
    expect(useSubscriptions.getState().items.find((s) => s.id === id)!.status).toBe('active');
  });
});
