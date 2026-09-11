import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SummaryHeader } from '../SummaryHeader';

describe('SummaryHeader', () => {
  it('показывает месяц крупно, а год в скобках', async () => {
    await render(
      <SummaryHeader
        totals={{ monthlyUsdMinor: 4782, yearlyUsdMinor: 57384, unconvertible: [] }}
        freshness="fresh"
        cacheDate={null}
      />,
    );
    expect(screen.getByText('$47.82')).toBeTruthy();
    expect(screen.getByText('($573.84 / год)')).toBeTruthy();
  });

  it('подписывает дату курса, когда он протух', async () => {
    await render(
      <SummaryHeader
        totals={{ monthlyUsdMinor: 4782, yearlyUsdMinor: 57384, unconvertible: [] }}
        freshness="stale"
        cacheDate="2026-09-10"
      />,
    );
    expect(screen.getByText(/курс от 2026-09-10/)).toBeTruthy();
  });

  it('не показывает долларовый итог, когда курса нет совсем', async () => {
    await render(
      <SummaryHeader
        totals={{
          monthlyUsdMinor: 0,
          yearlyUsdMinor: 0,
          unconvertible: [
            {
              id: 'a', catalogId: null, name: 'Spotify', categoryId: 'music',
              amountMinor: 29900, currency: 'UAH', cycle: 'monthly',
              firstBillingDate: '2026-09-20', trialEndsAt: null,
              paymentMethod: 'card', cancelUrl: null, note: '',
              status: 'active', canceledAt: null, reminderDaysBefore: null,
              createdAt: '', updatedAt: '',
            },
          ],
        }}
        freshness="missing"
        cacheDate={null}
      />,
    );
    expect(screen.queryByText('$0.00')).toBeNull();
    expect(screen.getByText(/итог в долларах недоступен/)).toBeTruthy();
  });
});
