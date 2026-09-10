# Architecture

Bocado is an offline-first, account-free calorie counter. This document is the
map every feature follows, and it describes what is actually built, not what
was planned. Keep it short and keep it true.

## Layers

```
src/
  app/            composition root, navigation, providers (theme, language, db)
  theme/          tokens: colours, type, spacing, radii, motion, icons — single source
  i18n/           typed copy tables (pt-BR primary, en-US derived) and formatters
  domain/         pure TypeScript, no React, no I/O — where the unit tests live
    food/         NormalizedFood, FoodProvider, portion maths, ranking, grouping, units
    diary/        days, day totals, meal model, frecency suggestions
    goals/        Mifflin-St Jeor with activity, intent and floors
  data/           I/O
    db/           schema, migrations, the single open()
    diary/        DiaryRepository — the only writer of diary_entries and food_usage
    food/         the online cache and its pruning
    providers/    LocalFoodProvider (FTS5), OpenFoodFactsProvider, UsdaProvider
    seed/         the bundled dataset, its import and its mapper
    prefs/        MMKV: goal, profile, language, appearance, flags
  features/
    diary/        Today and the meal screen
    add-food/     search, suggestions, the tray
    portion/      the portion sheet, editing and removal
    quick-log/    "Registrar só as calorias"
    goals/        goals and preferences
    onboarding/   the three first-run screens
    sources/      data sources and licences
  components/     the design system's canonical parts (see docs/DESIGN_SYSTEM.md)
assets/
  fonts/          Fraunces 144 Soft and Inter, bundled via react-native.config.js
  brand/          the mark's vector sources
  data/           foods.seed.json — imported into SQLite on first launch
docs/
  research/       the evidence behind the product decisions
  specs/          one spec per orchestrator task
```

Rules that hold:

- `domain/` imports nothing from React, React Native, or `data/`. Anything that
  can be wrong silently — portion maths, totals, the goal formula, ranking —
  lives there and is unit-tested.
- `data/` implements what `domain/` declares. Screens reach it through hooks.
- A screen never formats a number or a date by hand: `src/i18n/format.ts` does.
- Every string is in both copy tables. The English table's type is derived from
  the Portuguese one, so a missing key fails `tsc`.
- No colour, size, radius or duration is written outside `src/theme/`.

## Navigation

React Navigation 7, native stack, no tab bar. The initial route is decided
synchronously from MMKV, so a returning user never sees onboarding flash.

| Route | Presentation | What it is |
| --- | --- | --- |
| `Today` | root | the day: strip, hero, macros, four meals |
| `OnboardingIntent` / `OnboardingProfile` / `OnboardingGoal` | stack | first run, all skippable |
| `Meal` | stack | one meal: subtotal, macro bars, full list |
| `Goals` | stack | goal, display mode, language, haptics, data |
| `Sources` | stack | attributions the licences require |
| `AddFood` | modal | search, suggestions, the add tray |
| `Portion` | transparent modal | the portion sheet, add or edit |
| `QuickLog` | transparent modal | calories without a food |

The sheets animate themselves, so their routes arrive with no transition of
their own and a transparent background.

## Data model (SQLite, `bocado.db`)

Migrations are an append-only array in `src/data/db/schema.ts`; a shipped entry
is never edited.

- **`foods`** — one row per `(source, source_id)`, keyed by `id` = `source:sourceId`.
  Per-100 g macros, `servings_json`, `attribution_json`, `verified`, `boost`,
  `is_liquid`, `fetched_at`.
- **`foods_fts`** — FTS5 over normalised name, aliases and brand, with
  `tokenize='unicode61 remove_diacritics 2'`. This is why `pao` finds *Pão*.
- **`diary_entries`** — day, meal, food, grams, the serving as the user said it,
  and a **snapshot** of kcal and macros. The snapshot is the point: updating a
  food later never rewrites history.
- **`food_usage`** — use count, last used, last portion, per-meal counts,
  favourite. Feeds suggestions and the remembered portion.
- **`food_search_cache`** — which ids an online provider returned for a query.
- **`meta`** — schema-adjacent bookkeeping.

Preferences live in MMKV, not SQLite: goal, profile, language, appearance,
display mode, haptics, seed version, onboarding done.

## Search

1. `LocalFoodProvider` answers from FTS5 first, always, in under 50 ms.
2. Online providers are asked only with three or more characters, after a
   400 ms debounce, in parallel, under **one** 2.5 s deadline for the round,
   cancelled by the search box's `AbortSignal`.
3. Results are normalised, de-duplicated (barcode, then name plus brand),
   cached, and grouped **by the food's own source** — a cached label stays
   under "Produtos" instead of drifting into "Base".

Ranking is in `domain/food/rank.ts`: text relevance, then verified generic over
branded, then source weight, then the seed's `boost`, then local popularity.

## Motion and feedback

### One rule about horizontal lists

Neither the day strip nor the month sheet may ask a horizontal list to go to a
page it has not measured. It fails three different ways on a Galaxy J6 — an
empty band, a jump to the far end of the data, and a hard `addViewAt` mount
crash — and it has now been reintroduced twice by different features. The page
that must be on screen is either the first item of the data or the only thing
drawn. `docs/specs/12-calendario-faixa-desencontrada.md` has the evidence.

`src/theme/motion.ts` is the whole vocabulary; a duration written anywhere else
is a defect, and `npm run lint` is not what catches it — a grep in the polish
task is. Only `transform` and `opacity` animate. Haptics go through one helper
with a per-platform table, and the success cue fires once per session.

## Validation

`npm run validate` = prettier, eslint, tsc, jest. Screens are proven on a
real device by the orchestrator's device driver: screenshots plus the UI tree,
never self-report. The device was a Galaxy J6 through task 17 and is a Galaxy
M53 from 2026-09-10 — the width and memory budgets stay at the J6's numbers,
which decision 8 explains.
