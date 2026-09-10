# Food data contract

Every food the app shows, searches or logs goes through one shape,
`NormalizedFood`, no matter where it came from. Providers translate their raw
format into it; the UI and the diary never see a raw payload. This file is the
contract; `src/domain/food/` is its code.

## Sources and licenses (decided 2026-09-08)

| Source | Role | Auth / cost | Rate limit | License | Bundled? |
| --- | --- | --- | --- | --- | --- |
| TACO 4ª ed. (NEPA/UNICAMP) | Brazilian generic foods, analysed in lab. 597 items. | none | — | citation required | yes |
| IBGE POF 2008-2009 composição + medidas referidas | Brazilian foods "as consumed" (coxinha, pão de sal, café com leite) and 11,801 household measures in grams | none | — | open data (Decreto 8.777/2016), credit required | yes |
| Open Food Facts | Packaged products by barcode and text; Brazil has ~36k products | none, needs `User-Agent: <App>/<version> (<contact e-mail>)` | 15 req/min product, 10 req/min search, per IP | ODbL 1.0 + DbCL | **never** (cache per user only, see below) |
| USDA FoodData Central | Generic foods in English (SR Legacy, Foundation); Branded for US products | free API key (api.data.gov) | 1,000 req/h per IP | CC0 1.0 | later, as a translated subset |

Rejected: TBCA (CC BY-NC-ND — forbids commercial use), FatSecret (Brazil and
Portuguese need the paid Premier tier; terms force deleting cached data within
24 h, incompatible with offline), Edamam, Nutritionix, Spoonacular, CalorieNinjas
(no usable free tier or no commercial use), OpenNutrition (LLM-generated, ODbL).

ODbL in practice: showing Open Food Facts data inside the app is a "Produced
Work" and needs only attribution plus a link to the product page. Shipping an
Open Food Facts dump inside the APK, or merging it into a database we
distribute, would make that database a "Derivative Database" under share-alike.
So the app fetches Open Food Facts on demand and keeps a **private per-user
cache** in SQLite, which is not "publicly conveyed". Never sync that cache
through a service of ours.

## `NormalizedFood`

```ts
// src/domain/food/NormalizedFood.ts
export type FoodSource = 'taco' | 'ibge' | 'usda' | 'off' | 'user';

export interface LocalizedText {
  pt?: string;
  en?: string;
}

/** Always per 100 g of edible portion (per 100 ml for liquids when density is unknown). */
export interface Per100g {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  saturated_fat_g?: number;
  /**
   * The five minerals the bundled tables cover, in mg per 100 g (task 20).
   * Absent means the source never measured it — never zero.
   */
  iron_mg?: number;
  calcium_mg?: number;
  magnesium_mg?: number;
  potassium_mg?: number;
  zinc_mg?: number;
  /** Where the energy came from: the source, converted from kJ, or 4/4/9 from macros. */
  energySource: 'declared' | 'kj_converted' | 'atwater';
}

export type ServingKind = 'household' | 'package' | 'reference';

export interface Serving {
  id: string; // stable inside the food, e.g. "ibge:colher-de-sopa-cheia", "off:serving", "ref:100g"
  label: LocalizedText; // { pt: 'colher de sopa cheia', en: 'heaping tablespoon' }
  grams: number;
  kind: ServingKind;
  isDefault: boolean; // exactly one serving is the default
}

export interface Attribution {
  license: 'TACO' | 'IBGE-open-data' | 'ODbL-1.0+DbCL' | 'CC0-1.0' | 'user';
  text: string; // ready to display
  url?: string; // product page for Open Food Facts (required by their terms)
}

export interface NormalizedFood {
  /** `${source}:${sourceId}` — the global primary key, e.g. "taco:3", "off:7891000100103". */
  id: string;
  source: FoodSource;
  sourceId: string;
  name: LocalizedText;
  /** Search-only aliases (an IBGE name folded into a TACO row, a brand nickname). */
  aliases?: string[];
  brand?: string;
  barcode?: string; // GTIN-13, zero-padded when it arrived as UPC-A
  category?: LocalizedText;
  /** true for official tables (TACO, IBGE, USDA Foundation/SR Legacy); false for labels and user data. */
  verified: boolean;
  per100g: Per100g;
  servings: Serving[]; // default first; always ends with the 100 g reference
  isLiquid?: boolean;
  /** 0..1 — how complete the record is (Open Food Facts `completeness`, or 1 for official tables). */
  completeness: number;
  /** Ranking hint for staples from the bundled dataset (3 = daily staple). Never from an online source. */
  boost?: number;
  lastFetchedAt: string; // ISO date; bundle build date for bundled foods
  attribution: Attribution;
}
```

Invariants the domain layer enforces (and tests):

