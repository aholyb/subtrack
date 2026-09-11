import {
  PERIODS_PER_YEAR, yearlyMinor, monthlyMinor, formatMoney, parseAmountToMinor,
} from '../money';

describe('нормализация к году и месяцу', () => {
  it('оставляет месячную сумму как есть', () => {
    expect(monthlyMinor(1549, 'monthly')).toBeCloseTo(1549, 6);
    expect(yearlyMinor(1549, 'monthly')).toBeCloseTo(18588, 6);
  });

  it('делит годовую сумму на двенадцать', () => {
    expect(monthlyMinor(11988, 'yearly')).toBeCloseTo(999, 6);
  });

  it('считает год как 365.25 дня, а не как 52 недели', () => {
    // $1.00 в неделю — это $4.35 в месяц, а не $4.00.
    expect(PERIODS_PER_YEAR.weekly).toBeCloseTo(52.178571, 5);
    expect(formatMoney(monthlyMinor(100, 'weekly'), 'USD')).toBe('$4.35');
  });

  it('считает квартальную подписку', () => {
    expect(monthlyMinor(3000, 'quarterly')).toBeCloseTo(1000, 6);
  });

  it('не даёт расхождения между суммой месячных и годовой суммой', () => {
    // Округление на каждом шаге дало бы здесь расхождение в несколько центов,
    // которое пользователь увидит на главном экране.
    const subs: Array<[number, 'weekly' | 'monthly' | 'quarterly' | 'yearly']> = [
      [100, 'weekly'], [1549, 'monthly'], [3000, 'quarterly'], [11988, 'yearly'],
    ];
    const monthlyTotal = subs.reduce((sum, [a, c]) => sum + monthlyMinor(a, c), 0);
    const yearlyTotal = subs.reduce((sum, [a, c]) => sum + yearlyMinor(a, c), 0);
    expect(monthlyTotal * 12).toBeCloseTo(yearlyTotal, 6);
  });
});

describe('formatMoney', () => {
  it('округляет до центов один раз, на выводе', () => {
    expect(formatMoney(1549, 'USD')).toBe('$15.49');
    expect(formatMoney(1549.4, 'USD')).toBe('$15.49');
    expect(formatMoney(1549.6, 'USD')).toBe('$15.50');
  });

  it('ставит разделитель тысяч', () => {
    expect(formatMoney(123456, 'USD')).toBe('$1,234.56');
  });

  it('знает символы основных валют', () => {
    expect(formatMoney(1000, 'EUR')).toBe('€10.00');
    expect(formatMoney(1000, 'GBP')).toBe('£10.00');
  });

  it('для незнакомой валюты ставит код после суммы', () => {
    expect(formatMoney(1000, 'UAH')).toBe('10.00 UAH');
  });
});

describe('parseAmountToMinor', () => {
  it('принимает точку и запятую', () => {
    expect(parseAmountToMinor('15.49')).toBe(1549);
    expect(parseAmountToMinor('15,49')).toBe(1549);
  });

  it('дополняет недостающие разряды', () => {
    expect(parseAmountToMinor('15')).toBe(1500);
    expect(parseAmountToMinor('15.4')).toBe(1540);
  });

  it('принимает ноль', () => {
    expect(parseAmountToMinor('0')).toBe(0);
  });

  it('отвергает больше двух знаков после разделителя, а не округляет молча', () => {
    expect(parseAmountToMinor('15.499')).toBeNull();
  });

  it('отвергает мусор, пустую строку и отрицательные значения', () => {
    expect(parseAmountToMinor('')).toBeNull();
    expect(parseAmountToMinor('abc')).toBeNull();
    expect(parseAmountToMinor('-5')).toBeNull();
    expect(parseAmountToMinor('1.2.3')).toBeNull();
  });

  it('не спотыкается о пробелы по краям', () => {
    expect(parseAmountToMinor('  15.49  ')).toBe(1549);
  });
});
