import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from './theme';

export function FxBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Text style={styles.banner}>
      Подписок без курса: {count} — показаны в своей валюте
    </Text>
  );
}

const styles = StyleSheet.create({
  banner: {
    color: theme.accent, fontSize: 13, marginBottom: 12,
    borderColor: theme.accent, borderWidth: 1,
    borderRadius: 10, padding: 10,
  },
});
