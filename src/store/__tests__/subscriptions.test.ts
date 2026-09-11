import { useSubscriptions } from '../subscriptions';
import { NewSubscriptionInput } from '../../domain/subscription';

const input: NewSubscriptionInput = {
  catalogId: 'netflix', name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '', reminderDaysBefore: 3,
};

beforeEach(() => {
  useSubscriptions.setState({ items: [] });
});

describe('стор подписок', () => {
  it('добавляет подписку и выдаёт ей id', () => {
    const id = useSubscriptions.getState().add(input);
    const items = useSubscriptions.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(id);
    expect(items[0].status).toBe('active');
  });

  it('отменяет и возвращает из архива', () => {
    const id = useSubscriptions.getState().add(input);

    useSubscriptions.getState().cancel(id, '2026-09-11');
    expect(useSubscriptions.getState().items[0].status).toBe('canceled');

    useSubscriptions.getState().restore(id);
    expect(useSubscriptions.getState().items[0].status).toBe('active');
  });

  it('обновляет сумму', () => {
    const id = useSubscriptions.getState().add(input);
    useSubscriptions.getState().update(id, { amountMinor: 1799 });
    expect(useSubscriptions.getState().items[0].amountMinor).toBe(1799);
  });

  it('удаляет подписку', () => {
    const id = useSubscriptions.getState().add(input);
    useSubscriptions.getState().remove(id);
    expect(useSubscriptions.getState().items).toHaveLength(0);
  });
});
