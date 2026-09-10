# English names for the bundled food base

Owner's request, 2026-09-10: "tente entender se tem como, quando o aplicativo
estiver em inglês, o nome das comidas também ser em inglês. Se não tiver como
ou for muito difícil, não tem problema."

The answer is yes, and it costs one reviewable file. This note records the
discovery that had to come first: how many distinct terms the bundled base
uses, how much of it a term-by-term glossary covers **honestly**, what stays
in Portuguese and why, and the decision that followed.

## What the app did before

`LocalizedText { pt?, en? }`, the `name_en` column and `localizedName()`
already existed, but `mapSeedFood.ts` wrote `name_en = null` for all 2,319
TACO/IBGE foods. With the app in English, searching "rice" returned only
online USDA rows; the offline base was reachable only by typing Portuguese.

## The base, in numbers

| What | Count |
| --- | --- |
| Bundled foods (TACO + IBGE) | 2,319 |
| Distinct terms in the names | 999 |
| Distinct comma-separated facets in the names | 1,487 (872 of them multiword) |
| Distinct household measure labels | 236, over 143 distinct terms |
| Distinct category strings | 34, over 54 distinct terms |

The names are compositional ("Arroz, tipo 1, cozido"), so the vocabulary is far
smaller than the base: 400 terms already close 69% of the foods, 600 close 84%,
800 close 92%. That curve is what made the glossary worth writing.

## Coverage reached

A food counts as covered only when **every** one of its terms is translated.

| Measure | Result |
| --- | --- |
| Foods with the whole name in English | **2,300 / 2,319 = 99.2%** |
| Household measure labels translated | 230 / 236 |
| Categories translated | 34 / 34 (not shipped, see below) |
| Glossary entries for names | 1,180 (114 phrases, 890 terms, 176 verbatim, 12 pending) |

Target was ≥ 90%, stop line was < 70%. **Decision: go.**

## The glossary

`data/glossary/pt-en.json`, applied at build time by
`scripts/build-food-seed.mjs` through `scripts/lib/glossary.mjs`. No service,
no model, no network: it is a file a human can read and correct.

