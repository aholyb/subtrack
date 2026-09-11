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
