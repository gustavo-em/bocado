import type { FoodSource, NormalizedFood } from './NormalizedFood';

export type Locale = 'pt-BR' | 'en-US';

export interface SearchOptions {
  locale: Locale;
  /** Default 20. */
  limit?: number;
  /** Cancels the previous keystroke's request. */
  signal?: AbortSignal;
}

/**
 * A source of foods. Providers translate their raw format into
 * `NormalizedFood`; nothing above this interface ever sees a raw payload.
 */
export interface FoodProvider {
  readonly source: FoodSource;
  /** true = answers without network (bundled SQLite). */
  readonly offline: boolean;
  search(query: string, options: SearchOptions): Promise<NormalizedFood[]>;
  getById(
    sourceId: string,
    options?: { signal?: AbortSignal },
  ): Promise<NormalizedFood | null>;
  getByBarcode?(
    barcode: string,
    options?: { signal?: AbortSignal },
  ): Promise<NormalizedFood | null>;
}

/** Base ranking weight per source; the user's own foods win, official tables next. */
export const SOURCE_WEIGHT: Record<FoodSource, number> = {
  user: 35,
  taco: 30,
  ibge: 25,
  usda: 20,
  off: 10,
};