- `phrases` — multiword idioms, matched greedily from the longest ("ao molho
  vermelho" → "in red sauce", "sem pele" → "skinless", "leite de vaca
  integral" → "whole cow's milk"). They win over every rule.
- `terms` — one word each.
- `keep` — proper and cultural names rendered verbatim on purpose (açaí,
  feijoada, mocotó, picanha, brand names, fruit varieties like Formosa).
- `pending` — deliberately untranslated; see below.
- `adjectives` — terms that trail the noun in Portuguese and are inverted with
  a comma in English.
- `labels` / `categories` — matched as whole strings.

### Order rule

Catalog form, the same shape the USDA rows already use in the list: the facets
keep their order and their commas, and only the first letter of the whole name
is capitalized.

- "Arroz, tipo 1, cozido" → "Rice, type 1, cooked"
- "Frango, peito, sem pele, grelhado" → "Chicken, breast, skinless, grilled"

Three deterministic rules handle what a word list cannot:

1. **Genitive**: "carne de galinha" → "hen meat", "suco de laranja" → "orange
   juice" (modifier first).
2. **Preposition first**: "sem capa de gordura" → "without fat cap", never "fat
   without cap".
3. **Trailing qualifier**: "massa fresca" → "pasta, fresh", "leite de coco
   light" → "coconut milk, light" — inverted with a comma instead of reordered
   by guesswork.

## What stays in Portuguese, and why

`pending` terms, because the English word would name a **different** food, or
because the source token is not a word at all:

| Term | Foods blocked | Reason |
| --- | --- | --- |
| `cuscuz` | 4 | Brazilian cuscuz is steamed cornmeal, not wheat couscous |
| `jacare` | 5 | names a beef cut in "Jacare (carne bovina de segunda c/ osso)"; "alligator" would name another food |
| `requeijao` | 2 | requeijão is neither cream cheese nor ricotta |
| `sua` | 2 | garbled source row ("Sua suína"); the pronoun reading would be wrong |
| `n`, `co`, `ne`, `se` | 4 | region codes in "Prato de comida N/CO/NE/SE", not words |
| `mao` | 1 | "mão bovina" is a beef cut, not a hand |
| `tudo` | 1 | garbled source row ("Cheese tudo") |
| `c`, `q` | 0 | source abbreviations; "c/ osso" is read as the phrase "with bone" |

Those 19 foods show their whole Portuguese name in every language. Nothing else
blocks the base.

The rule behind the sweep: a `terms` entry may never echo the Portuguese word.
Echoing on purpose belongs to `keep` (açaí, feijoada, farofa, fruit varieties),
and everything else — abbreviations, region codes, cut nicknames — belongs to
`pending`. A unit test enforces it, so no fragment can slip through the gate
and publish a half-English name.

Ambiguities that were **decided** instead of pended, because the food itself is
unambiguous even if the wording varies: "farinha de mandioca" → "cassava flour"
(also called manioc flour), "polvilho" → "cassava starch", "charque"/"jabá" →
"jerked beef", "carne de sol" → "sun-dried beef".

Six measure labels are left untranslated because the source rows are typos or
brand fragments ("coió", "folded", "sadia", "geladinho gulozitos", "se a medida
de 10g de bacon", "nó"). They affect 8 foods, which keep the Portuguese label
on those chips.

Categories are translated in the glossary but **not written to the database**:
no screen shows a category, and migration 3 matches `category LIKE '%bebida%'`
to decide `is_liquid`. Translating the column would break that heuristic for no
visible gain.

## What shipped

- `scripts/lib/glossary.mjs` — pure translator, unit tested.
- `scripts/analyze-food-terms.mjs` — the counts above; writes
  `data/glossary-report.txt` (unknown terms ranked by the foods they block).
- Seed `version` 2 → 3, with `nameEn` per food and a `measureLabelsEn`
  dictionary written once for the 230 labels.
- `mapSeedFood.ts` writes `name_en`, puts the English name in the FTS text
  (alias column, search only) and localizes `Serving.label`.
- `DiaryRepository` reads `name_en`, and `entryName()` picks the language at
  render, so switching the language in "Metas" changes the diary without
  re-importing anything.
- `textRelevance` scores a food against the name of the current language plus
  the Portuguese fallback only. The English name reaches the FTS index, never a
  pt-BR result list: typing "rice" in Portuguese matches nothing, exactly as
  before this task.
- `sourceWeight` stops demoting the bundled tables in English once the row has
  an English name. The en-US table (USDA 32, TACO 18) was written when a TACO
  row could only offer a Portuguese name in an English list; with the glossary
  shipped, that reason is gone and the data contract applies again — the
  bundled base is the primary source, so TACO goes back to 30 and IBGE to 25.
  The demotion still holds for the rows the glossary could not cover. Without
  this, "rice" put "Rice crackers" and other USDA rows above "Rice, type 1,
  cooked", which on a 720x1480 screen means the staple falls below the fold.

Three fixes came from the device runs:

- The household measure of an entry is re-read at render too
  (`entryServingLabel`): the diary stores the label that was on screen when the
  entry was written, so an entry logged in Portuguese used to keep "colher de
  servir cheia" next to an English name. The stored text is matched against the
  measures the food has today; a measure the glossary never covered stays
  Portuguese in both languages.
- The day strip formats its chips with the language as part of the memo input,
  instead of keeping the weekday of the language the screen first rendered in.
- The search list scrolls back to the top when the query changes, so the first
  rows — "Seus" and the head of "Base" — cannot stay above the viewport.
- The candidate query pre-orders by the English name as well, and puts the
  bundled tables ahead of the online cache. `name_norm` holds the Portuguese
  name, so for "rice" every cached USDA row sorted ahead of every bundled row
  and the staple could fall outside the 100 candidates before the ranker saw
  it — which is why "rice type 1" found it and "rice" did not. The head of the
  window is now printed with the search timing in `__DEV__`, so the next device
  run measures it instead of inferring it.
- The arrival of a result row is travel only. It used to fade in from opacity
  0, and a row left at zero is not merely unseen: Android drops it from the
  accessibility tree while it keeps its height, which reads as a hole at the
  top of the list with normal rows below. Nothing that can hide a result is
  worth the fade.

Seed size: 846,681 → 930,358 bytes (+9.9%), under the 15% budget. Storing the
label translations once, instead of on every measure, is what keeps it there
(+26% otherwise).

## How to verify on the device

The names live in the seed, so the check is a screen check. It only reads true
from a clean start. Two kinds of state decide what the first screen says:

- **Route state is not persisted.** There is no `initialState` or
  `onStateChange` in `src/app/App.tsx`, and the search query is component state
  (`useState` in `useFoodSearch`), so every launch opens the diary with an
  empty field. A run that begins inside the full-screen add-food sheet is
  carrying a screen from the previous run, not showing a defect.
- **The language is persisted.** It lives in MMKV (`prefs`), so the app opens
  in whatever language the last run left it. A run that ended in English starts
  the next one in English, where the Portuguese fixed texts of a script simply
  do not exist — not in onboarding, not in the diary header. That is how an
  "expected screen did not appear" report is born here.

0. **Clean app data.** Install fresh, or clear the app's data, so the language
   goes back to "Sistema" (pt-BR on the J6) and the fixed Portuguese texts hold.
   Without this step the run inherits the language of the previous one.
   If the run is already in English and the data cannot be cleared, recover
   with the language-independent path: tap `open-goals` (text "Goals"), then tap
   **"Português"** in the language control — that option reads the same in both
   languages (`goals.languagePt` is "Português" in `src/i18n/pt-BR.ts` and in
   `src/i18n/en-US.ts`).
0a. **Let the seed import finish before searching.** English names live in
   `foods.name_en`, written by the import of seed **version 3**. The import runs
   once per version, in the background (`importSeedIfNeeded`), and the search
   screen waits for it on purpose: `useFoodSearch` only queries after
   `seedReady`. So on the first launch of a new build the list stays empty for a
   moment while 2,319 rows are rewritten — on the J6 that is seconds, not
   milliseconds. Wait for the dev log line
   `[bocado:seed] imported 2319 foods in X ms (version 3)`, or simply launch the
   app once, wait, and only then start the run. A device still carrying an older
   build keeps `name_en` NULL and will show the Portuguese names no matter what
   the language says — that is a stale install, not a translation failure.

0b. **First run only: finish onboarding.** A clean install opens on
   `OnboardingIntent`, never on the diary (`src/app/App.tsx` reads
   `prefs.isOnboardingDone()` synchronously). The three taps are language
   dependent, and the whole flow is in the language the app is showing:

   | Step | pt-BR | en-US |
   | --- | --- | --- |
   | Intent | "Perder peso" | "Lose weight" |
   | Profile | "Calcular" (or "Pular") | "Calculate" (or "Skip") |
   | Goal | "Começar" | "Start" |

   Tapping the Portuguese words while the app is in English leaves the run on
   the onboarding stack, where no goals action exists — that is what an
   "expected screen did not appear" report looks like from here.

1. **Open goals.** Tap `open-goals`. By text it reads **"Metas"** in pt-BR and
   **"Goals"** in en-US — the same control, both count as success. Matching
   only "Metas" while the app is in English will always miss.
2. **Language = English.** In the segmented control `language`, tap **"English"**.
   Both options of that control — "Português" and "English" — are written the
   same way in either language, so this step never depends on the language the
   app is currently showing. Then go back to the diary.
3. **Search.** Open a meal, type `rice`, and expect the TACO staple as
   **"Rice, type 1, cooked"** in the "Database" group. Capture the screen and
   the view tree.
4. **Log it.** Two paths, and they land on different screens:

   - **One tap:** the ring at the end of the row, `food-taco:3-add`
     (content description "Add Rice, type 1, cooked"). It writes the entry
     straight away and raises the snackbar — no portion sheet opens, so no
     confirm button exists to look for.
   - **Portion sheet:** tap the row itself, `food-taco:3`. The sheet opens and
     the confirm button is `portion-confirm`, whose label carries the energy of
     the portion: **"Add · 128 kcal"** in English, "Adicionar · 128 kcal" in
     Portuguese ("Save · …" when editing an entry). Match it by `portion-confirm`
     or by prefix — an exact match on "Add ·" alone never hits, because the
     number is part of the same string.

   Then check the entry in "Today": the row text and its accessibility label are
   in English. Capture the screen and the tree.
5. **Back to Portuguese.** Return to goals, tap **"Português"** in the same
   `language` control, and check the rows read **"Arroz, tipo 1, cozido"**
   again. No re-import, no reinstall: both names travel with the row and the
   language is picked at render.
6. **Honesty spot check.** Search `requeijão` (or `cuscuz`) in English: the
   name stays fully Portuguese, never half translated.

## Honesty rule

Half a name never ships. `nameEn` is written only when every term is known, and
the same holds for each measure label. On screen a food is either entirely in
English or entirely in Portuguese.
