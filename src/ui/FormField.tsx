import React from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { theme } from './theme';

type Props = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  testID?: string;
};

export function FormField({ label, value, onChangeText, placeholder, keyboardType, testID }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textDim}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: { color: theme.textDim, fontSize: 13, marginBottom: 6 },
  input: {
    color: theme.text, fontSize: 16,
    backgroundColor: theme.card, borderColor: theme.border,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
});
