import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from './theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'secondary', disabled }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && { backgroundColor: theme.accent },
        variant === 'danger' && { borderColor: theme.accent, borderWidth: 1 },
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text style={[styles.title, variant === 'danger' && { color: theme.accent }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.card,
    borderRadius: theme.radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  title: { color: theme.text, fontSize: 16, fontWeight: '600' },
});
