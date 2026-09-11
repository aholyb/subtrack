import React from 'react';
import { Text } from 'react-native';
import { Screen } from '../../src/ui/Screen';
import { theme } from '../../src/ui/theme';

export default function Settings() {
  return (
    <Screen title="Настройки">
      <Text style={{ color: theme.textDim, fontSize: 15 }}>Скоро.</Text>
    </Screen>
  );
}
