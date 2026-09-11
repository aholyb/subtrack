import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { name: string; color: string; size?: number };

export function Monogram({ name, color, size = 44 }: Props) {
  const letter = name.trim().charAt(0).toUpperCase();

  return (
    <View
      testID="monogram"
      style={[styles.box, { width: size, height: size, borderRadius: size / 4, backgroundColor: color }]}
    >
      <Text style={[styles.letter, { fontSize: size * 0.45 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  letter: { color: '#FFFFFF', fontWeight: '700' },
});
