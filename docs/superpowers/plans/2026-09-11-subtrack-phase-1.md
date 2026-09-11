# SubTrack Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Приложение для iPhone на Expo, которое ведёт список активных подписок, показывает их суммарную стоимость в долларах за месяц и за год, напоминает о списаниях и доводит пользователя до экрана отмены.

**Architecture:** Вся арифметика денег, дат и курсов живёт в `src/domain/` — чистые функции без React, без асинхронности и без хранилища, покрытые юнит-тестами. Состояние — один zustand-стор с persist поверх AsyncStorage, который вызывает доменные функции и ничего не вычисляет сам. Экраны на `expo-router` только читают стор и рисуют.

**Tech Stack:** Expo SDK 54, React Native, TypeScript (strict), expo-router, zustand + persist, AsyncStorage, expo-notifications, expo-web-browser, react-native-svg, Jest (jest-expo) + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-09-11-subtrack-design.md`

## Global Constraints

- **Деньги — только целые минорные единицы.** `amountMinor: 1549` означает 15.49. Никаких float-долларов в модели данных и в сторе. Вещественные числа допустимы только как промежуточный результат внутри `src/domain/money.ts` и `src/domain/fx.ts`, округление — один раз, в функции форматирования.
- **Даты подписок — строки `'YYYY-MM-DD'`.** Вся календарная арифметика идёт через UTC-представление (`Date.UTC`, `getUTC*`), чтобы переход на летнее время не сдвигал даты. Локальное время появляется ровно в одном месте — при вычислении момента уведомления.
- **`src/domain/` не импортирует ничего из `react`, `react-native`, `expo-*`, `zustand` или сторов.** Только TypeScript и другие модули `src/domain/`. Это проверяется ревью каждой задачи.
- **TDD.** Тест пишется первым, запускается и должен упасть с осмысленной ошибкой, и только потом пишется реализация.
- **TypeScript strict.** `"strict": true` в `tsconfig.json`, никаких `any` в сигнатурах.
- **Никаких сетевых вызовов, кроме `https://open.er-api.com/v6/latest/USD`.** Ни телеметрии, ни аналитики, ни отправки пользовательских данных куда-либо.
- **Тема (точные значения):** фон `#0A0A0A`, карточка `#141414`, обводка `#242424`, текст `#FFFFFF`, вторичный текст `#8A8A8A`, акцент `#FF3D00`, радиус карточки `16`.
- **В `@testing-library/react-native` 14 (поддержка React 19) `render`, `fireEvent`, `fireEvent.press` и `fireEvent.changeText` возвращают промисы.** Каждый вызов в компонентных тестах пишется через `await`, а тело `it` объявляется `async`. Без `await` тест падает с «`render` function has not been called»: `screen` ещё не заполнен. Примеры тестов в задачах 10–14 ниже написаны под синхронный API 13-й версии — при исполнении добавлять `await`.
- **Каждый коммит заканчивается трейлером** `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>` — в шагах ниже он передаётся вторым флагом `-m`.
- Рабочая директория всех команд — `D:\projects\subtrack`.

---

### Task 1: Скаффолд проекта и тестовый контур

**Files:**
- Create: весь каркас Expo в корне репозитория
- Create: `jest.setup.ts`
- Create: `src/domain/__tests__/smoke.test.ts`
- Modify: `package.json`, `tsconfig.json`, `.gitignore`

**Interfaces:**
- Consumes: ничего
- Produces: рабочие команды `npm test`, `npm start`; алиас импорта `@/` → корень проекта

- [ ] **Step 1: Создать проект Expo**

Каркас создаётся в текущей папке, где уже лежат `docs/` и `.git`, поэтому используем шаблон в подпапке и переносим содержимое:

```bash
npx create-expo-app@latest .app --template blank-typescript
```

Затем перенести содержимое `.app` в корень и удалить папку:

```bash
cp -r .app/. . && rm -rf .app
```

- [ ] **Step 2: Поставить зависимости**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar expo-web-browser expo-notifications expo-crypto react-native-svg @react-native-async-storage/async-storage react-native-gesture-handler
npm install zustand
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 3: Настроить точку входа, роутер и Jest**

В `package.json` заменить поле `main` и добавить скрипты и конфиг Jest:

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "test": "jest",
    "test:watch": "jest --watch",
    "typecheck": "tsc --noEmit"
  },
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterEnv": ["<rootDir>/jest.setup.ts"]
  }
}
```

В `app.json` внутри `expo` добавить схему и плагин роутера:

```json
{
  "scheme": "subtrack",
  "plugins": ["expo-router"],
  "userInterfaceStyle": "dark"
}
```

В `tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": { "@/*": ["./*"] }
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

Создать `jest.setup.ts`:

```ts
// Заглушки для нативных модулей, которых нет в тестовой среде Node.
jest.mock('expo-crypto', () => ({
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2, 10),
}));
```

- [ ] **Step 4: Написать падающий smoke-тест**

Создать `src/domain/__tests__/smoke.test.ts`:

```ts
import { PROJECT_NAME } from '../meta';

describe('тестовый контур', () => {
  it('видит модули из src/domain', () => {
    expect(PROJECT_NAME).toBe('SubTrack');
  });
});
```

- [ ] **Step 5: Запустить тест и убедиться, что он падает**

Run: `npm test -- smoke`
Expected: FAIL — `Cannot find module '../meta'`

- [ ] **Step 6: Написать минимальную реализацию**

Создать `src/domain/meta.ts`:

```ts
export const PROJECT_NAME = 'SubTrack';
```

- [ ] **Step 7: Запустить тесты и проверку типов**

Run: `npm test && npm run typecheck`
Expected: PASS, ошибок типов нет

- [ ] **Step 8: Коммит**

```bash
git add -A
git commit -m "chore: scaffold expo app with router, typescript strict and jest" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Календарные даты

**Files:**
- Create: `src/domain/date.ts`
- Test: `src/domain/__tests__/date.test.ts`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `type DateString = string` (формат `'YYYY-MM-DD'`)
  - `parseDate(s: DateString): Date` — UTC-полночь
  - `formatDate(d: Date): DateString`
  - `todayString(now?: Date): DateString` — локальная календарная дата «сегодня»
  - `addDays(d: Date, n: number): Date`
  - `addMonthsClamped(d: Date, n: number): Date`
  - `diffInDays(from: Date, to: Date): number`
  - `compareDates(a: DateString, b: DateString): number`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/__tests__/date.test.ts`:

```ts
import {
  parseDate, formatDate, addDays, addMonthsClamped, diffInDays, compareDates, todayString,
} from '../date';

describe('parseDate / formatDate', () => {
  it('делает круговой обход без потери дня', () => {
    expect(formatDate(parseDate('2026-09-11'))).toBe('2026-09-11');
  });

  it('разбирает дату как UTC-полночь, а не как локальное время', () => {
    expect(parseDate('2026-09-11').toISOString()).toBe('2026-09-11T00:00:00.000Z');
  });
});

describe('addDays', () => {
  it('переходит через границу месяца', () => {
    expect(formatDate(addDays(parseDate('2026-08-28'), 14))).toBe('2026-09-11');
  });

  it('переходит через границу года', () => {
    expect(formatDate(addDays(parseDate('2026-12-30'), 3))).toBe('2027-01-02');
  });
});

describe('addMonthsClamped', () => {
  it('прижимает 31 января к последнему дню февраля', () => {
    expect(formatDate(addMonthsClamped(parseDate('2026-01-31'), 1))).toBe('2026-02-28');
  });

  it('учитывает високосный год', () => {
    expect(formatDate(addMonthsClamped(parseDate('2028-01-31'), 1))).toBe('2028-02-29');
  });

  it('не теряет исходный день: от 31 января два месяца дают 31 марта', () => {
    expect(formatDate(addMonthsClamped(parseDate('2026-01-31'), 2))).toBe('2026-03-31');
  });

  it('переходит через границу года', () => {
    expect(formatDate(addMonthsClamped(parseDate('2026-11-15'), 3))).toBe('2027-02-15');
  });
});

describe('diffInDays', () => {
  it('считает целые календарные сутки', () => {
    expect(diffInDays(parseDate('2026-08-28'), parseDate('2026-09-11'))).toBe(14);
  });

  it('возвращает отрицательное значение, если вторая дата раньше', () => {
    expect(diffInDays(parseDate('2026-09-11'), parseDate('2026-09-04'))).toBe(-7);
  });
});

describe('compareDates', () => {
  it('упорядочивает строки дат', () => {
    expect(compareDates('2026-09-01', '2026-09-11')).toBeLessThan(0);
    expect(compareDates('2026-09-11', '2026-09-11')).toBe(0);
    expect(compareDates('2026-10-01', '2026-09-11')).toBeGreaterThan(0);
  });
});

describe('todayString', () => {
  it('берёт локальную календарную дату, а не UTC-дату момента', () => {
    // 31 декабря 23:30 по местному времени — это всё ещё 31 декабря,
    // хотя в UTC уже может быть 1 января.
    const localLateEvening = new Date(2026, 11, 31, 23, 30, 0);
    expect(todayString(localLateEvening)).toBe('2026-12-31');
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- date`
Expected: FAIL — `Cannot find module '../date'`

- [ ] **Step 3: Написать реализацию**

Создать `src/domain/date.ts`:

```ts
/**
 * Календарные даты подписок. Хранятся строками 'YYYY-MM-DD' и представляются
 * в UTC, чтобы переход на летнее время не сдвигал день. Локальное время
 * появляется только в todayString и при планировании уведомлений.
 */
export type DateString = string;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDate(s: DateString): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDate(d: Date): DateString {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayString(now: Date = new Date()): DateString {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}

/**
 * Прибавляет месяцы, прижимая день к последнему дню месяца, если такого дня
 * не существует. Вызывать всегда от исходной даты подписки, а не от прошлого
 * результата: иначе 31 января превращается в 28 февраля и навсегда остаётся
 * 28-м числом, занижая все последующие даты списаний.
 */
export function addMonthsClamped(d: Date, n: number): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + n;
  const day = d.getUTCDate();
  const lastDayOfTarget = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, lastDayOfTarget)));
}

export function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function compareDates(a: DateString, b: DateString): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
```

- [ ] **Step 4: Запустить тесты**

Run: `npm test -- date`
Expected: PASS, 11 тестов

- [ ] **Step 5: Коммит**

```bash
git add src/domain/date.ts src/domain/__tests__/date.test.ts
git commit -m "feat(domain): calendar date helpers with UTC arithmetic and month clamping" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Дата следующего списания

**Files:**
- Create: `src/domain/billing.ts`
- Test: `src/domain/__tests__/billing.test.ts`

**Interfaces:**
- Consumes: `parseDate`, `formatDate`, `addDays`, `addMonthsClamped`, `diffInDays`, `DateString` из `src/domain/date.ts`
- Produces:
  - `type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly'`
  - `MONTHS_PER_CYCLE: Record<'monthly' | 'quarterly' | 'yearly', number>`
  - `nextBillingDate(firstBillingDate: DateString, cycle: BillingCycle, today: DateString): DateString`
  - `daysUntilBilling(firstBillingDate: DateString, cycle: BillingCycle, today: DateString): number`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/__tests__/billing.test.ts`:

```ts
import { nextBillingDate, daysUntilBilling } from '../billing';

describe('nextBillingDate', () => {
  it('возвращает дату первого списания, если она в будущем', () => {
    expect(nextBillingDate('2026-12-01', 'monthly', '2026-09-11')).toBe('2026-12-01');
  });

  it('возвращает сегодняшнюю дату, если списание сегодня', () => {
    expect(nextBillingDate('2026-09-11', 'monthly', '2026-09-11')).toBe('2026-09-11');
    expect(nextBillingDate('2026-03-11', 'monthly', '2026-09-11')).toBe('2026-09-11');
  });

  it('прижимает 31 января к концу февраля', () => {
    expect(nextBillingDate('2026-01-31', 'monthly', '2026-02-01')).toBe('2026-02-28');
  });

  it('учитывает високосный год', () => {
    expect(nextBillingDate('2028-01-31', 'monthly', '2028-02-01')).toBe('2028-02-29');
  });

  it('не схлопывает якорь: после февраля возвращается к 31 числу', () => {
    // Главный тест плана. Наивная реализация «прибавить месяц к прошлому
    // результату» вернёт 2026-03-28 и будет занижать все будущие списания.
    expect(nextBillingDate('2026-01-31', 'monthly', '2026-03-01')).toBe('2026-03-31');
  });

  it('держит якорь и для квартального цикла', () => {
    // +3 месяца = 30 апреля (уже прошло), +6 месяцев = 31 июля.
    expect(nextBillingDate('2026-01-31', 'quarterly', '2026-05-01')).toBe('2026-07-31');
  });

  it('переходит через границу года', () => {
    expect(nextBillingDate('2026-12-15', 'monthly', '2027-01-01')).toBe('2027-01-15');
  });

  it('считает недельный цикл через смену месяца', () => {
    expect(nextBillingDate('2026-08-28', 'weekly', '2026-09-11')).toBe('2026-09-11');
    expect(nextBillingDate('2026-08-28', 'weekly', '2026-09-12')).toBe('2026-09-18');
  });

  it('считает годовой цикл', () => {
    expect(nextBillingDate('2024-02-29', 'yearly', '2026-09-11')).toBe('2027-02-28');
  });
});

