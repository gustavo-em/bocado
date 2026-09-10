import type {
  FoodProvider,
  SearchOptions,
} from '../../domain/food/FoodProvider';
import {
  mapOffProductResponse,
  mapOffSearch,
} from '../../domain/food/mappers/offMapper';
import type {
  FoodSource,
  NormalizedFood,
} from '../../domain/food/NormalizedFood';
import { normalizeBarcode } from '../../domain/food/units';
import { getJson, isAbort, NETWORK_LOG_TAG } from './http';

/**
 * Packaged products from Open Food Facts. Text search goes through
 * search-a-licious — `cgi/search.pl` is far too slow for search-as-you-type —
 * and a barcode goes to the v2 product endpoint. Nothing is ever bundled:
 * what the user searched for is cached on their own device and nowhere else.
 */

const SEARCH_URL = 'https://search.openfoodfacts.org/search';
const PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';

const SEARCH_FIELDS = [
  'code',
  'product_name',
  'product_name_pt',
  'product_name_en',
  'brands',
  'serving_size',
  'serving_quantity',
  'serving_quantity_unit',
  'nutriments',
  'completeness',
  'categories_tags',
].join(',');

const DEFAULT_LIMIT = 20;

export class OpenFoodFactsProvider implements FoodProvider {
  readonly source: FoodSource = 'off';
  readonly offline = false;

  async search(
    query: string,
    options: SearchOptions,
  ): Promise<NormalizedFood[]> {
    const terms = query.trim();
    if (terms.length === 0) return [];
    // pt-BR only wants what is sold here; en-US takes the catalogue as it is.
    const brazilOnly = options.locale === 'pt-BR';
    const expression = brazilOnly
      ? `${terms} AND countries_tags:"en:brazil"`
      : terms;
    const url =
      `${SEARCH_URL}?q=${encodeURIComponent(expression)}` +
      `&langs=${brazilOnly ? 'pt' : 'en'}` +
      `&page_size=${options.limit ?? DEFAULT_LIMIT}` +
      `&fields=${encodeURIComponent(SEARCH_FIELDS)}`;

    try {
      const payload = await getJson(url, { signal: options.signal });
      return mapOffSearch(payload);
    } catch (error) {
      if (!isAbort(error))
        console.warn(`${NETWORK_LOG_TAG} off search failed: ${String(error)}`);
      throw error;
    }
  }

  /** `sourceId` is the barcode; "off:789" is accepted too. */
  getById(
    sourceId: string,
    options?: { signal?: AbortSignal },
  ): Promise<NormalizedFood | null> {
    const barcode = sourceId.startsWith('off:') ? sourceId.slice(4) : sourceId;
    return this.getByBarcode(barcode, options);
  }

  /**
   * Tries the code as received and, when it was a 12-digit UPC-A, once more
   * with the leading zero the GTIN-13 catalogue is keyed on.
   */
  async getByBarcode(
    barcode: string,
    options?: { signal?: AbortSignal },
  ): Promise<NormalizedFood | null> {
    const digits = barcode.replace(/\D/g, '');
    const candidates =
      digits.length === 12 ? [digits, normalizeBarcode(digits)] : [digits];
    for (const code of candidates) {
      const url = `${PRODUCT_URL}/${code}?fields=${encodeURIComponent(SEARCH_FIELDS)}`;
      try {
        const food = mapOffProductResponse(
          await getJson(url, { signal: options?.signal }),
        );
        if (food !== null) return food;
      } catch (error) {
        if (isAbort(error)) throw error;
        console.warn(`${NETWORK_LOG_TAG} off product failed: ${String(error)}`);
      }
    }
    return null;
  }
}

export const openFoodFactsProvider = new OpenFoodFactsProvider();
