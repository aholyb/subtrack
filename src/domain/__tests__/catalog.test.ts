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