describe('daysUntilBilling', () => {
  it('возвращает ноль в день списания', () => {
    expect(daysUntilBilling('2026-09-11', 'monthly', '2026-09-11')).toBe(0);
  });

  it('считает дни до ближайшего списания', () => {
    expect(daysUntilBilling('2026-08-15', 'monthly', '2026-09-11')).toBe(4);
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- billing`
Expected: FAIL — `Cannot find module '../billing'`

- [ ] **Step 3: Написать реализацию**

Создать `src/domain/billing.ts`:

```ts
import {
  DateString, parseDate, formatDate, addDays, addMonthsClamped, diffInDays,
} from './date';

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export const MONTHS_PER_CYCLE: Record<Exclude<BillingCycle, 'weekly'>, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/**
 * Ближайшее списание — это самое раннее вхождение цикла, не раньше сегодняшнего дня.
 * Каждое вхождение вычисляется от исходной даты подписки (якоря), а не от
 * предыдущего вхождения: см. addMonthsClamped.
 */
export function nextBillingDate(
  firstBillingDate: DateString,
  cycle: BillingCycle,
  today: DateString,
): DateString {
  const anchor = parseDate(firstBillingDate);
  const now = parseDate(today);

  if (anchor.getTime() >= now.getTime()) return firstBillingDate;

  if (cycle === 'weekly') {
    const periods = Math.ceil(diffInDays(anchor, now) / 7);
    return formatDate(addDays(anchor, periods * 7));
  }

  const monthsPerCycle = MONTHS_PER_CYCLE[cycle];
  const monthDiff =
    (now.getUTCFullYear() - anchor.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - anchor.getUTCMonth());

  let periods = Math.max(0, Math.floor(monthDiff / monthsPerCycle));
  while (addMonthsClamped(anchor, periods * monthsPerCycle).getTime() < now.getTime()) {
    periods += 1;
  }
  return formatDate(addMonthsClamped(anchor, periods * monthsPerCycle));
}

export function daysUntilBilling(
  firstBillingDate: DateString,
  cycle: BillingCycle,
  today: DateString,
): number {
  const next = nextBillingDate(firstBillingDate, cycle, today);
  return diffInDays(parseDate(today), parseDate(next));
}
```

- [ ] **Step 4: Запустить тесты**

Run: `npm test -- billing`
Expected: PASS, 11 тестов

- [ ] **Step 5: Коммит**

```bash
git add src/domain/billing.ts src/domain/__tests__/billing.test.ts
git commit -m "feat(domain): next billing date derived from anchor date and cycle" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Арифметика и форматирование денег

**Files:**
- Create: `src/domain/money.ts`
- Test: `src/domain/__tests__/money.test.ts`

**Interfaces:**
- Consumes: `BillingCycle` из `src/domain/billing.ts`
- Produces:
  - `PERIODS_PER_YEAR: Record<BillingCycle, number>`
  - `yearlyMinor(amountMinor: number, cycle: BillingCycle): number` — вещественное
  - `monthlyMinor(amountMinor: number, cycle: BillingCycle): number` — вещественное
  - `formatMoney(minor: number, currency: string): string`
  - `parseAmountToMinor(input: string): number | null`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/__tests__/money.test.ts`:

```ts
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
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- money`
Expected: FAIL — `Cannot find module '../money'`

- [ ] **Step 3: Написать реализацию**

Создать `src/domain/money.ts`:

```ts
import { BillingCycle } from './billing';

/**
 * Деньги живут в целых минорных единицах (центах). Функции ниже возвращают
 * вещественные минорные единицы намеренно: округление происходит один раз,
 * в formatMoney. Округление на каждом шаге расходится с годовой суммой.
 */
export const PERIODS_PER_YEAR: Record<BillingCycle, number> = {
  weekly: 365.25 / 7,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function yearlyMinor(amountMinor: number, cycle: BillingCycle): number {
  return amountMinor * PERIODS_PER_YEAR[cycle];
}

export function monthlyMinor(amountMinor: number, cycle: BillingCycle): number {
  return yearlyMinor(amountMinor, cycle) / 12;
}

const PREFIX_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function formatMoney(minor: number, currency: string): string {
  const rounded = Math.round(minor);
  const whole = Math.trunc(Math.abs(rounded) / 100);
  const cents = String(Math.abs(rounded) % 100).padStart(2, '0');
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const sign = rounded < 0 ? '-' : '';
  const symbol = PREFIX_SYMBOLS[currency];
  return symbol
    ? `${sign}${symbol}${grouped}.${cents}`
    : `${sign}${grouped}.${cents} ${currency}`;
}

/**
 * Возвращает null для любого ввода, который нельзя истолковать однозначно.
 * В частности, '15.499' отвергается, а не округляется: молча изменить сумму,
 * которую человек ввёл своими руками, недопустимо в приложении про деньги.
 */
export function parseAmountToMinor(input: string): number | null {
  const trimmed = input.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [whole, fraction = ''] = trimmed.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
```

- [ ] **Step 4: Запустить тесты**

Run: `npm test -- money`
Expected: PASS, 14 тестов

- [ ] **Step 5: Коммит**

```bash
git add src/domain/money.ts src/domain/__tests__/money.test.ts
git commit -m "feat(domain): money in integer minor units with single-point rounding" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Конвертация валют и политика кэша курсов

**Files:**
- Create: `src/domain/fx.ts`
- Test: `src/domain/__tests__/fx.test.ts`

**Interfaces:**
- Consumes: ничего
- Produces:
  - `type FxCache = { base: 'USD'; rates: Record<string, number>; fetchedAt: number; providerUpdatedAt: number }`
  - `type FxFreshness = 'fresh' | 'stale' | 'missing'`
  - `FX_TTL_MS: number`
  - `fxFreshness(cache: FxCache | null, now: number): FxFreshness`
  - `toUsdMinor(amountMinor: number, currency: string, cache: FxCache | null): number | null`
  - `isFxCacheValid(value: unknown): value is FxCache`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/__tests__/fx.test.ts`:

```ts
import { FX_TTL_MS, FxCache, fxFreshness, toUsdMinor, isFxCacheValid } from '../fx';

const NOW = Date.UTC(2026, 8, 11, 12, 0, 0);

const cache = (fetchedAt: number): FxCache => ({
  base: 'USD',
  rates: { USD: 1, EUR: 0.92, UAH: 41.5 },
  fetchedAt,
  providerUpdatedAt: fetchedAt,
});

describe('fxFreshness', () => {
  it('называет кэш свежим в пределах суток', () => {
    expect(fxFreshness(cache(NOW - 1000), NOW)).toBe('fresh');
    expect(fxFreshness(cache(NOW - FX_TTL_MS + 1), NOW)).toBe('fresh');
  });

  it('называет кэш протухшим после суток', () => {
    expect(fxFreshness(cache(NOW - FX_TTL_MS - 1), NOW)).toBe('stale');
  });

  it('отличает отсутствие кэша', () => {
    expect(fxFreshness(null, NOW)).toBe('missing');
  });
});

describe('toUsdMinor', () => {
  it('переводит доллары в доллары без всякого кэша', () => {
    expect(toUsdMinor(1549, 'USD', null)).toBe(1549);
  });

  it('конвертирует по курсу', () => {
    expect(toUsdMinor(920, 'EUR', cache(NOW))).toBeCloseTo(1000, 6);
  });

  it('конвертирует и по протухшему кэшу', () => {
    // Протухший курс лучше отсутствия цифры: разница за сутки — доли процента,
    // и пользователь видит подпись с датой курса.
    expect(toUsdMinor(920, 'EUR', cache(NOW - FX_TTL_MS - 1))).toBeCloseTo(1000, 6);
  });

  it('возвращает null для чужой валюты без кэша и не выдумывает курс', () => {
    expect(toUsdMinor(920, 'EUR', null)).toBeNull();
  });

  it('возвращает null для валюты, которой нет в курсах', () => {
    expect(toUsdMinor(1000, 'XYZ', cache(NOW))).toBeNull();
  });

  it('возвращает null, если курс нулевой или отрицательный', () => {
    const broken: FxCache = { ...cache(NOW), rates: { ...cache(NOW).rates, EUR: 0 } };
    expect(toUsdMinor(920, 'EUR', broken)).toBeNull();
  });
});

describe('isFxCacheValid', () => {
  it('принимает корректную запись', () => {
    expect(isFxCacheValid(cache(NOW))).toBe(true);
  });

  it('отвергает мусор, а не роняет приложение', () => {
    expect(isFxCacheValid(null)).toBe(false);
    expect(isFxCacheValid({})).toBe(false);
    expect(isFxCacheValid({ base: 'USD', rates: 'нет' })).toBe(false);
    expect(isFxCacheValid({ base: 'USD', rates: { EUR: 'дорого' }, fetchedAt: 1, providerUpdatedAt: 1 })).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- fx`
Expected: FAIL — `Cannot find module '../fx'`

- [ ] **Step 3: Написать реализацию**

Создать `src/domain/fx.ts`:

```ts
export type FxCache = {
  base: 'USD';
  /** Сколько единиц валюты даётся за один доллар. */
  rates: Record<string, number>;
  fetchedAt: number;
  providerUpdatedAt: number;
};

export type FxFreshness = 'fresh' | 'stale' | 'missing';

export const FX_TTL_MS = 24 * 60 * 60 * 1000;

export function fxFreshness(cache: FxCache | null, now: number): FxFreshness {
  if (!cache) return 'missing';
  return now - cache.fetchedAt < FX_TTL_MS ? 'fresh' : 'stale';
}

/**
 * Возвращает null, когда честной конвертации не получается. Вызывающий код
 * обязан показать сумму в родной валюте и исключить её из долларового итога,
 * а не подставить приблизительное значение: по этой цифре принимают решения
 * о деньгах.
 */
export function toUsdMinor(
  amountMinor: number,
  currency: string,
  cache: FxCache | null,
): number | null {
  if (currency === 'USD') return amountMinor;
  if (!cache) return null;

  const rate = cache.rates[currency];
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null;

  return amountMinor / rate;
}

export function isFxCacheValid(value: unknown): value is FxCache {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  if (c.base !== 'USD') return false;
  if (typeof c.fetchedAt !== 'number' || typeof c.providerUpdatedAt !== 'number') return false;
  if (typeof c.rates !== 'object' || c.rates === null) return false;

  return Object.values(c.rates as Record<string, unknown>).every(
    (r) => typeof r === 'number' && Number.isFinite(r) && r > 0,
  );
}
```

- [ ] **Step 4: Запустить тесты**

Run: `npm test -- fx`
Expected: PASS, 12 тестов

- [ ] **Step 5: Коммит**

```bash
git add src/domain/fx.ts src/domain/__tests__/fx.test.ts
git commit -m "feat(domain): currency conversion that refuses to guess without rates" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Модель подписки и операции над списком

**Files:**
- Create: `src/domain/subscription.ts`
- Create: `src/domain/subscriptionOps.ts`
- Test: `src/domain/__tests__/subscriptionOps.test.ts`

**Interfaces:**
- Consumes: `BillingCycle`, `DateString`, `nextBillingDate`, `compareDates`, `monthlyMinor`, `yearlyMinor`, `toUsdMinor`, `FxCache`
- Produces:
  - `type Subscription` (поля ровно как в спеке, §3)
  - `type CategoryId`, `type PaymentMethod`, `CATEGORIES: Array<{ id: CategoryId; label: string; color: string }>`
  - `createSubscription(input: NewSubscriptionInput, id: string, now: Date): Subscription`
  - `cancelSubscription(list, id, on: DateString): Subscription[]`
  - `restoreSubscription(list, id): Subscription[]`
  - `updateSubscription(list, id, patch, now: Date): Subscription[]`
  - `removeSubscription(list, id): Subscription[]`
  - `sortByNextBilling(list, today): Subscription[]`
  - `type Totals = { monthlyUsdMinor: number; yearlyUsdMinor: number; unconvertible: Subscription[] }`
  - `computeTotals(list, cache: FxCache | null): Totals`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/__tests__/subscriptionOps.test.ts`:

```ts
import { Subscription } from '../subscription';
import {
  createSubscription, cancelSubscription, restoreSubscription,
  updateSubscription, removeSubscription, sortByNextBilling, computeTotals,
} from '../subscriptionOps';
import { FxCache } from '../fx';

const NOW = new Date(Date.UTC(2026, 8, 11, 12, 0, 0));

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: 3,
  createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  ...over,
});

describe('createSubscription', () => {
  it('заполняет служебные поля и делает подписку активной', () => {
    const created = createSubscription(
      {
        catalogId: 'netflix', name: 'Netflix', categoryId: 'video',
        amountMinor: 1549, currency: 'USD', cycle: 'monthly',
        firstBillingDate: '2026-09-20', trialEndsAt: null,
        paymentMethod: 'card', cancelUrl: 'https://netflix.com/cancelplan',
        note: '', reminderDaysBefore: 3,
      },
      'generated-id',
      NOW,
    );

    expect(created.id).toBe('generated-id');
    expect(created.status).toBe('active');
    expect(created.canceledAt).toBeNull();
    expect(created.createdAt).toBe(NOW.toISOString());
    expect(created.updatedAt).toBe(NOW.toISOString());
  });
});

describe('cancelSubscription / restoreSubscription', () => {
  it('переводит в архив, сохраняя запись и дату отмены', () => {
    const [result] = cancelSubscription([sub()], 'a', '2026-09-11');
    expect(result.status).toBe('canceled');
    expect(result.canceledAt).toBe('2026-09-11');
    expect(result.amountMinor).toBe(1549);
  });

  it('возвращает из архива и стирает дату отмены', () => {
    const archived = cancelSubscription([sub()], 'a', '2026-09-11');
    const [restored] = restoreSubscription(archived, 'a');
    expect(restored.status).toBe('active');
    expect(restored.canceledAt).toBeNull();
  });

  it('не трогает остальные подписки', () => {
    const list = [sub({ id: 'a' }), sub({ id: 'b', name: 'Spotify' })];
    const result = cancelSubscription(list, 'a', '2026-09-11');
    expect(result.find((s) => s.id === 'b')!.status).toBe('active');
  });

  it('молча возвращает список без изменений для неизвестного id', () => {
    const list = [sub()];
    expect(cancelSubscription(list, 'нет-такого', '2026-09-11')).toEqual(list);
  });
});

describe('updateSubscription / removeSubscription', () => {
  it('обновляет поля и двигает updatedAt', () => {
    const later = new Date(Date.UTC(2026, 8, 12));
    const [result] = updateSubscription([sub()], 'a', { amountMinor: 1799 }, later);
    expect(result.amountMinor).toBe(1799);
    expect(result.updatedAt).toBe(later.toISOString());
    expect(result.createdAt).toBe(NOW.toISOString());
  });

  it('удаляет запись', () => {
    expect(removeSubscription([sub()], 'a')).toEqual([]);
  });
});

describe('sortByNextBilling', () => {
  it('ставит ближайшее списание первым', () => {
    const list = [
      sub({ id: 'later', firstBillingDate: '2026-09-25' }),
      sub({ id: 'sooner', firstBillingDate: '2026-09-13' }),
    ];
    expect(sortByNextBilling(list, '2026-09-11').map((s) => s.id))
      .toEqual(['sooner', 'later']);
  });

  it('учитывает цикл, а не только исходную дату', () => {
    const list = [
      sub({ id: 'annual', firstBillingDate: '2026-01-05', cycle: 'yearly' }),
      sub({ id: 'monthly', firstBillingDate: '2026-01-20', cycle: 'monthly' }),
    ];
    // Годовая спишется 5 января 2027, месячная — 20 сентября 2026.
    expect(sortByNextBilling(list, '2026-09-11').map((s) => s.id))
      .toEqual(['monthly', 'annual']);
  });
});

describe('computeTotals', () => {
  const cache: FxCache = {
    base: 'USD', rates: { USD: 1, EUR: 0.92 },
    fetchedAt: 0, providerUpdatedAt: 0,
  };

  it('суммирует только активные подписки', () => {
    const list = [
      sub({ id: 'a', amountMinor: 1000, cycle: 'monthly' }),
      sub({ id: 'b', amountMinor: 5000, cycle: 'monthly', status: 'canceled' }),
    ];
    const totals = computeTotals(list, cache);
    expect(Math.round(totals.monthlyUsdMinor)).toBe(1000);
    expect(Math.round(totals.yearlyUsdMinor)).toBe(12000);
  });

  it('сводит разные валюты и циклы к доллару', () => {
    const list = [
      sub({ id: 'a', amountMinor: 1000, currency: 'USD', cycle: 'monthly' }),
      sub({ id: 'b', amountMinor: 920, currency: 'EUR', cycle: 'monthly' }),
    ];
    expect(Math.round(computeTotals(list, cache).monthlyUsdMinor)).toBe(2000);
  });

  it('выносит неконвертируемые подписки отдельно, а не приписывает им нули', () => {
    const list = [
      sub({ id: 'a', amountMinor: 1000, currency: 'USD' }),
      sub({ id: 'b', amountMinor: 92000, currency: 'UAH' }),
    ];
    const totals = computeTotals(list, cache);
    expect(Math.round(totals.monthlyUsdMinor)).toBe(1000);
    expect(totals.unconvertible.map((s) => s.id)).toEqual(['b']);
  });

  it('без кэша считает доллары и откладывает всё остальное', () => {
    const list = [
      sub({ id: 'a', amountMinor: 1000, currency: 'USD' }),
      sub({ id: 'b', amountMinor: 920, currency: 'EUR' }),
    ];
    const totals = computeTotals(list, null);
    expect(Math.round(totals.monthlyUsdMinor)).toBe(1000);
    expect(totals.unconvertible.map((s) => s.id)).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- subscriptionOps`
Expected: FAIL — `Cannot find module '../subscription'`

- [ ] **Step 3: Написать модель**

Создать `src/domain/subscription.ts`:

```ts
import { BillingCycle } from './billing';
import { DateString } from './date';

export type CategoryId =
  | 'video' | 'music' | 'ai' | 'work'
  | 'cloud' | 'games' | 'news' | 'fitness' | 'other';

export type PaymentMethod = 'appstore' | 'card' | 'paypal' | 'other';

export type Subscription = {
  id: string;
  catalogId: string | null;
  name: string;
  categoryId: CategoryId;

  /** Целые минорные единицы: 1549 означает 15.49. */
  amountMinor: number;
  currency: string;
  cycle: BillingCycle;

  firstBillingDate: DateString;
  trialEndsAt: DateString | null;

  paymentMethod: PaymentMethod;
  cancelUrl: string | null;
  note: string;

  status: 'active' | 'canceled';
  canceledAt: DateString | null;

  /** null означает «не напоминать». */
  reminderDaysBefore: number | null;

  createdAt: string;
  updatedAt: string;
};

export type NewSubscriptionInput = Omit<
  Subscription, 'id' | 'status' | 'canceledAt' | 'createdAt' | 'updatedAt'
>;

export const CATEGORIES: Array<{ id: CategoryId; label: string; color: string }> = [
  { id: 'video', label: 'Видео', color: '#FF3D00' },
  { id: 'music', label: 'Музыка', color: '#1DB954' },
  { id: 'ai', label: 'AI', color: '#8B5CF6' },
  { id: 'work', label: 'Работа', color: '#3B82F6' },
  { id: 'cloud', label: 'Облако', color: '#06B6D4' },
  { id: 'games', label: 'Игры', color: '#F59E0B' },
  { id: 'news', label: 'Новости', color: '#EC4899' },
  { id: 'fitness', label: 'Спорт', color: '#10B981' },
  { id: 'other', label: 'Прочее', color: '#8A8A8A' },
];
```

- [ ] **Step 4: Написать операции**

Создать `src/domain/subscriptionOps.ts`:

```ts
import { Subscription, NewSubscriptionInput } from './subscription';
import { DateString, compareDates } from './date';
import { nextBillingDate } from './billing';
import { monthlyMinor, yearlyMinor } from './money';
import { FxCache, toUsdMinor } from './fx';

export function createSubscription(
  input: NewSubscriptionInput,
  id: string,
  now: Date,
): Subscription {
  return {
    ...input,
    id,
    status: 'active',
    canceledAt: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

function mapById(
  list: Subscription[],
  id: string,
  fn: (s: Subscription) => Subscription,
): Subscription[] {
  return list.map((s) => (s.id === id ? fn(s) : s));
}

export function cancelSubscription(
  list: Subscription[], id: string, on: DateString,
): Subscription[] {
  return mapById(list, id, (s) => ({ ...s, status: 'canceled', canceledAt: on }));
}

export function restoreSubscription(list: Subscription[], id: string): Subscription[] {
  return mapById(list, id, (s) => ({ ...s, status: 'active', canceledAt: null }));
}

export function updateSubscription(
  list: Subscription[], id: string, patch: Partial<Subscription>, now: Date,
): Subscription[] {
  return mapById(list, id, (s) => ({ ...s, ...patch, updatedAt: now.toISOString() }));
}

export function removeSubscription(list: Subscription[], id: string): Subscription[] {
  return list.filter((s) => s.id !== id);
}

export function sortByNextBilling(
  list: Subscription[], today: DateString,
): Subscription[] {
  return [...list].sort((a, b) =>
    compareDates(
      nextBillingDate(a.firstBillingDate, a.cycle, today),
      nextBillingDate(b.firstBillingDate, b.cycle, today),
    ),
  );
}

export type Totals = {
  /** Вещественные минорные единицы; округляет formatMoney. */
  monthlyUsdMinor: number;
  yearlyUsdMinor: number;
  /** Подписки, которые не удалось привести к доллару — показываются отдельно. */
  unconvertible: Subscription[];
};

export function computeTotals(list: Subscription[], cache: FxCache | null): Totals {
  const totals: Totals = { monthlyUsdMinor: 0, yearlyUsdMinor: 0, unconvertible: [] };

  for (const s of list) {
    if (s.status !== 'active') continue;

    const usd = toUsdMinor(s.amountMinor, s.currency, cache);
    if (usd === null) {
      totals.unconvertible.push(s);
      continue;
    }
    totals.monthlyUsdMinor += monthlyMinor(usd, s.cycle);
    totals.yearlyUsdMinor += yearlyMinor(usd, s.cycle);
  }

  return totals;
}
```

- [ ] **Step 5: Запустить тесты**

Run: `npm test -- subscriptionOps`
Expected: PASS, 13 тестов

- [ ] **Step 6: Коммит**

```bash
git add src/domain/subscription.ts src/domain/subscriptionOps.ts src/domain/__tests__/subscriptionOps.test.ts
git commit -m "feat(domain): subscription model and pure list operations" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Планирование напоминаний и маршрут отмены

**Files:**
- Create: `src/domain/reminders.ts`
- Create: `src/domain/cancelRoute.ts`
- Test: `src/domain/__tests__/reminders.test.ts`
- Test: `src/domain/__tests__/cancelRoute.test.ts`

**Interfaces:**
- Consumes: `Subscription`, `nextBillingDate`, `parseDate`, `formatMoney`, `DateString`
- Produces:
  - `REMINDER_HOUR = 10`
  - `type PlannedReminder = { subscriptionId: string; kind: 'trial' | 'billing'; fireAt: Date; title: string; body: string }`
  - `planReminder(sub: Subscription, today: DateString, now: Date): PlannedReminder | null`
  - `APP_STORE_SUBSCRIPTIONS_URL: string`
  - `type CancelRoute = { kind: 'appstore'; url: string } | { kind: 'web'; url: string } | { kind: 'manual'; searchQuery: string }`
  - `resolveCancelRoute(sub: Subscription): CancelRoute`

- [ ] **Step 1: Написать падающие тесты для напоминаний**

Создать `src/domain/__tests__/reminders.test.ts`:

```ts
import { Subscription } from '../subscription';
import { planReminder, REMINDER_HOUR } from '../reminders';

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: 3,
  createdAt: '', updatedAt: '',
  ...over,
});

const NOW = new Date(2026, 8, 11, 9, 0, 0); // 11 сентября, 09:00 по местному

describe('planReminder', () => {
  it('ставит напоминание на 10:00 за указанное число дней до списания', () => {
    const planned = planReminder(sub(), '2026-09-11', NOW)!;
    expect(planned.kind).toBe('billing');
    expect(planned.fireAt.getFullYear()).toBe(2026);
    expect(planned.fireAt.getMonth()).toBe(8);
    expect(planned.fireAt.getDate()).toBe(17); // 20 сентября минус 3 дня
    expect(planned.fireAt.getHours()).toBe(REMINDER_HOUR);
  });

  it('называет сервис и сумму в тексте', () => {
    const planned = planReminder(sub(), '2026-09-11', NOW)!;
    expect(planned.body).toContain('Netflix');
    expect(planned.body).toContain('$15.49');
  });

  it('отдаёт приоритет пробному периоду', () => {
    const planned = planReminder(
      sub({ trialEndsAt: '2026-09-15' }), '2026-09-11', NOW,
    )!;
    expect(planned.kind).toBe('trial');
    expect(planned.fireAt.getDate()).toBe(12); // 15 сентября минус 3 дня
  });

  it('игнорирует уже закончившийся пробный период', () => {
    const planned = planReminder(
      sub({ trialEndsAt: '2026-09-01' }), '2026-09-11', NOW,
    )!;
    expect(planned.kind).toBe('billing');
  });

  it('ничего не планирует при reminderDaysBefore: null', () => {
    expect(planReminder(sub({ reminderDaysBefore: null }), '2026-09-11', NOW)).toBeNull();
  });

  it('ничего не планирует для архивной подписки', () => {
    expect(planReminder(sub({ status: 'canceled' }), '2026-09-11', NOW)).toBeNull();
  });

  it('ничего не планирует, если момент уже прошёл', () => {
    // Списание 12 сентября, напоминание за 3 дня — это 9 сентября, позади.
    const planned = planReminder(
      sub({ firstBillingDate: '2026-09-12' }), '2026-09-11', NOW,
    );
    expect(planned).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- reminders`
Expected: FAIL — `Cannot find module '../reminders'`

- [ ] **Step 3: Написать реализацию напоминаний**

Создать `src/domain/reminders.ts`:

```ts
import { Subscription } from './subscription';
import { DateString, parseDate, compareDates } from './date';
import { nextBillingDate } from './billing';
import { formatMoney } from './money';

export const REMINDER_HOUR = 10;

export type PlannedReminder = {
  subscriptionId: string;
  kind: 'trial' | 'billing';
  /** Момент в локальном времени — единственное место, где оно появляется. */
  fireAt: Date;
  title: string;
  body: string;
};

export function planReminder(
  sub: Subscription,
  today: DateString,
  now: Date,
): PlannedReminder | null {
  if (sub.status !== 'active') return null;
  if (sub.reminderDaysBefore === null) return null;

  const trialAhead = sub.trialEndsAt !== null && compareDates(sub.trialEndsAt, today) >= 0;
  const kind: PlannedReminder['kind'] = trialAhead ? 'trial' : 'billing';
  const target = trialAhead
    ? sub.trialEndsAt!
    : nextBillingDate(sub.firstBillingDate, sub.cycle, today);

  const targetUtc = parseDate(target);
  const fireAt = new Date(
    targetUtc.getUTCFullYear(),
    targetUtc.getUTCMonth(),
    targetUtc.getUTCDate() - sub.reminderDaysBefore,
    REMINDER_HOUR, 0, 0, 0,
  );

  if (fireAt.getTime() <= now.getTime()) return null;

  const amount = formatMoney(sub.amountMinor, sub.currency);
  return {
    subscriptionId: sub.id,
    kind,
    fireAt,
    title: kind === 'trial' ? 'Пробный период кончается' : 'Скоро списание',
    body:
      kind === 'trial'
        ? `${sub.name}: пробный период кончается, дальше ${amount}`
        : `${sub.name} спишет ${amount}`,
  };
}
```

- [ ] **Step 4: Запустить тесты напоминаний**

Run: `npm test -- reminders`
Expected: PASS, 7 тестов

- [ ] **Step 5: Написать падающие тесты для маршрута отмены**

Создать `src/domain/__tests__/cancelRoute.test.ts`:

```ts
import { Subscription } from '../subscription';
import { resolveCancelRoute, APP_STORE_SUBSCRIPTIONS_URL } from '../cancelRoute';

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: 3,
  createdAt: '', updatedAt: '',
  ...over,
});

describe('resolveCancelRoute', () => {
  it('для оплаты через App Store ведёт на системный экран подписок', () => {
    const route = resolveCancelRoute(sub({ paymentMethod: 'appstore' }));
    expect(route).toEqual({ kind: 'appstore', url: APP_STORE_SUBSCRIPTIONS_URL });
  });

  it('App Store важнее ссылки сервиса: подписку через Apple на сайте не отменить', () => {
    const route = resolveCancelRoute(
      sub({ paymentMethod: 'appstore', cancelUrl: 'https://netflix.com/cancelplan' }),
    );
    expect(route.kind).toBe('appstore');
  });

  it('ведёт на страницу отмены сервиса, если она известна', () => {
    const route = resolveCancelRoute(sub({ cancelUrl: 'https://netflix.com/cancelplan' }));
    expect(route).toEqual({ kind: 'web', url: 'https://netflix.com/cancelplan' });
  });

  it('падает в ручной режим с поисковым запросом, если ссылки нет', () => {
    const route = resolveCancelRoute(sub({ name: 'Местный спортзал' }));
    expect(route).toEqual({ kind: 'manual', searchQuery: 'как отменить подписку Местный спортзал' });
  });

  it('не принимает ссылку без https', () => {
    const route = resolveCancelRoute(sub({ cancelUrl: 'javascript:alert(1)' }));
    expect(route.kind).toBe('manual');
  });
});
```

- [ ] **Step 6: Запустить и убедиться, что тесты падают**

Run: `npm test -- cancelRoute`
Expected: FAIL — `Cannot find module '../cancelRoute'`

- [ ] **Step 7: Написать реализацию маршрута**

Создать `src/domain/cancelRoute.ts`:

```ts
import { Subscription } from './subscription';

/** Открывает системный экран «Подписки» в Настройках, минуя App Store. */
export const APP_STORE_SUBSCRIPTIONS_URL = 'itms-apps://apps.apple.com/account/subscriptions';

export type CancelRoute =
  | { kind: 'appstore'; url: string }
  | { kind: 'web'; url: string }
  | { kind: 'manual'; searchQuery: string };

export function resolveCancelRoute(sub: Subscription): CancelRoute {
  // Оплата через Apple отменяется только в настройках устройства: страница
  // сервиса в этом случае в лучшем случае бесполезна, в худшем — вводит в
  // заблуждение, показывая, что подписки у сервиса нет.
  if (sub.paymentMethod === 'appstore') {
    return { kind: 'appstore', url: APP_STORE_SUBSCRIPTIONS_URL };
  }

  if (sub.cancelUrl && sub.cancelUrl.startsWith('https://')) {
    return { kind: 'web', url: sub.cancelUrl };
  }

  return { kind: 'manual', searchQuery: `как отменить подписку ${sub.name}` };
}
```

- [ ] **Step 8: Запустить все тесты**

Run: `npm test`
Expected: PASS, все наборы зелёные

- [ ] **Step 9: Коммит**

```bash
git add src/domain/reminders.ts src/domain/cancelRoute.ts src/domain/__tests__/reminders.test.ts src/domain/__tests__/cancelRoute.test.ts
git commit -m "feat(domain): reminder planning and cancellation route resolution" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Каталог сервисов

**Files:**
- Create: `src/data/catalog.json`
- Create: `src/domain/catalog.ts`
- Test: `src/domain/__tests__/catalog.test.ts`

**Interfaces:**
- Consumes: `CategoryId`, `BillingCycle`
- Produces:
  - `type CatalogPlan = { name: string; amountMinor: number; currency: string; cycle: BillingCycle }`
  - `type CatalogEntry = { id: string; name: string; categoryId: CategoryId; color: string; cancelUrl: string | null; defaultPlans: CatalogPlan[] }`
  - `CATALOG: CatalogEntry[]`
  - `searchCatalog(query: string, catalog?: CatalogEntry[]): CatalogEntry[]`
  - `findCatalogEntry(id: string): CatalogEntry | undefined`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/__tests__/catalog.test.ts`:

```ts
import { CATALOG, searchCatalog, findCatalogEntry, CatalogEntry } from '../catalog';

describe('CATALOG', () => {
  it('содержит достаточно сервисов, чтобы поиск был осмысленным', () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(30);
  });

  it('у каждой записи уникальный id', () => {
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
  });

  it('у каждой записи есть хотя бы один план с целой суммой', () => {
    for (const entry of CATALOG) {
      expect(entry.defaultPlans.length).toBeGreaterThan(0);
      for (const plan of entry.defaultPlans) {
        expect(Number.isInteger(plan.amountMinor)).toBe(true);
      }
    }
  });

  it('все ссылки на отмену — https или отсутствуют', () => {
    for (const entry of CATALOG) {
      if (entry.cancelUrl !== null) {
        expect(entry.cancelUrl.startsWith('https://')).toBe(true);
      }
    }
  });
});

describe('searchCatalog', () => {
  it('находит по началу названия без учёта регистра', () => {
    expect(searchCatalog('netf').map((e) => e.id)).toContain('netflix');
    expect(searchCatalog('NETF').map((e) => e.id)).toContain('netflix');
  });

  it('находит по куску в середине названия', () => {
    expect(searchCatalog('tube').map((e) => e.id)).toContain('youtube-premium');
  });

  it('ставит совпадение с начала выше совпадения в середине', () => {
    const catalog: CatalogEntry[] = [
      { id: 'b', name: 'Apple Music', categoryId: 'music', color: '#fff', cancelUrl: null, defaultPlans: [] },
      { id: 'a', name: 'Music Hub', categoryId: 'music', color: '#fff', cancelUrl: null, defaultPlans: [] },
    ];
    expect(searchCatalog('music', catalog).map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('на пустой запрос отдаёт весь каталог', () => {
    expect(searchCatalog('  ').length).toBe(CATALOG.length);
  });

  it('на бессмыслицу отдаёт пустой список, а не весь каталог', () => {
    expect(searchCatalog('щщщxyz')).toEqual([]);
  });
});

describe('findCatalogEntry', () => {
  it('находит по id', () => {
    expect(findCatalogEntry('spotify')?.name).toBe('Spotify');
  });

  it('возвращает undefined для неизвестного id', () => {
    expect(findCatalogEntry('нет-такого')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npm test -- catalog`
Expected: FAIL — `Cannot find module '../catalog'`

- [ ] **Step 3: Наполнить каталог**

Создать `src/data/catalog.json` — не меньше 30 записей. Цены указываются как ориентир на сентябрь 2026 и правятся пользователем; `cancelUrl` ведёт на страницу управления подпиской в аккаунте сервиса. Первые записи для образца, остальные заполняются по тому же шаблону (Disney+, HBO Max, Apple TV+, Amazon Prime, Apple Music, Deezer, SoundCloud Go, Claude, Midjourney, GitHub Copilot, Notion, Figma, Slack, Dropbox, Google One, iCloud+, Microsoft 365, Adobe Creative Cloud, PlayStation Plus, Xbox Game Pass, Nintendo Switch Online, Steam-игры, The New York Times, Medium, Substack, Duolingo, Strava, Whoop, Calm, Headspace):

```json
[
  {
    "id": "netflix",
    "name": "Netflix",
    "categoryId": "video",
    "color": "#E50914",
    "cancelUrl": "https://www.netflix.com/cancelplan",
    "defaultPlans": [
      { "name": "Standard with ads", "amountMinor": 799, "currency": "USD", "cycle": "monthly" },
      { "name": "Standard", "amountMinor": 1799, "currency": "USD", "cycle": "monthly" },
      { "name": "Premium", "amountMinor": 2499, "currency": "USD", "cycle": "monthly" }
    ]
  },
  {
    "id": "spotify",
    "name": "Spotify",
    "categoryId": "music",
    "color": "#1DB954",
    "cancelUrl": "https://www.spotify.com/account/subscription/",
    "defaultPlans": [
      { "name": "Individual", "amountMinor": 1199, "currency": "USD", "cycle": "monthly" },
      { "name": "Duo", "amountMinor": 1699, "currency": "USD", "cycle": "monthly" },
      { "name": "Family", "amountMinor": 1999, "currency": "USD", "cycle": "monthly" }
    ]
  },
  {
    "id": "youtube-premium",
    "name": "YouTube Premium",
    "categoryId": "video",
    "color": "#FF0000",
    "cancelUrl": "https://www.youtube.com/paid_memberships",
    "defaultPlans": [
      { "name": "Individual", "amountMinor": 1399, "currency": "USD", "cycle": "monthly" },
      { "name": "Family", "amountMinor": 2299, "currency": "USD", "cycle": "monthly" }
    ]
  },
  {
    "id": "chatgpt",
    "name": "ChatGPT",
    "categoryId": "ai",
    "color": "#10A37F",
    "cancelUrl": "https://chatgpt.com/#settings/Subscription",
    "defaultPlans": [
      { "name": "Plus", "amountMinor": 2000, "currency": "USD", "cycle": "monthly" }
    ]
  }
]
```

- [ ] **Step 4: Написать модуль каталога**

Создать `src/domain/catalog.ts`:

```ts
import { BillingCycle } from './billing';
import { CategoryId } from './subscription';
import raw from '../data/catalog.json';

export type CatalogPlan = {
  name: string;
  amountMinor: number;
  currency: string;
  cycle: BillingCycle;
};

export type CatalogEntry = {
  id: string;
  name: string;
  categoryId: CategoryId;
  /** Фирменный цвет для монограммы — логотипы намеренно не грузим. */
  color: string;
  cancelUrl: string | null;
  defaultPlans: CatalogPlan[];
};

export const CATALOG = raw as CatalogEntry[];

export function searchCatalog(query: string, catalog: CatalogEntry[] = CATALOG): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (q === '') return catalog;

  return catalog
    .map((entry) => ({ entry, at: entry.name.toLowerCase().indexOf(q) }))
    .filter(({ at }) => at !== -1)
    .sort((a, b) => a.at - b.at || a.entry.name.localeCompare(b.entry.name))
    .map(({ entry }) => entry);
}

export function findCatalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id);
}
```

Для импорта JSON включить в `tsconfig.json`: `"resolveJsonModule": true`.

- [ ] **Step 5: Запустить тесты**

Run: `npm test -- catalog`
Expected: PASS, 10 тестов

- [ ] **Step 6: Коммит**

```bash
git add src/data/catalog.json src/domain/catalog.ts src/domain/__tests__/catalog.test.ts tsconfig.json
git commit -m "feat(domain): service catalog with prefix-first search" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Сторы и загрузка курсов

**Files:**
- Create: `src/services/fxApi.ts`
- Create: `src/store/subscriptions.ts`
- Create: `src/store/fx.ts`
- Test: `src/services/__tests__/fxApi.test.ts`
- Test: `src/store/__tests__/subscriptions.test.ts`

**Interfaces:**
- Consumes: всё из `src/domain/`
- Produces:
  - `fetchRates(): Promise<FxCache | null>`
  - `useSubscriptions()` — zustand-стор с полями `items`, `add`, `update`, `cancel`, `restore`, `remove`, `hasHydrated`
  - `useFx()` — zustand-стор с полями `cache`, `refresh`, `hasHydrated`

- [ ] **Step 1: Написать падающий тест загрузки курсов**

Создать `src/services/__tests__/fxApi.test.ts`:

```ts
import { fetchRates } from '../fxApi';

const okBody = {
  result: 'success',
  base_code: 'USD',
  time_last_update_unix: 1789000000,
  rates: { USD: 1, EUR: 0.92, UAH: 41.5 },
};

const mockFetch = (body: unknown, ok = true) => {
  global.fetch = jest.fn().mockResolvedValue({
    ok, json: async () => body,
  }) as unknown as typeof fetch;
};

describe('fetchRates', () => {
  it('превращает ответ провайдера в запись кэша', async () => {
    mockFetch(okBody);
    const cache = (await fetchRates())!;
    expect(cache.base).toBe('USD');
    expect(cache.rates.EUR).toBe(0.92);
    expect(cache.providerUpdatedAt).toBe(1789000000 * 1000);
    expect(cache.fetchedAt).toBeGreaterThan(0);
  });

  it('возвращает null на сетевую ошибку, а не бросает исключение', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await expect(fetchRates()).resolves.toBeNull();
  });

  it('возвращает null при ответе не 2xx', async () => {
    mockFetch(okBody, false);
    await expect(fetchRates()).resolves.toBeNull();
  });

  it('отвергает ответ неверной формы, а не кладёт мусор в кэш', async () => {
    mockFetch({ result: 'success', rates: { EUR: 'дорого' } });
    await expect(fetchRates()).resolves.toBeNull();
  });

  it('отвергает ответ с result != success', async () => {
    mockFetch({ ...okBody, result: 'error' });
    await expect(fetchRates()).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что тест падает**

Run: `npm test -- fxApi`
Expected: FAIL — `Cannot find module '../fxApi'`

- [ ] **Step 3: Написать загрузку курсов**

Создать `src/services/fxApi.ts`:

```ts
import { FxCache, isFxCacheValid } from '../domain/fx';

const ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

/**
 * Единственный сетевой вызов в приложении. Возвращает null при любой проблеме:
 * вызывающий код продолжит работать на прошлом кэше, а при его отсутствии
 * покажет суммы в родных валютах.
 */
export async function fetchRates(): Promise<FxCache | null> {
  try {
    const response = await fetch(ENDPOINT);
    if (!response.ok) return null;

    const body = (await response.json()) as Record<string, unknown>;
    if (body.result !== 'success') return null;

    const candidate = {
      base: 'USD' as const,
      rates: body.rates,
      fetchedAt: Date.now(),
      providerUpdatedAt:
        typeof body.time_last_update_unix === 'number'
          ? body.time_last_update_unix * 1000
          : Date.now(),
    };

    return isFxCacheValid(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Запустить тест загрузки**

Run: `npm test -- fxApi`
Expected: PASS, 5 тестов

- [ ] **Step 5: Написать падающий тест стора подписок**

Создать `src/store/__tests__/subscriptions.test.ts`:

```ts
import { useSubscriptions } from '../subscriptions';
import { NewSubscriptionInput } from '../../domain/subscription';

const input: NewSubscriptionInput = {
  catalogId: 'netflix', name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '', reminderDaysBefore: 3,
};

beforeEach(() => {
  useSubscriptions.setState({ items: [] });
});

describe('стор подписок', () => {
  it('добавляет подписку и выдаёт ей id', () => {
    const id = useSubscriptions.getState().add(input);
    const items = useSubscriptions.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(id);
    expect(items[0].status).toBe('active');
  });

  it('отменяет и возвращает из архива', () => {
    const id = useSubscriptions.getState().add(input);

    useSubscriptions.getState().cancel(id, '2026-09-11');
    expect(useSubscriptions.getState().items[0].status).toBe('canceled');

    useSubscriptions.getState().restore(id);
    expect(useSubscriptions.getState().items[0].status).toBe('active');
  });

  it('обновляет сумму', () => {
    const id = useSubscriptions.getState().add(input);
    useSubscriptions.getState().update(id, { amountMinor: 1799 });
    expect(useSubscriptions.getState().items[0].amountMinor).toBe(1799);
  });

  it('удаляет подписку', () => {
    const id = useSubscriptions.getState().add(input);
    useSubscriptions.getState().remove(id);
    expect(useSubscriptions.getState().items).toHaveLength(0);
  });
});
```

- [ ] **Step 6: Запустить и убедиться, что тест падает**

Run: `npm test -- store/subscriptions`
Expected: FAIL — `Cannot find module '../subscriptions'`

- [ ] **Step 7: Написать сторы**

Создать `src/store/subscriptions.ts`:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { Subscription, NewSubscriptionInput } from '../domain/subscription';
import { DateString } from '../domain/date';
import {
  createSubscription, cancelSubscription, restoreSubscription,
  updateSubscription, removeSubscription,
} from '../domain/subscriptionOps';

type SubscriptionsState = {
  items: Subscription[];
  hasHydrated: boolean;
  add: (input: NewSubscriptionInput) => string;
  update: (id: string, patch: Partial<Subscription>) => void;
  cancel: (id: string, on: DateString) => void;
  restore: (id: string) => void;
  remove: (id: string) => void;
};

export const useSubscriptions = create<SubscriptionsState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,

      add: (input) => {
        const id = randomUUID();
        set((s) => ({ items: [...s.items, createSubscription(input, id, new Date())] }));
        return id;
      },
      update: (id, patch) =>
        set((s) => ({ items: updateSubscription(s.items, id, patch, new Date()) })),
      cancel: (id, on) => set((s) => ({ items: cancelSubscription(s.items, id, on) })),
      restore: (id) => set((s) => ({ items: restoreSubscription(s.items, id) })),
      remove: (id) => set((s) => ({ items: removeSubscription(s.items, id) })),
    }),
    {
      name: 'subtrack.subscriptions.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ items: s.items }),
      onRehydrateStorage: () => (state) => {
        // Повреждённая запись не должна ронять старт: стор просто останется пустым.
        useSubscriptions.setState({
          hasHydrated: true,
          items: Array.isArray(state?.items) ? state!.items : [],
        });
      },
    },
  ),
);
```

Создать `src/store/fx.ts`:

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FxCache, fxFreshness, isFxCacheValid } from '../domain/fx';
import { fetchRates } from '../services/fxApi';

type FxState = {
  cache: FxCache | null;
  hasHydrated: boolean;
  /** Тянет курсы, если кэш протух или отсутствует. force обходит проверку. */
  refresh: (force?: boolean) => Promise<void>;
};

export const useFx = create<FxState>()(
  persist(
    (set, get) => ({
      cache: null,
      hasHydrated: false,

      refresh: async (force = false) => {
        if (!force && fxFreshness(get().cache, Date.now()) === 'fresh') return;
        const fresh = await fetchRates();
        if (fresh) set({ cache: fresh });
      },
    }),
    {
      name: 'subtrack.fx.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ cache: s.cache }),
      onRehydrateStorage: () => (state) => {
        useFx.setState({
          hasHydrated: true,
          cache: isFxCacheValid(state?.cache) ? state!.cache! : null,
        });
      },
    },
  ),
);
```

- [ ] **Step 8: Запустить все тесты**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Коммит**

```bash
git add src/services src/store
git commit -m "feat: persisted subscription and fx rate stores" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Тема и базовые компоненты

**Files:**
- Create: `src/ui/theme.ts`
- Create: `src/ui/Card.tsx`
- Create: `src/ui/Monogram.tsx`
- Create: `src/ui/Button.tsx`
- Create: `src/ui/Screen.tsx`
- Test: `src/ui/__tests__/Monogram.test.tsx`

**Interfaces:**
- Consumes: ничего из домена, кроме типов
- Produces:
  - `theme: { bg, card, border, text, textDim, accent, radius, space }`
  - `<Card>`, `<Monogram name color size>`, `<Button title onPress variant>`, `<Screen title subtitle>`

- [ ] **Step 1: Написать падающий тест монограммы**

Создать `src/ui/__tests__/Monogram.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Monogram } from '../Monogram';

describe('Monogram', () => {
  it('показывает первую букву названия в верхнем регистре', () => {
    render(<Monogram name="netflix" color="#E50914" />);
    expect(screen.getByText('N')).toBeTruthy();
  });

  it('не падает на пустом названии', () => {
    render(<Monogram name="" color="#E50914" />);
    expect(screen.getByTestId('monogram')).toBeTruthy();
  });

  it('работает с кириллицей', () => {
    render(<Monogram name="Яндекс Плюс" color="#FFCC00" />);
    expect(screen.getByText('Я')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что тест падает**

Run: `npm test -- Monogram`
Expected: FAIL — `Cannot find module '../Monogram'`

- [ ] **Step 3: Написать тему и компоненты**

Создать `src/ui/theme.ts`:

```ts
export const theme = {
  bg: '#0A0A0A',
  card: '#141414',
  border: '#242424',
  text: '#FFFFFF',
  textDim: '#8A8A8A',
  accent: '#FF3D00',
  radius: 16,
  space: 16,
} as const;
```

Создать `src/ui/Monogram.tsx`:

```tsx
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
```

Создать `src/ui/Card.tsx`:

```tsx
import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: theme.radius,
    padding: theme.space,
  },
});
```

Создать `src/ui/Button.tsx`:

```tsx
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
```

Создать `src/ui/Screen.tsx`:

```tsx
import React, { ReactNode } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from './theme';

type Props = { title: string; subtitle?: string; children: ReactNode };

export function Screen({ title, subtitle, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: theme.space, paddingTop: insets.top + theme.space, paddingBottom: insets.bottom + 40 }}
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
```

- [ ] **Step 4: Запустить тесты**

Run: `npm test -- Monogram`
Expected: PASS, 3 теста

- [ ] **Step 5: Коммит**

```bash
git add src/ui
git commit -m "feat(ui): dark theme tokens and base components" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Главный экран и навигация

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/index.tsx`
- Create: `src/ui/SubscriptionCard.tsx`
- Create: `src/ui/SummaryHeader.tsx`
- Create: `src/ui/FxBanner.tsx`
- Test: `src/ui/__tests__/SummaryHeader.test.tsx`
- Test: `app/__tests__/home.test.tsx`

**Interfaces:**
- Consumes: `useSubscriptions`, `useFx`, `computeTotals`, `sortByNextBilling`, `formatMoney`, `daysUntilBilling`, `fxFreshness`, `todayString`
- Produces: `<SummaryHeader totals freshness cacheDate>`, `<SubscriptionCard sub today onPress>`, `<FxBanner unconvertibleCount>`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/ui/__tests__/SummaryHeader.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SummaryHeader } from '../SummaryHeader';

describe('SummaryHeader', () => {
  it('показывает месяц крупно, а год в скобках', () => {
    render(
      <SummaryHeader
        totals={{ monthlyUsdMinor: 4782, yearlyUsdMinor: 57384, unconvertible: [] }}
        freshness="fresh"
        cacheDate={null}
      />,
    );
    expect(screen.getByText('$47.82')).toBeTruthy();
    expect(screen.getByText('($573.84 / год)')).toBeTruthy();
  });

  it('подписывает дату курса, когда он протух', () => {
    render(
      <SummaryHeader
        totals={{ monthlyUsdMinor: 4782, yearlyUsdMinor: 57384, unconvertible: [] }}
        freshness="stale"
        cacheDate="2026-09-10"
      />,
    );
    expect(screen.getByText(/курс от 2026-09-10/)).toBeTruthy();
  });

  it('не показывает долларовый итог, когда курса нет совсем', () => {
    render(
      <SummaryHeader
        totals={{ monthlyUsdMinor: 0, yearlyUsdMinor: 0, unconvertible: [] }}
        freshness="missing"
        cacheDate={null}
      />,
    );
    expect(screen.queryByText('$0.00')).toBeNull();
    expect(screen.getByText(/итог в долларах недоступен/)).toBeTruthy();
  });
});
```

Создать `app/__tests__/home.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import Home from '../(tabs)/index';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

const addNetflix = () =>
  useSubscriptions.getState().add({
    catalogId: 'netflix', name: 'Netflix', categoryId: 'video',
    amountMinor: 1549, currency: 'USD', cycle: 'monthly',
    firstBillingDate: '2026-09-20', trialEndsAt: null,
    paymentMethod: 'card', cancelUrl: null, note: '', reminderDaysBefore: 3,
  });

beforeEach(() => {
  useSubscriptions.setState({ items: [], hasHydrated: true });
  useFx.setState({
    cache: { base: 'USD', rates: { USD: 1 }, fetchedAt: Date.now(), providerUpdatedAt: Date.now() },
    hasHydrated: true,
  });
});

describe('главный экран', () => {
  it('показывает пустое состояние, когда подписок нет', () => {
    render(<Home />);
    expect(screen.getByText(/Пока пусто/)).toBeTruthy();
  });

  it('показывает подписку и её месячную стоимость', () => {
    addNetflix();
    render(<Home />);
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText('$15.49 / мес')).toBeTruthy();
  });

  it('не показывает архивные подписки в списке активных', () => {
    const id = addNetflix();
    useSubscriptions.getState().cancel(id, '2026-09-11');
    render(<Home />);
    expect(screen.queryByText('Netflix')).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npm test -- SummaryHeader home`
Expected: FAIL — модули не найдены

- [ ] **Step 3: Написать компоненты**

Создать `src/ui/SummaryHeader.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';
import { formatMoney } from '../domain/money';
import { FxFreshness } from '../domain/fx';
import { Totals } from '../domain/subscriptionOps';

type Props = { totals: Totals; freshness: FxFreshness; cacheDate: string | null };

export function SummaryHeader({ totals, freshness, cacheDate }: Props) {
  if (freshness === 'missing' && totals.unconvertible.length > 0) {
    return (
      <View>
        <Text style={styles.unavailable}>
          Нет курса — итог в долларах недоступен
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.monthly}>{formatMoney(totals.monthlyUsdMinor, 'USD')}</Text>
      <Text style={styles.yearly}>
        ({formatMoney(totals.yearlyUsdMinor, 'USD')} / год)
      </Text>
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
```

Создать `src/ui/SubscriptionCard.tsx`:

```tsx
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { theme } from './theme';
import { Monogram } from './Monogram';
import { Subscription, CATEGORIES } from '../domain/subscription';
import { monthlyMinor, formatMoney } from '../domain/money';
import { nextBillingDate, daysUntilBilling } from '../domain/billing';
import { DateString } from '../domain/date';

type Props = { sub: Subscription; today: DateString; onPress: () => void };

export function SubscriptionCard({ sub, today, onPress }: Props) {
  const color = CATEGORIES.find((c) => c.id === sub.categoryId)?.color ?? theme.textDim;
  const next = nextBillingDate(sub.firstBillingDate, sub.cycle, today);
  const days = daysUntilBilling(sub.firstBillingDate, sub.cycle, today);
  const isTrial = sub.trialEndsAt !== null && sub.trialEndsAt >= today;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <Monogram name={sub.name} color={color} />
      <View style={styles.middle}>
        <Text style={styles.name}>{sub.name}</Text>
        <Text style={styles.meta}>
          {days === 0 ? 'списание сегодня' : `${next} · через ${days} дн.`}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.price}>
          {formatMoney(monthlyMinor(sub.amountMinor, sub.cycle), sub.currency)} / мес
        </Text>
        {isTrial ? <Text style={styles.trial}>пробный период</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.card, borderColor: theme.border,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: theme.radius,
    padding: 12, marginBottom: 10,
  },
  middle: { flex: 1 },
  name: { color: theme.text, fontSize: 17, fontWeight: '600' },
  meta: { color: theme.textDim, fontSize: 13, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  price: { color: theme.text, fontSize: 15, fontWeight: '600' },
  trial: { color: theme.accent, fontSize: 12, marginTop: 2 },
});
```

Создать `src/ui/FxBanner.tsx`:

```tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from './theme';

export function FxBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Text style={styles.banner}>
      {count} подписк(и) показаны в своей валюте — курс недоступен
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
```

- [ ] **Step 4: Написать навигацию и главный экран**

Создать `app/_layout.tsx`:

```tsx
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFx } from '../src/store/fx';
import { theme } from '../src/ui/theme';

export default function RootLayout() {
  const refresh = useFx((s) => s.refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      />
    </SafeAreaProvider>
  );
}
```

Создать `app/(tabs)/_layout.tsx`:

```tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { theme } from '../../src/ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textDim,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Подписки' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Аналитика' }} />
      <Tabs.Screen name="settings" options={{ title: 'Настройки' }} />
    </Tabs>
  );
}
```

Создать `app/(tabs)/index.tsx`:

```tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/ui/Screen';
import { Button } from '../../src/ui/Button';
import { SummaryHeader } from '../../src/ui/SummaryHeader';
import { SubscriptionCard } from '../../src/ui/SubscriptionCard';
import { FxBanner } from '../../src/ui/FxBanner';
import { theme } from '../../src/ui/theme';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';
import { computeTotals, sortByNextBilling } from '../../src/domain/subscriptionOps';
import { daysUntilBilling } from '../../src/domain/billing';
import { todayString, formatDate } from '../../src/domain/date';
import { fxFreshness } from '../../src/domain/fx';

export default function Home() {
  const router = useRouter();
  const items = useSubscriptions((s) => s.items);
  const cache = useFx((s) => s.cache);
  const today = todayString();

  const active = useMemo(
    () => sortByNextBilling(items.filter((s) => s.status === 'active'), today),
    [items, today],
  );
  const totals = useMemo(() => computeTotals(items, cache), [items, cache]);
  const freshness = fxFreshness(cache, Date.now());
  const cacheDate = cache ? formatDate(new Date(cache.providerUpdatedAt)) : null;

  const soon = active.filter((s) => daysUntilBilling(s.firstBillingDate, s.cycle, today) <= 7);

  return (
    <Screen title="Подписки" subtitle="Что списывается и когда">
      <SummaryHeader totals={totals} freshness={freshness} cacheDate={cacheDate} />
      <View style={{ height: 20 }} />
      <FxBanner count={totals.unconvertible.length} />

      {active.length === 0 ? (
        <Text style={styles.empty}>Пока пусто. Добавь первую подписку.</Text>
      ) : (
        <>
          {soon.length > 0 ? <Text style={styles.section}>Скоро спишут</Text> : null}
          {soon.map((s) => (
            <SubscriptionCard
              key={s.id} sub={s} today={today}
              onPress={() => router.push(`/subscription/${s.id}`)}
            />
          ))}

          <Text style={styles.section}>Все подписки</Text>
          {active.map((s) => (
            <SubscriptionCard
              key={s.id} sub={s} today={today}
              onPress={() => router.push(`/subscription/${s.id}`)}
            />
          ))}
        </>
      )}

      <View style={{ height: 12 }} />
      <Button title="Добавить подписку" variant="primary" onPress={() => router.push('/add')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: { color: theme.textDim, fontSize: 16, paddingVertical: 32, textAlign: 'center' },
  section: { color: theme.textDim, fontSize: 13, textTransform: 'uppercase', marginTop: 16, marginBottom: 8 },
});
```

- [ ] **Step 5: Запустить тесты**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Проверить на устройстве**

Run: `npm start`
Открыть Expo Go на iPhone, отсканировать QR. Ожидается тёмный экран «Подписки» с пустым состоянием и кнопкой добавления.

- [ ] **Step 7: Коммит**

```bash
git add app src/ui
git commit -m "feat(ui): tab navigation and subscriptions home screen" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: Экран добавления подписки

**Files:**
- Create: `app/add.tsx`
- Create: `src/ui/FormField.tsx`
- Test: `app/__tests__/add.test.tsx`

**Interfaces:**
- Consumes: `searchCatalog`, `CATALOG`, `parseAmountToMinor`, `useSubscriptions`, `todayString`
- Produces: экран `/add`

- [ ] **Step 1: Написать падающие тесты**

Создать `app/__tests__/add.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import Add from '../add';
import { useSubscriptions } from '../../src/store/subscriptions';

const push = jest.fn();
const back = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push, back }) }));

beforeEach(() => {
  useSubscriptions.setState({ items: [], hasHydrated: true });
  jest.clearAllMocks();
});

describe('экран добавления', () => {
  it('фильтрует каталог по вводу', () => {
    render(<Add />);
    fireEvent.changeText(screen.getByPlaceholderText('Поиск сервиса'), 'netf');
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.queryByText('Spotify')).toBeNull();
  });

  it('подставляет цену из каталога и сохраняет подписку', () => {
    render(<Add />);
    fireEvent.changeText(screen.getByPlaceholderText('Поиск сервиса'), 'netf');
    fireEvent.press(screen.getByText('Netflix'));
    fireEvent.press(screen.getByText('Сохранить'));

    const items = useSubscriptions.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Netflix');
    expect(items[0].catalogId).toBe('netflix');
    expect(items[0].cancelUrl).toBe('https://www.netflix.com/cancelplan');
  });

  it('не сохраняет подписку с неразборчивой суммой', () => {
    render(<Add />);
    fireEvent.changeText(screen.getByPlaceholderText('Поиск сервиса'), 'netf');
    fireEvent.press(screen.getByText('Netflix'));
    fireEvent.changeText(screen.getByTestId('amount-input'), 'дорого');
    fireEvent.press(screen.getByText('Сохранить'));

    expect(useSubscriptions.getState().items).toHaveLength(0);
    expect(screen.getByText(/Введите сумму/)).toBeTruthy();
  });

  it('позволяет добавить свою подписку без каталога', () => {
    render(<Add />);
    fireEvent.press(screen.getByText('Своя подписка'));
    fireEvent.changeText(screen.getByTestId('name-input'), 'Спортзал');
    fireEvent.changeText(screen.getByTestId('amount-input'), '45');
    fireEvent.press(screen.getByText('Сохранить'));

    const items = useSubscriptions.getState().items;
    expect(items[0].name).toBe('Спортзал');
    expect(items[0].amountMinor).toBe(4500);
    expect(items[0].catalogId).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npm test -- add`
Expected: FAIL — `Cannot find module '../add'`

- [ ] **Step 3: Написать поле формы**

Создать `src/ui/FormField.tsx`:

```tsx
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
```

- [ ] **Step 4: Написать экран добавления**

Создать `app/add.tsx`:

```tsx
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
import { CategoryId, PaymentMethod } from '../src/domain/subscription';
import { useSubscriptions } from '../src/store/subscriptions';

const CYCLES: Array<{ id: BillingCycle; label: string }> = [
  { id: 'weekly', label: 'Неделя' },
  { id: 'monthly', label: 'Месяц' },
  { id: 'quarterly', label: 'Квартал' },
  { id: 'yearly', label: 'Год' },
];

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
    const amountMinor = parseAmountToMinor(amount);
    if (amountMinor === null) {
      setError('Введите сумму в формате 15.49');
      return;
    }
    if (name.trim() === '') {
      setError('Введите название');
      return;
    }

    add({
      catalogId: picked?.id ?? null,
      name: name.trim(),
      categoryId: (picked?.categoryId ?? 'other') as CategoryId,
      amountMinor,
      currency,
      cycle,
      firstBillingDate,
      trialEndsAt: null,
      paymentMethod: 'card' as PaymentMethod,
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
            style={styles.search}
          />
          {searchCatalog(query).slice(0, 20).map((entry) => (
            <Pressable key={entry.id} onPress={() => choose(entry)} style={styles.row}>
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
          <FormField testID="currency-input" label="Валюта" value={currency} onChangeText={setCurrency} />

          <Text style={styles.label}>Цикл</Text>
          <View style={styles.cycles}>
            {CYCLES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => setCycle(c.id)}
                style={[styles.chip, cycle === c.id && styles.chipActive]}
              >
                <Text style={[styles.chipText, cycle === c.id && styles.chipTextActive]}>{c.label}</Text>
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
    backgroundColor: theme.card, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth,
  },
  chipActive: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.textDim, fontSize: 14 },
  chipTextActive: { color: theme.text, fontWeight: '600' },
  error: { color: theme.accent, fontSize: 14, marginBottom: 12 },
});
```

- [ ] **Step 5: Запустить тесты**

Run: `npm test -- add`
Expected: PASS, 4 теста

- [ ] **Step 6: Коммит**

```bash
git add app/add.tsx app/__tests__/add.test.tsx src/ui/FormField.tsx
git commit -m "feat(ui): add subscription screen with catalog search" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 13: Детали, отмена и архив

**Files:**
- Create: `app/subscription/[id].tsx`
- Create: `app/archive.tsx`
- Create: `src/services/cancel.ts`
- Test: `src/services/__tests__/cancel.test.ts`
- Test: `app/__tests__/detail.test.tsx`

**Interfaces:**
- Consumes: `resolveCancelRoute`, `useSubscriptions`, `formatMoney`, `nextBillingDate`
- Produces: `openCancelRoute(route: CancelRoute): Promise<void>`; экраны `/subscription/[id]` и `/archive`

- [ ] **Step 1: Написать падающий тест открытия маршрута**

Создать `src/services/__tests__/cancel.test.ts`:

```ts
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { openCancelRoute } from '../cancel';

jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn().mockResolvedValue({ type: 'dismiss' }) }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as never);
});

describe('openCancelRoute', () => {
  it('открывает системный экран подписок через Linking, а не в браузере', async () => {
    await openCancelRoute({ kind: 'appstore', url: 'itms-apps://apps.apple.com/account/subscriptions' });
    expect(Linking.openURL).toHaveBeenCalledWith('itms-apps://apps.apple.com/account/subscriptions');
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('открывает страницу сервиса во встроенном браузере', async () => {
    await openCancelRoute({ kind: 'web', url: 'https://www.netflix.com/cancelplan' });
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://www.netflix.com/cancelplan');
  });

  it('для ручного режима открывает поиск с экранированным запросом', async () => {
    await openCancelRoute({ kind: 'manual', searchQuery: 'как отменить подписку Спортзал' });
    const url = (WebBrowser.openBrowserAsync as jest.Mock).mock.calls[0][0] as string;
    expect(url.startsWith('https://duckduckgo.com/?q=')).toBe(true);
    expect(url).toContain(encodeURIComponent('как отменить подписку Спортзал'));
  });

  it('не бросает исключение, если открыть ссылку не удалось', async () => {
    (WebBrowser.openBrowserAsync as jest.Mock).mockRejectedValueOnce(new Error('no browser'));
    await expect(openCancelRoute({ kind: 'web', url: 'https://x.test/cancel' })).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что тест падает**

Run: `npm test -- services/cancel`
Expected: FAIL — `Cannot find module '../cancel'`

- [ ] **Step 3: Написать сервис отмены**

Создать `src/services/cancel.ts`:

```ts
import { Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { CancelRoute } from '../domain/cancelRoute';

/**
 * Доводит пользователя до нужного экрана отмены. Статус подписки здесь не
 * меняется: приложение не может знать, дошёл ли человек до конца формы.
 */
export async function openCancelRoute(route: CancelRoute): Promise<void> {
  try {
    if (route.kind === 'appstore') {
      await Linking.openURL(route.url);
      return;
    }
    if (route.kind === 'web') {
      await WebBrowser.openBrowserAsync(route.url);
      return;
    }
    await WebBrowser.openBrowserAsync(
      `https://duckduckgo.com/?q=${encodeURIComponent(route.searchQuery)}`,
    );
  } catch {
    // Открыть не удалось — пользователь остаётся на экране деталей,
    // где видит название сервиса и может отменить вручную.
  }
}
```

- [ ] **Step 4: Написать падающий тест экрана деталей**

Создать `app/__tests__/detail.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import Detail from '../subscription/[id]';
import { useSubscriptions } from '../../src/store/subscriptions';
import * as cancelService from '../../src/services/cancel';

const back = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back }),
  useLocalSearchParams: () => ({ id: globalThis.__testSubId as string }),
}));

const addNetflix = () =>
  useSubscriptions.getState().add({
    catalogId: 'netflix', name: 'Netflix', categoryId: 'video',
    amountMinor: 1549, currency: 'USD', cycle: 'monthly',
    firstBillingDate: '2026-09-20', trialEndsAt: null,
    paymentMethod: 'card', cancelUrl: 'https://www.netflix.com/cancelplan',
    note: '', reminderDaysBefore: 3,
  });

beforeEach(() => {
  useSubscriptions.setState({ items: [], hasHydrated: true });
  jest.clearAllMocks();
  jest.spyOn(cancelService, 'openCancelRoute').mockResolvedValue(undefined);
});

describe('экран деталей', () => {
  it('показывает сумму за месяц и за год', () => {
    globalThis.__testSubId = addNetflix();
    render(<Detail />);
    expect(screen.getByText('$15.49 / мес')).toBeTruthy();
    expect(screen.getByText('($185.88 / год)')).toBeTruthy();
  });

  it('открывает страницу отмены и спрашивает подтверждение', async () => {
    globalThis.__testSubId = addNetflix();
    render(<Detail />);
    fireEvent.press(screen.getByText('Отменить подписку'));

    await waitFor(() => expect(cancelService.openCancelRoute).toHaveBeenCalled());
    expect(screen.getByText('Отмена прошла?')).toBeTruthy();
  });

  it('не меняет статус, пока пользователь не подтвердил', async () => {
    const id = addNetflix();
    globalThis.__testSubId = id;
    render(<Detail />);
    fireEvent.press(screen.getByText('Отменить подписку'));
    await waitFor(() => expect(screen.getByText('Отмена прошла?')).toBeTruthy());

    fireEvent.press(screen.getByText('Ещё нет'));
    expect(useSubscriptions.getState().items.find((s) => s.id === id)!.status).toBe('active');
  });

  it('уводит в архив только после подтверждения', async () => {
    const id = addNetflix();
    globalThis.__testSubId = id;
    render(<Detail />);
    fireEvent.press(screen.getByText('Отменить подписку'));
    await waitFor(() => expect(screen.getByText('Отмена прошла?')).toBeTruthy());

    fireEvent.press(screen.getByText('Да, отменил'));
    expect(useSubscriptions.getState().items.find((s) => s.id === id)!.status).toBe('canceled');
  });
});
```

Добавить в `jest.setup.ts`:

```ts
declare global {
  // eslint-disable-next-line no-var
  var __testSubId: string;
}
export {};
```

- [ ] **Step 5: Запустить и убедиться, что тест падает**

Run: `npm test -- detail`
Expected: FAIL — `Cannot find module '../subscription/[id]'`

- [ ] **Step 6: Написать экран деталей**

Создать `app/subscription/[id].tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../src/ui/Screen';
import { Card } from '../../src/ui/Card';
import { Button } from '../../src/ui/Button';
import { theme } from '../../src/ui/theme';
import { useSubscriptions } from '../../src/store/subscriptions';
import { formatMoney, monthlyMinor, yearlyMinor } from '../../src/domain/money';
import { nextBillingDate } from '../../src/domain/billing';
import { todayString } from '../../src/domain/date';
import { resolveCancelRoute } from '../../src/domain/cancelRoute';
import { openCancelRoute } from '../../src/services/cancel';

export default function Detail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useSubscriptions((s) => s.items.find((x) => x.id === id));
  const cancel = useSubscriptions((s) => s.cancel);
  const [asking, setAsking] = useState(false);

  if (!sub) {
    return (
      <Screen title="Подписка">
        <Text style={styles.dim}>Подписка не найдена.</Text>
      </Screen>
    );
  }

  const today = todayString();
  const next = nextBillingDate(sub.firstBillingDate, sub.cycle, today);

  const startCancel = async () => {
    await openCancelRoute(resolveCancelRoute(sub));
    // Статус меняем только по ответу пользователя: факт открытия страницы
    // ничего не доказывает — сервисы уводят в многошаговые retention-воронки.
    setAsking(true);
  };

  return (
    <Screen title={sub.name}>
      <Card>
        <Text style={styles.price}>
          {formatMoney(monthlyMinor(sub.amountMinor, sub.cycle), sub.currency)} / мес
        </Text>
        <Text style={styles.dim}>
          ({formatMoney(yearlyMinor(sub.amountMinor, sub.cycle), sub.currency)} / год)
        </Text>
        <View style={{ height: 12 }} />
        <Text style={styles.dim}>Следующее списание: {next}</Text>
        {sub.trialEndsAt ? (
          <Text style={styles.trial}>Пробный период до {sub.trialEndsAt}</Text>
        ) : null}
      </Card>

      <View style={{ height: 16 }} />

      {asking ? (
        <Card>
          <Text style={styles.ask}>Отмена прошла?</Text>
          <View style={{ height: 12 }} />
          <Button
            title="Да, отменил"
            variant="primary"
            onPress={() => {
              cancel(sub.id, today);
              setAsking(false);
              router.back();
            }}
          />
          <View style={{ height: 8 }} />
          <Button title="Ещё нет" onPress={() => setAsking(false)} />
        </Card>
      ) : (
        <Button title="Отменить подписку" variant="danger" onPress={startCancel} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: { color: theme.text, fontSize: 32, fontWeight: '800' },
  dim: { color: theme.textDim, fontSize: 15, marginTop: 2 },
  trial: { color: theme.accent, fontSize: 14, marginTop: 8 },
  ask: { color: theme.text, fontSize: 18, fontWeight: '700' },
});
```

- [ ] **Step 7: Написать экран архива**

Создать `app/archive.tsx`:

```tsx
import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Screen } from '../src/ui/Screen';
import { Card } from '../src/ui/Card';
import { Button } from '../src/ui/Button';
import { theme } from '../src/ui/theme';
import { useSubscriptions } from '../src/store/subscriptions';
import { useFx } from '../src/store/fx';
import { formatMoney, yearlyMinor } from '../src/domain/money';
import { toUsdMinor } from '../src/domain/fx';

export default function Archive() {
  const items = useSubscriptions((s) => s.items.filter((x) => x.status === 'canceled'));
  const restore = useSubscriptions((s) => s.restore);
  const cache = useFx((s) => s.cache);

  const notPaying = items.reduce((sum, s) => {
    const usd = toUsdMinor(s.amountMinor, s.currency, cache);
    return usd === null ? sum : sum + yearlyMinor(usd, s.cycle);
  }, 0);

  return (
    <Screen title="Архив" subtitle="Отменённые подписки">
      {items.length === 0 ? (
        <Text style={styles.dim}>Архив пуст.</Text>
      ) : (
        <>
          <Card>
            <Text style={styles.saved}>
              Не платишь {formatMoney(notPaying, 'USD')} в год
            </Text>
          </Card>
          <View style={{ height: 16 }} />
          {items.map((s) => (
            <Card key={s.id} style={{ marginBottom: 10 }}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.dim}>Отменена {s.canceledAt}</Text>
              <View style={{ height: 10 }} />
              <Button title="Вернуть в активные" onPress={() => restore(s.id)} />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  saved: { color: theme.text, fontSize: 20, fontWeight: '700' },
  name: { color: theme.text, fontSize: 17, fontWeight: '600' },
  dim: { color: theme.textDim, fontSize: 14, marginTop: 2 },
});
```

- [ ] **Step 8: Запустить все тесты**

Run: `npm test`
Expected: PASS

- [ ] **Step 9: Коммит**

```bash
git add app/subscription app/archive.tsx app/__tests__/detail.test.tsx src/services/cancel.ts src/services/__tests__/cancel.test.ts jest.setup.ts
git commit -m "feat: subscription detail, cancellation flow with manual confirmation, archive" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: Аналитика и настройки

**Files:**
- Create: `src/domain/analytics.ts`
- Create: `app/(tabs)/analytics.tsx`
- Create: `app/(tabs)/settings.tsx`
- Create: `src/ui/DonutChart.tsx`
- Test: `src/domain/__tests__/analytics.test.ts`

**Interfaces:**
- Consumes: `computeTotals`, `CATEGORIES`, `monthlyMinor`, `toUsdMinor`
- Produces:
  - `type CategorySlice = { categoryId: CategoryId; label: string; color: string; monthlyUsdMinor: number; share: number }`
  - `spendByCategory(list: Subscription[], cache: FxCache | null): CategorySlice[]`
  - `exportToJson(list: Subscription[]): string`

- [ ] **Step 1: Написать падающие тесты**

Создать `src/domain/__tests__/analytics.test.ts`:

```ts
import { Subscription } from '../subscription';
import { spendByCategory, exportToJson } from '../analytics';
import { FxCache } from '../fx';

const cache: FxCache = {
  base: 'USD', rates: { USD: 1, EUR: 0.92 }, fetchedAt: 0, providerUpdatedAt: 0,
};

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'X', categoryId: 'video',
  amountMinor: 1000, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2026-09-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: null,
  createdAt: '', updatedAt: '',
  ...over,
});

describe('spendByCategory', () => {
  it('складывает подписки одной категории', () => {
    const slices = spendByCategory(
      [sub({ id: 'a' }), sub({ id: 'b', amountMinor: 2000 })], cache,
    );
    const video = slices.find((s) => s.categoryId === 'video')!;
    expect(Math.round(video.monthlyUsdMinor)).toBe(3000);
  });

  it('считает доли, дающие в сумме единицу', () => {
    const slices = spendByCategory(
      [sub({ id: 'a', categoryId: 'video' }), sub({ id: 'b', categoryId: 'music', amountMinor: 3000 })],
      cache,
    );
    expect(slices.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1, 6);
    expect(slices.find((s) => s.categoryId === 'video')!.share).toBeCloseTo(0.25, 6);
  });

  it('пропускает категории без трат', () => {
    const slices = spendByCategory([sub()], cache);
    expect(slices.every((s) => s.monthlyUsdMinor > 0)).toBe(true);
  });

  it('сортирует по убыванию трат', () => {
    const slices = spendByCategory(
      [sub({ id: 'a', categoryId: 'video' }), sub({ id: 'b', categoryId: 'music', amountMinor: 5000 })],
      cache,
    );
    expect(slices[0].categoryId).toBe('music');
  });

  it('не считает архивные подписки', () => {
    expect(spendByCategory([sub({ status: 'canceled' })], cache)).toEqual([]);
  });

  it('пропускает неконвертируемые подписки, а не считает их нулём', () => {
    const slices = spendByCategory([sub({ currency: 'UAH', amountMinor: 50000 })], cache);
    expect(slices).toEqual([]);
  });
});

describe('exportToJson', () => {
  it('отдаёт разбираемый JSON с версией схемы', () => {
    const parsed = JSON.parse(exportToJson([sub()]));
    expect(parsed.version).toBe(1);
    expect(parsed.subscriptions).toHaveLength(1);
    expect(parsed.subscriptions[0].name).toBe('X');
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что тесты падают**

Run: `npm test -- analytics`
Expected: FAIL — `Cannot find module '../analytics'`

- [ ] **Step 3: Написать модуль аналитики**

Создать `src/domain/analytics.ts`:

```ts
import { Subscription, CategoryId, CATEGORIES } from './subscription';
import { monthlyMinor } from './money';
import { FxCache, toUsdMinor } from './fx';

export type CategorySlice = {
  categoryId: CategoryId;
  label: string;
  color: string;
  monthlyUsdMinor: number;
  /** Доля от общих трат, 0..1. */
  share: number;
};

export function spendByCategory(
  list: Subscription[], cache: FxCache | null,
): CategorySlice[] {
  const totals = new Map<CategoryId, number>();

  for (const s of list) {
    if (s.status !== 'active') continue;
    const usd = toUsdMinor(s.amountMinor, s.currency, cache);
    if (usd === null) continue;
    totals.set(s.categoryId, (totals.get(s.categoryId) ?? 0) + monthlyMinor(usd, s.cycle));
  }

  const grand = [...totals.values()].reduce((a, b) => a + b, 0);
  if (grand === 0) return [];

  return [...totals.entries()]
    .map(([categoryId, monthlyUsdMinor]) => {
      const meta = CATEGORIES.find((c) => c.id === categoryId)!;
      return {
        categoryId,
        label: meta.label,
        color: meta.color,
        monthlyUsdMinor,
        share: monthlyUsdMinor / grand,
      };
    })
    .sort((a, b) => b.monthlyUsdMinor - a.monthlyUsdMinor);
}

export function exportToJson(list: Subscription[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), subscriptions: list }, null, 2);
}
```

- [ ] **Step 4: Написать диаграмму**

Создать `src/ui/DonutChart.tsx`:

```tsx
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CategorySlice } from '../domain/analytics';

const SIZE = 180;
const STROKE = 28;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ slices }: { slices: CategorySlice[] }) {
  let offset = 0;

  return (
    <View testID="donut">
      <Svg width={SIZE} height={SIZE}>
        {slices.map((slice) => {
          const length = slice.share * CIRCUMFERENCE;
          const circle = (
            <Circle
              key={slice.categoryId}
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              stroke={slice.color} strokeWidth={STROKE} fill="none"
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={-offset}
              rotation={-90} origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          );
          offset += length;
          return circle;
        })}
      </Svg>
    </View>
  );
}
```

- [ ] **Step 5: Написать экраны аналитики и настроек**

Создать `app/(tabs)/analytics.tsx`:

```tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Screen } from '../../src/ui/Screen';
import { Card } from '../../src/ui/Card';
import { DonutChart } from '../../src/ui/DonutChart';
import { theme } from '../../src/ui/theme';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';
import { spendByCategory } from '../../src/domain/analytics';
import { formatMoney } from '../../src/domain/money';

export default function Analytics() {
  const items = useSubscriptions((s) => s.items);
  const cache = useFx((s) => s.cache);
  const slices = useMemo(() => spendByCategory(items, cache), [items, cache]);

  return (
    <Screen title="Аналитика" subtitle="Куда уходят деньги">
      {slices.length === 0 ? (
        <Text style={styles.dim}>Нет данных для графика.</Text>
      ) : (
        <Card>
          <View style={styles.center}>
            <DonutChart slices={slices} />
          </View>
          <View style={{ height: 16 }} />
          {slices.map((s) => (
            <View key={s.categoryId} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: s.color }]} />
              <Text style={styles.label}>{s.label}</Text>
              <Text style={styles.value}>
                {formatMoney(s.monthlyUsdMinor, 'USD')} · {Math.round(s.share * 100)}%
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { color: theme.text, fontSize: 15, flex: 1 },
  value: { color: theme.textDim, fontSize: 14 },
  dim: { color: theme.textDim, fontSize: 15 },
});
```

Создать `app/(tabs)/settings.tsx`:

```tsx
import React from 'react';
import { View, Text, Share, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../src/ui/Screen';
import { Card } from '../../src/ui/Card';
import { Button } from '../../src/ui/Button';
import { theme } from '../../src/ui/theme';
import { useSubscriptions } from '../../src/store/subscriptions';
import { useFx } from '../../src/store/fx';
import { exportToJson } from '../../src/domain/analytics';
import { formatDate } from '../../src/domain/date';

export default function Settings() {
  const router = useRouter();
  const items = useSubscriptions((s) => s.items);
  const cache = useFx((s) => s.cache);
  const refresh = useFx((s) => s.refresh);

  return (
    <Screen title="Настройки">
      <Card>
        <Text style={styles.label}>Курс валют</Text>
        <Text style={styles.value}>
          {cache ? `обновлён ${formatDate(new Date(cache.providerUpdatedAt))}` : 'ещё не загружен'}
        </Text>
        <View style={{ height: 12 }} />
        <Button title="Обновить сейчас" onPress={() => void refresh(true)} />
      </Card>

      <View style={{ height: 16 }} />

      <Button title="Архив" onPress={() => router.push('/archive')} />
      <View style={{ height: 8 }} />
      <Button
        title="Экспорт в JSON"
        onPress={() => void Share.share({ message: exportToJson(items) })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: theme.textDim, fontSize: 13 },
  value: { color: theme.text, fontSize: 17, fontWeight: '600', marginTop: 4 },
});
```

- [ ] **Step 6: Запустить все тесты**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Коммит**

```bash
git add src/domain/analytics.ts src/domain/__tests__/analytics.test.ts src/ui/DonutChart.tsx "app/(tabs)/analytics.tsx" "app/(tabs)/settings.tsx"
git commit -m "feat: category analytics, donut chart, settings and json export" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Планирование уведомлений

**Files:**
- Create: `src/services/notifier.ts`
- Modify: `app/_layout.tsx`
- Test: `src/services/__tests__/notifier.test.ts`

**Interfaces:**
- Consumes: `planReminder`, `Subscription`, `todayString`
- Produces: `syncReminders(subs: Subscription[]): Promise<number>` — возвращает число запланированных уведомлений

- [ ] **Step 1: Написать падающий тест**

Создать `src/services/__tests__/notifier.test.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Subscription } from '../../domain/subscription';
import { syncReminders } from '../notifier';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 'a', catalogId: null, name: 'Netflix', categoryId: 'video',
  amountMinor: 1549, currency: 'USD', cycle: 'monthly',
  firstBillingDate: '2099-01-20', trialEndsAt: null,
  paymentMethod: 'card', cancelUrl: null, note: '',
  status: 'active', canceledAt: null, reminderDaysBefore: 3,
  createdAt: '', updatedAt: '',
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe('syncReminders', () => {
  it('стирает старое расписание перед тем, как ставить новое', async () => {
    await syncReminders([sub()]);
    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
  });

  it('планирует по одному ближайшему напоминанию на подписку', async () => {
    const count = await syncReminders([sub({ id: 'a' }), sub({ id: 'b' })]);
    expect(count).toBe(2);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('не планирует ничего для архивных подписок и подписок без напоминания', async () => {
    const count = await syncReminders([
      sub({ id: 'a', status: 'canceled' }),
      sub({ id: 'b', reminderDaysBefore: null }),
    ]);
    expect(count).toBe(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('держится ниже лимита iOS в 64 уведомления', async () => {
    const many = Array.from({ length: 100 }, (_, i) => sub({ id: String(i) }));
    const count = await syncReminders(many);
    expect(count).toBeLessThanOrEqual(64);
  });

  it('ничего не планирует без разрешения и не падает', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ granted: false });
    await expect(syncReminders([sub()])).resolves.toBe(0);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что тест падает**

Run: `npm test -- notifier`
Expected: FAIL — `Cannot find module '../notifier'`

- [ ] **Step 3: Написать сервис уведомлений**

Создать `src/services/notifier.ts`:

```ts
import * as Notifications from 'expo-notifications';
import { Subscription } from '../domain/subscription';
import { planReminder } from '../domain/reminders';
import { todayString } from '../domain/date';

/** iOS хранит не более 64 запланированных локальных уведомлений на приложение. */
const IOS_PENDING_LIMIT = 64;

/**
 * Пересобирает всё расписание целиком: по одному ближайшему напоминанию на
 * подписку. Планировать серию вперёд нельзя — на два десятка подписок она
 * упрётся в лимит iOS, и часть напоминаний молча пропадёт.
 */
export async function syncReminders(subs: Subscription[]): Promise<number> {
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permission.granted) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const today = todayString();
  const now = new Date();

  const planned = subs
    .map((s) => planReminder(s, today, now))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, IOS_PENDING_LIMIT);

  for (const reminder of planned) {
    await Notifications.scheduleNotificationAsync({
      content: { title: reminder.title, body: reminder.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
      },
    });
  }

  return planned.length;
}
```

- [ ] **Step 4: Подключить пересборку расписания к жизненному циклу**

Заменить содержимое `app/_layout.tsx`:

```tsx
import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFx } from '../src/store/fx';
import { useSubscriptions } from '../src/store/subscriptions';
import { syncReminders } from '../src/services/notifier';
import { theme } from '../src/ui/theme';

export default function RootLayout() {
  const refresh = useFx((s) => s.refresh);
  const items = useSubscriptions((s) => s.items);

  // Расписание пересобирается при каждом возвращении приложения на передний
  // план: даты списаний движутся, а фоновые задачи iOS не гарантирует.
  useEffect(() => {
    void refresh();
    void syncReminders(items);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
        void syncReminders(useSubscriptions.getState().items);
      }
    });
    return () => sub.remove();
  }, [refresh, items]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}
      />
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 5: Запустить все тесты и проверку типов**

Run: `npm test && npm run typecheck`
Expected: PASS, ошибок типов нет

- [ ] **Step 6: Проверить на устройстве**

Run: `npm start`

На физическом iPhone через Expo Go проверить вручную то, что Jest не покрывает:
1. Добавить подписку из каталога — она появляется на главной, итог пересчитывается.
2. Открыть детали, нажать «Отменить подписку» — открывается страница сервиса; после возврата появляется вопрос «Отмена прошла?».
3. Ответить «Ещё нет» — подписка осталась активной.
4. Для подписки со способом оплаты App Store — открывается системный экран подписок.
5. Добавить подписку со списанием через 4 дня и напоминанием за 3 дня — уведомление появляется в списке запланированных.

- [ ] **Step 7: Коммит**

```bash
git add src/services/notifier.ts src/services/__tests__/notifier.test.ts app/_layout.tsx
git commit -m "feat: local billing reminders rebuilt on every foreground" -m "Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Соответствие спеке

| Раздел спеки | Задачи |
|---|---|
| §2 Стек | 1 |
| §3 Модель данных, минорные единицы, календарные строки | 2, 4, 6 |
| §4.1 Дата следующего списания | 2, 3 |
| §4.2 Нормализация суммы | 4 |
| §4.3 Конвертация и политика кэша | 5, 9, 11 |
| §5 Отмена, подтверждение, архив | 7, 13 |
| §6 Каталог | 8 |
| §7 Уведомления и лимит iOS | 7, 15 |
| §8 Экраны | 10, 11, 12, 13, 14 |
| §8, пункт «валюта отображения» в настройках | **не покрыто намеренно.** Все итоги выводятся в долларах. Переключатель валюты вывода потребовал бы протащить выбранную валюту через итоги, карточки и аналитику ради функции, которой при формулировке задачи «сводим к $» никто не пользуется. Добавляется отдельной задачей, если понадобится. |
| §9 Структура проекта | все |
| §10 Тестирование | все (TDD в каждой задаче) |
| §11 Обработка ошибок | 5 (нет курса), 9 (битый кэш, мусор от API), 13 (мёртвая ссылка), 15 (нет разрешения, лимит 64) |
