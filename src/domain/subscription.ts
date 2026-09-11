import { BillingCycle } from './billing';
import { DateString } from './date';

export type CategoryId =
  | 'video' | 'music' | 'ai' | 'work'
  | 'cloud' | 'games' | 'news' | 'fitness' | 'other';

export type PaymentMethod = 'appstore' | 'card' | 'paypal' | 'other';

export type Subscription = {
  id: string;
  catalogId: string | null;
  name: string;
  categoryId: CategoryId;

  /** Целые минорные единицы: 1549 означает 15.49. */
  amountMinor: number;
  currency: string;
  cycle: BillingCycle;

  firstBillingDate: DateString;
  trialEndsAt: DateString | null;

  paymentMethod: PaymentMethod;
  cancelUrl: string | null;
  note: string;

  status: 'active' | 'canceled';
  canceledAt: DateString | null;

  /** null означает «не напоминать». */
  reminderDaysBefore: number | null;

  createdAt: string;
  updatedAt: string;
};

export type NewSubscriptionInput = Omit<
  Subscription, 'id' | 'status' | 'canceledAt' | 'createdAt' | 'updatedAt'
>;

export const CATEGORIES: Array<{ id: CategoryId; label: string; color: string }> = [
  { id: 'video', label: 'Видео', color: '#FF3D00' },
  { id: 'music', label: 'Музыка', color: '#1DB954' },
  { id: 'ai', label: 'AI', color: '#8B5CF6' },
  { id: 'work', label: 'Работа', color: '#3B82F6' },
  { id: 'cloud', label: 'Облако', color: '#06B6D4' },
  { id: 'games', label: 'Игры', color: '#F59E0B' },
  { id: 'news', label: 'Новости', color: '#EC4899' },
  { id: 'fitness', label: 'Спорт', color: '#10B981' },
  { id: 'other', label: 'Прочее', color: '#8A8A8A' },
];
