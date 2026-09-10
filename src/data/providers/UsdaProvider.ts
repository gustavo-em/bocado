import { USDA_KEY } from '../../app/config';
import type {
  FoodProvider,
  SearchOptions,
} from '../../domain/food/FoodProvider';
import {
  mapUsdaFood,
  mapUsdaSearch,
} from '../../domain/food/mappers/usdaMapper';
import type {
  FoodSource,
  NormalizedFood,
} from '../../domain/food/NormalizedFood';
import { getJson, isAbort, NETWORK_LOG_TAG } from './http';

/**
 * Generic foods in English from USDA FoodData Central. Only the analysed
 * datasets are asked for: Branded is the United States' label catalogue and
 * Open Food Facts already covers labels here.
 */

const SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const FOOD_URL = 'https://api.nal.usda.gov/fdc/v1/food';
const DATA_TYPES = 'SR Legacy,Foundation';
const DEFAULT_LIMIT = 20;

export class UsdaProvider implements FoodProvider {
  readonly source: FoodSource = 'usda';
  readonly offline = false;

  async search(
    query: string,
    options: SearchOptions,
  ): Promise<NormalizedFood[]> {
    const terms = query.trim();
    if (terms.length === 0) return [];
    const url =
      `${SEARCH_URL}?api_key=${encodeURIComponent(USDA_KEY)}` +
      `&query=${encodeURIComponent(terms)}` +
      `&dataType=${encodeURIComponent(DATA_TYPES)}` +
      `&pageSize=${options.limit ?? DEFAULT_LIMIT}`;

    try {
      return mapUsdaSearch(await getJson(url, { signal: options.signal }));
    } catch (error) {
      if (!isAbort(error))
        console.warn(`${NETWORK_LOG_TAG} usda search failed: ${String(error)}`);
      throw error;
    }
  }

  /** `sourceId` is the FDC id; "usda:169756" is accepted too. */
  async getById(
    sourceId: string,
    options?: { signal?: AbortSignal },
  ): Promise<NormalizedFood | null> {
    const fdcId = sourceId.startsWith('usda:') ? sourceId.slice(5) : sourceId;
    const url = `${FOOD_URL}/${encodeURIComponent(fdcId)}?api_key=${encodeURIComponent(USDA_KEY)}`;
    try {
      return mapUsdaFood(await getJson(url, { signal: options?.signal }));
    } catch (error) {
      if (isAbort(error)) throw error;
      console.warn(`${NETWORK_LOG_TAG} usda food failed: ${String(error)}`);
      return null;
    }
  }
}

export const usdaProvider = new UsdaProvider();
