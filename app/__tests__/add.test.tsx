import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Add from '../add';
import { useSubscriptions } from '../../src/store/subscriptions';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));

beforeEach(() => {
  useSubscriptions.setState({ items: [], hasHydrated: true });
  jest.clearAllMocks();
});

describe('экран добавления', () => {
  it('фильтрует каталог по вводу', async () => {
    await render(<Add />);
    await fireEvent.changeText(screen.getByPlaceholderText('Поиск сервиса'), 'netf');
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.queryByText('Spotify')).toBeNull();
  });

  it('подставляет цену из каталога и сохраняет подписку', async () => {
    await render(<Add />);
    await fireEvent.changeText(screen.getByPlaceholderText('Поиск сервиса'), 'netf');
    await fireEvent.press(screen.getByText('Netflix'));
    await fireEvent.press(screen.getByText('Сохранить'));

    const items = useSubscriptions.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Netflix');
    expect(items[0].catalogId).toBe('netflix');
    expect(items[0].amountMinor).toBe(799);
    expect(items[0].cancelUrl).toBe('https://www.netflix.com/cancelplan');
    expect(mockBack).toHaveBeenCalled();
  });

  it('не сохраняет подписку с неразборчивой суммой', async () => {
    await render(<Add />);
    await fireEvent.changeText(screen.getByPlaceholderText('Поиск сервиса'), 'netf');
    await fireEvent.press(screen.getByText('Netflix'));
    await fireEvent.changeText(screen.getByTestId('amount-input'), 'дорого');
    await fireEvent.press(screen.getByText('Сохранить'));

    expect(useSubscriptions.getState().items).toHaveLength(0);
    expect(screen.getByText(/Введите сумму/)).toBeTruthy();
  });

  it('не сохраняет подписку с неразборчивой датой', async () => {
    await render(<Add />);
    await fireEvent.press(screen.getByText('Своя подписка'));
    await fireEvent.changeText(screen.getByTestId('name-input'), 'Спортзал');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '45');
    await fireEvent.changeText(screen.getByTestId('date-input'), 'завтра');
    await fireEvent.press(screen.getByText('Сохранить'));

    expect(useSubscriptions.getState().items).toHaveLength(0);
    expect(screen.getByText(/Дата в формате/)).toBeTruthy();
  });

  it('позволяет добавить свою подписку без каталога', async () => {
    await render(<Add />);
    await fireEvent.press(screen.getByText('Своя подписка'));
    await fireEvent.changeText(screen.getByTestId('name-input'), 'Спортзал');
    await fireEvent.changeText(screen.getByTestId('amount-input'), '45');
    await fireEvent.press(screen.getByText('Сохранить'));

    const items = useSubscriptions.getState().items;
    expect(items[0].name).toBe('Спортзал');
    expect(items[0].amountMinor).toBe(4500);
    expect(items[0].catalogId).toBeNull();
  });
});
