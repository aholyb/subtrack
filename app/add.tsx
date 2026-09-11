import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../src/ui/Screen';
import { Button } from '../src/ui/Button';
import { FormField } from '../src/ui/FormField';
import { Monogram } from '../src/ui/Monogram';
import { theme } from '../src/ui/theme';
import { searchCatalog, CatalogEntry } from '../src/domain/catalog';
import { parseAmountToMinor } from '../src/domain/money';
import { todayString } from '../src/domain/date';
import { BillingCycle } from '../src/domain/billing';
import { CategoryId } from '../src/domain/subscription';
import { useSubscriptions } from '../src/store/subscriptions';

const CYCLES: Array<{ id: BillingCycle; label: string }> = [
  { id: 'weekly', label: 'Неделя' },
  { id: 'monthly', label: 'Месяц' },
  { id: 'quarterly', label: 'Квартал' },
  { id: 'yearly', label: 'Год' },
];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export default function Add() {
  const router = useRouter();
  const add = useSubscriptions((s) => s.add);

  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<CatalogEntry | null>(null);
  const [custom, setCustom] = useState(false);

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [firstBillingDate, setFirstBillingDate] = useState(todayString());
  const [error, setError] = useState<string | null>(null);

  const choose = (entry: CatalogEntry) => {
    const plan = entry.defaultPlans[0];
    setPicked(entry);
    setName(entry.name);
    if (plan) {
      setAmount(String(plan.amountMinor / 100));
      setCurrency(plan.currency);
      setCycle(plan.cycle);
    }
  };

  const save = () => {
    if (name.trim() === '') {
      setError('Введите название');
      return;
    }
    const amountMinor = parseAmountToMinor(amount);
    if (amountMinor === null) {
      setError('Введите сумму в формате 15.49');
      return;
    }
    if (!DATE_PATTERN.test(firstBillingDate)) {
      setError('Дата в формате ГГГГ-ММ-ДД');
      return;
    }

    add({
      catalogId: picked?.id ?? null,
      name: name.trim(),
      categoryId: (picked?.categoryId ?? 'other') as CategoryId,
      amountMinor,
      currency: currency.trim().toUpperCase(),
      cycle,
      firstBillingDate,
      trialEndsAt: null,
      paymentMethod: 'card',
      cancelUrl: picked?.cancelUrl ?? null,
      note: '',
      reminderDaysBefore: 3,
    });
    router.back();
  };

  const showForm = picked !== null || custom;

  return (
    <Screen title="Добавить" subtitle="Выбери сервис или заведи свой">
      {!showForm ? (
        <>
          <TextInput
            placeholder="Поиск сервиса"
            placeholderTextColor={theme.textDim}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            style={styles.search}
          />
          {searchCatalog(query).slice(0, 20).map((entry) => (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              onPress={() => choose(entry)}
              style={styles.row}
            >
              <Monogram name={entry.name} color={entry.color} size={36} />
              <Text style={styles.rowName}>{entry.name}</Text>
            </Pressable>
          ))}
          <View style={{ height: 12 }} />
          <Button title="Своя подписка" onPress={() => setCustom(true)} />
        </>
      ) : (
        <>
          <FormField testID="name-input" label="Название" value={name} onChangeText={setName} />
          <FormField
            testID="amount-input" label={`Сумма, ${currency}`} value={amount}
            onChangeText={setAmount} keyboardType="decimal-pad" placeholder="15.49"
          />
          <FormField
            testID="currency-input" label="Валюта" value={currency} onChangeText={setCurrency}
          />

          <Text style={styles.label}>Цикл</Text>
          <View style={styles.cycles}>
            {CYCLES.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() => setCycle(c.id)}
                style={[styles.chip, cycle === c.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, cycle === c.id && styles.chipTextActive]}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <FormField
            testID="date-input" label="Первое списание (ГГГГ-ММ-ДД)"
            value={firstBillingDate} onChangeText={setFirstBillingDate}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Сохранить" variant="primary" onPress={save} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: {
    color: theme.text, fontSize: 16, backgroundColor: theme.card,
    borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowName: { color: theme.text, fontSize: 16 },
  label: { color: theme.textDim, fontSize: 13, marginBottom: 6 },
  cycles: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: theme.card, borderColor: theme.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.textDim, fontSize: 14 },
  chipTextActive: { color: theme.text, fontWeight: '600' },
  error: { color: theme.accent, fontSize: 14, marginBottom: 12 },
});
