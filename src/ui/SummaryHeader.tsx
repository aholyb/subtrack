import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';
import { formatMoney } from '../domain/money';
import { FxFreshness } from '../domain/fx';
import { Totals } from '../domain/subscriptionOps';

type Props = { totals: Totals; freshness: FxFreshness; cacheDate: string | null };

export function SummaryHeader({ totals, freshness, cacheDate }: Props) {
  // Без курса вообще долларовый итог не показывается: цифра, посчитанная по
  // выдуманному курсу, хуже отсутствующей — по ней принимают решения о деньгах.
  if (freshness === 'missing' && totals.unconvertible.length > 0) {
    return (
      <View>
        <Text style={styles.unavailable}>Нет курса — итог в долларах недоступен</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.monthly}>{formatMoney(totals.monthlyUsdMinor, 'USD')}</Text>
      <Text style={styles.yearly}>({formatMoney(totals.yearlyUsdMinor, 'USD')} / год)</Text>
      {freshness === 'stale' && cacheDate ? (
        <Text style={styles.note}>курс от {cacheDate}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  monthly: { color: theme.text, fontSize: 44, fontWeight: '800' },
  yearly: { color: theme.textDim, fontSize: 16, marginTop: 2 },
  note: { color: theme.textDim, fontSize: 12, marginTop: 6 },
  unavailable: { color: theme.accent, fontSize: 16, fontWeight: '600' },
});
