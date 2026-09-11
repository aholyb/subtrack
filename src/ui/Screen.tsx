import React, { ReactNode } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useAppInsets } from './safeArea';
import { theme } from './theme';

type Props = { title: string; subtitle?: string; children: ReactNode };

export function Screen({ title, subtitle, children }: Props) {
  const insets = useAppInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{
        padding: theme.space,
        paddingTop: insets.top + theme.space,
        paddingBottom: insets.bottom + 40,
      }}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={{ height: theme.space }} />
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.bg },
  title: { color: theme.text, fontSize: 34, fontWeight: '800' },
  subtitle: { color: theme.textDim, fontSize: 16, marginTop: 4 },
});
