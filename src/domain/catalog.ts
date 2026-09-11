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
  /**
   * Прямая ссылка на страницу отмены. null там, где стабильного публичного
   * адреса нет: лучше увести пользователя в поиск, чем на мёртвую ссылку.
   */
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
