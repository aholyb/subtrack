import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Detail from '../subscription/[id]';
import { useSubscriptions } from '../../src/store/subscriptions';
import * as cancelService from '../../src/services/cancel';

let currentId = '';
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: mockCurrentId() }),
}));

// Объявлена через function, поэтому поднимается вместе с jest.mock.
function mockCurrentId() {
  return currentId;
}

const addNetflix = () =>
  useSubscriptions.getState().add({
    catalogId: 'netflix', name: 'Netflix', categoryId: 'video',
    amountMinor: 1549, currency: 'USD', cycle: 'monthly',
    firstBillingDate: '2099-09-20', trialEndsAt: null,
    paymentMethod: 'card', cancelUrl: 'https://www.netflix.com/cancelplan',
    note: '', reminderDaysBefore: 3,
  });

beforeEach(() => {
  useSubscriptions.setState({ items: [], hasHydrated: true });
  jest.clearAllMocks();
  jest.spyOn(cancelService, 'openCancelRoute').mockResolvedValue(undefined);
});

describe('экран деталей', () => {
  it('показывает сумму за месяц и за год', async () => {
    currentId = addNetflix();
    await render(<Detail />);
    expect(screen.getByText('$15.49 / мес')).toBeTruthy();
    expect(screen.getByText('($185.88 / год)')).toBeTruthy();
  });

  it('сообщает, что подписка не найдена, вместо падения', async () => {
    currentId = 'нет-такой';
    await render(<Detail />);
    expect(screen.getByText(/не найдена/)).toBeTruthy();
  });

  it('открывает страницу отмены и спрашивает подтверждение', async () => {
    currentId = addNetflix();
    await render(<Detail />);
    await fireEvent.press(screen.getByText('Отменить подписку'));

    await waitFor(() => expect(cancelService.openCancelRoute).toHaveBeenCalled());
    expect(screen.getByText('Отмена прошла?')).toBeTruthy();
  });

  it('не меняет статус, пока пользователь не подтвердил', async () => {
    const id = addNetflix();
    currentId = id;
    await render(<Detail />);
    await fireEvent.press(screen.getByText('Отменить подписку'));
    await waitFor(() => expect(screen.getByText('Отмена прошла?')).toBeTruthy());

    await fireEvent.press(screen.getByText('Ещё нет'));
    expect(useSubscriptions.getState().items.find((s) => s.id === id)!.status).toBe('active');
  });

  it('уводит в архив только после подтверждения', async () => {
    const id = addNetflix();
    currentId = id;
    await render(<Detail />);
    await fireEvent.press(screen.getByText('Отменить подписку'));
    await waitFor(() => expect(screen.getByText('Отмена прошла?')).toBeTruthy());

    await fireEvent.press(screen.getByText('Да, отменил'));
    expect(useSubscriptions.getState().items.find((s) => s.id === id)!.status).toBe('canceled');
    expect(mockBack).toHaveBeenCalled();
  });
});