- `per100g` numbers are finite and ≥ 0; `protein_g + carbs_g + fat_g ≤ 105`; `kcal ≤ 950`.
- `servings` has exactly one `isDefault: true`, and the last entry is the 100 g reference.
- `id` is unique across sources; the same barcode from two sources is merged (see below).
- A diary entry stores a **snapshot** of the nutrients it was created with. Updating a food later never rewrites history.

## `FoodProvider`

```ts
// src/domain/food/FoodProvider.ts
export type Locale = 'pt-BR' | 'en-US';

export interface SearchOptions {
  locale: Locale;
  limit?: number; // default 20
  signal?: AbortSignal; // cancel the previous keystroke's request
}

export interface FoodProvider {
  readonly source: FoodSource;
  /** true = answers without network (bundled SQLite). */
  readonly offline: boolean;
  search(query: string, options: SearchOptions): Promise<NormalizedFood[]>;
  getById(sourceId: string, options?: { signal?: AbortSignal }): Promise<NormalizedFood | null>;
  getByBarcode?(barcode: string, options?: { signal?: AbortSignal }): Promise<NormalizedFood | null>;
}
```

Providers in the MVP: `LocalFoodProvider` (bundled seed + cache, FTS5),
`OpenFoodFactsProvider`, `UsdaProvider`. `FoodSearchService` orchestrates them:

1. Local first, always, in under 50 ms (FTS5 prefix query, `unicode61 remove_diacritics 2`).
2. Online providers only when the query has ≥ 3 characters, after a 400 ms debounce, in parallel with a 2.5 s timeout and an `AbortSignal` tied to the search box. Results are normalized, de-duplicated against local rows, cached in `foods`, and appended under their own group ("Produtos") without moving what is already on screen.
3. Offline or timed out: the local results stand; a quiet banner says products are unavailable.

## Mapping notes per source

Shared conversions live in `src/domain/food/units.ts`:

```ts
export const kjToKcal = (kj: number) => kj / 4.184;
export const sodiumGToMg = (g: number) => g * 1000;
export const saltToSodiumMg = (saltG: number) => (saltG / 2.5) * 1000;
export const atwaterKcal = (p: number, c: number, f: number) => 4 * p + 4 * c + 9 * f;
export const num = (v: unknown) => /* "NA", "", "-", "*" → undefined; "Tr" → 0; "2,5" → 2.5 */;
```

**Bundled seed (`assets/data/foods.seed.json`, sources `taco` and `ibge`)** —
built by `scripts/build-food-seed.mjs` from the official files. Each item:

```json
{
  "id": "taco:3", "source": "taco", "sourceId": "3",
  "name": "Arroz, tipo 1, cozido", "category": "Cereais e derivados",
  "kcal": 128.2, "protein": 2.52, "carbs": 28.06, "fat": 0.23, "fiber": 1.62, "sodiumMg": 1.2,
  "aliases": ["Arroz (polido, parboilizado, agulha, agulhinha)"],
  "measures": [{ "label": "colher de sopa cheia", "grams": 25 }, { "label": "colher de servir cheia", "grams": 45 }, { "label": "concha média cheia", "grams": 100 }],
  "boost": 3, "verified": true
}
```

Import: `name` → `name.pt`; `measures[i]` → `Serving { kind: 'household', label: { pt: label }, grams }` with the first one as default (or the 100 g reference when there are none); `kcal` → `per100g.kcal` with `energySource: 'declared'`; `sodiumMg` → `sodium_mg`; `micro` is positional, `[iron, calcium, magnesium, potassium, zinc]` in mg per 100 g, with `null` where the table never measured it and the key absent when none of the five was measured. TACO names are faceted ("Arroz, tipo 1, cozido"): the UI shows the first facet in full weight and the rest lighter. `starters[meal]` lists the ids to show before the user has history.

**Open Food Facts (`off`)** — `GET https://world.openfoodfacts.org/api/v2/product/{barcode}?fields=code,product_name,product_name_pt,product_name_en,brands,serving_size,serving_quantity,serving_quantity_unit,nutriments,completeness,categories_tags`; text search through search-a-licious `GET https://search.openfoodfacts.org/search?q=<terms> AND countries_tags:"en:brazil"&langs=pt&page_size=20&fields=...` (never `cgi/search.pl` for search-as-you-type).

- `name.pt = product_name_pt ?? product_name`; `name.en = product_name_en ?? product_name`; `brand = brands.split(',')[0]`; `barcode = code`.
- `kcal = num(nutriments['energy-kcal_100g']) ?? kjToKcal(num(nutriments['energy-kj_100g'] ?? nutriments['energy_100g'])) ?? atwaterKcal(...)`, setting `energySource` accordingly. `energy_100g` is always kJ.
- `protein_g = proteins_100g`, `carbs_g = carbohydrates_100g`, `fat_g = fat_100g`, `fiber_g = fiber_100g`, `sugar_g = sugars_100g`, `saturated_fat_g = saturated-fat_100g`.
- Sodium arrives in **grams**: `sodium_mg = sodium_100g * 1000`; if missing, derive from `salt_100g`. The five minerals arrive the same way: `iron_mg = iron_100g * 1000`, and likewise for `calcium_100g`, `magnesium_100g`, `potassium_100g` and `zinc_100g`. A Brazilian label almost never carries them (RDC 429/2020 requires no mineral but sodium), and an absent key stays **absent**, never a zero.
- Values may be strings; ignore `_modifier` fields; never use `nutriments_estimated`.
- Servings: `serving_quantity` in g/ml → `{ kind: 'package', label: { pt: serving_size }, isDefault: true }`, then the 100 g reference.
- `verified = false`, `completeness = product.completeness ?? 0`.
- `attribution = { license: 'ODbL-1.0+DbCL', text: 'Dados de produto: © Open Food Facts contributors (ODbL)', url: 'https://br.openfoodfacts.org/produto/<code>' }`.
- Barcodes: try as received; if 12 digits, retry with a leading zero.

**USDA FoodData Central (`usda`)** — `GET https://api.nal.usda.gov/fdc/v1/foods/search?api_key=<key>&query=<terms>&dataType=SR%20Legacy,Foundation&pageSize=20`.

- Nutrient ids: energy 1008 (kcal) → else 2048 → else 2047 → else 1062 (kJ) / 4.184 → else Atwater; protein 1003; carbs 1005; fat 1004; fiber 1079; sugars 2000; sodium 1093 (already mg); saturated fat 1258; iron 1089, calcium 1087, magnesium 1090, potassium 1092, zinc 1095 (all already mg). Search results carry `foodNutrients[].{nutrientId, value}`; the detail endpoint carries `foodNutrients[].{nutrient:{id}, amount}`.
- `foodPortions[]` → household servings (`gramWeight`, label from `amount + modifier | measureUnit.name`); Branded → `servingSize` + `householdServingFullText`, `gtinUpc` zero-padded to 13.
- `verified = dataType in ('Foundation', 'SR Legacy', 'Survey (FNDDS)')`; `name.en = description`.
- `attribution = { license: 'CC0-1.0', text: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, fdc.nal.usda.gov', url: 'https://fdc.nal.usda.gov/food-details/<fdcId>/nutrients' }`.

## Merge, dedupe and ranking

```ts
// src/domain/food/rank.ts
const SOURCE_WEIGHT: Record<FoodSource, number> = { user: 35, taco: 30, ibge: 25, usda: 20, off: 10 };
```

- Dedupe key: `barcode` when present, else normalized name + brand. The winner is `verified` > source weight > completeness; servings of the losers are appended when their gram weight is new.
- Text relevance: exact name (100) > name prefix (80) > word prefix (65) > alias prefix (60) > all terms contained (50); no match → excluded.
- Then add: `+15` verified generic without brand, `+SOURCE_WEIGHT`, `+10` when the name exists in the user's locale, `+ (8 − wordCount)` so short generic names beat long descriptions, `+10 × completeness`, `+6 × boost`, `+6 × log1p(useCount)`.
- The Sugestões section (before typing, and "Seus" while typing) is ranked by frecency (see `docs/specs/04-sugestoes.md`), not by this formula; this formula orders the "Base" and "Produtos" groups.
- For `en-US`, swap the weights of `usda` (→ 32) and `taco` (→ 18): the generic table in the user's language comes first.

## Cache policy (SQLite, same file as the bundle)

- Online foods are inserted into `foods` with `fetched_at`; a product is refreshed silently when older than 30 days and the device is online; search responses are cached 24 h by `(source, locale, query)`.
- Foods referenced by a diary entry are never evicted; everything else follows LRU above 20 MB.
- The diary entry keeps its own nutrient snapshot, so eviction or refresh never changes history.

## Attribution screen ("Fontes de dados") — texts to display verbatim

- **TACO**: "Tabela Brasileira de Composição de Alimentos – TACO, 4ª edição revisada e ampliada. NEPA/UNICAMP, Campinas, 2011. https://nepa.unicamp.br/"
- **IBGE**: "IBGE – Instituto Brasileiro de Geografia e Estatística. Pesquisa de Orçamentos Familiares 2008-2009: Tabelas de Composição Nutricional dos Alimentos Consumidos no Brasil e Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil. Rio de Janeiro, 2011."
- **Open Food Facts**: "Informações de produtos embalados obtidas de Open Food Facts (https://world.openfoodfacts.org), © Open Food Facts contributors, disponibilizadas sob a Open Database License (ODbL); conteúdos individuais sob a Database Contents License (DbCL)." Each product row links to its Open Food Facts page.
- **USDA**: "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, https://fdc.nal.usda.gov (dados em domínio público, CC0 1.0)."
- General notice: "Os valores nutricionais são fornecidos por terceiros e podem conter erros; confira o rótulo do produto."
