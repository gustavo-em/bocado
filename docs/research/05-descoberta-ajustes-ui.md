# Decisões finais — Bocado, sete frentes fechadas em seis especificações

Tudo abaixo foi remedido por mim no repositório (larguras com fontTools sobre `assets/fonts/Inter-*.ttf` e os 2.319 nomes de `assets/data/foods.seed.json`; contraste WCAG 2.1 e ΔE00 com matrizes de Machado 2009 severidade 1,0; cobertura contada direto de `data/raw/TACO.json` e do seed). Onde meu número diverge da proposta **e** da crítica, o meu manda e eu digo por quê.

---

## 1. Macros por item — apagar a linha, 72 → 64 dp, manter a fala

**Decisão:** a terceira linha da entrada do diário sai do pixel e continua no áudio; a linha cai para 64 dp e as calorias ganham coluna fixa de 46 dp alinhada à direita.

### Anatomia (`src/components/DiaryEntryRow.tsx`, 360 dp, claro)

- `DIARY_ENTRY_ROW_HEIGHT` 72 → **64**. `styles.container`, `styles.content` e `styles.row` continuam com `minHeight` e **`alignItems: 'center'`** — não trocar por `paddingVertical: 12` fixo.
- Grupo interno (`<Animated.View style={[styles.row, styles.fill, press.style]}>`) passa a ter estilo próprio: `flexDirection: 'row'`, `alignItems: 'flex-start'`, `flex: 1`, **sem `minHeight`**. É isso que faz a kcal alinhar pela linha de base do nome (as duas são 16/22) enquanto o bloco de 40 dp fica centrado nos 64.
- Coluna esquerda `flex: 1`, duas linhas: L1 nome `body` Inter 400 16/22 `ink` `numberOfLines={1}`; L2 porção `label` Inter 400 13/18 `inkMuted` `numberOfLines={1}`. **L3 deletada.**
- Vão 12 dp (`spacing.md`, já existe como `marginLeft`).
- Coluna direita: `width: 46`, `textAlign: 'right'`, `body` 16 `tabular-nums` `ink`, sem unidade. Medido: em Inter o dígito tabular vale 0,6484 em, logo **"1.240" = 45,80 dp** e "412" = 31,12 dp. A largura fixa não é capricho — é o §1.2 ("números em coluna alinhados à direita"), que o `marginLeft` de hoje viola.
- `maxFontSizeMultiplier={1.3}` mantido nos dois textos.

**Escala de fonte, corrigindo as duas análises anteriores:** hoje, a 1,3×, o conteúdo de três linhas dá 28,6 + 23,4 + 23,4 = 75,4 dp e a linha **cresce para 75,4**. Com duas linhas dá 28,6 + 23,4 = **52 dp**, que cabe nos 64 em qualquer escala até 1,3× — é exatamente o que o §1.2 já escreve ("as linhas de 64 dp acomodam duas linhas a 1,3× … = 52 dp"). O ganho não é "8 dp que somem em fonte grande": é **8 dp a 1,0× e 11,4 dp a 1,3×**.

**Largura do nome:** 328 − 46 − 12 = **270 dp**. Medindo os 2.319 nomes em Inter Regular 16: **87,0% cabem inteiros** (mediana 156,2 · p75 217,0 · p95 348,5). Sem a coluna fixa seriam 282 dp e 88,4% — 31 alimentos. Troca aceita: alinhamento de coluna vale 31 nomes.

### Acessibilidade — não mexer

`entryMacrosSpeech()`, `macroText()`, `MACRO_SPEECH_SEPARATOR` e a chave `today.entryMacrosA11y` **ficam**, e `macrosSpeech` continua concatenado ao `rowLabel` (linhas 146-147 e 155-157). O comentário das linhas 92-96 diz que o leitor não pode anunciar como zero um macro que a fonte nunca declarou — não diz que a fala espelha o pixel. Regra que fica escrita: **macro por item some do pixel, não do áudio; o leitor de tela é o relance de quem não enxerga.**

### Remoções exatas

`DiaryEntryRow.tsx`: a terceira `<Text>` (:295-309, `testID` `diary-entry-<id>-macros`), `entryMacroLine()` (:88-90), `MACRO_SEPARATOR` (:39). `src/i18n/pt-BR.ts:59` e `src/i18n/en-US.ts:58` (`today.entryMacros`). `docs/DESIGN_SYSTEM.md` §2.5 (:230-233) e §1.5 (:152).

### Três pontos de montagem, não dois

`TodayScreen.tsx:480`, `MealScreen.tsx:235` e **`AddTray.tsx:143`** (o painel da bandeja, sobre `surface`, limitado por `PANEL_MAX_RATIO`). A mudança vale nas três listas; conferir no J6 que a bandeja expandida mostra o mesmo número de itens ou mais.

### Números corrigidos

- "1 escumadeira média cheia · 120 g" = **210,0 dp**, não 216,0.
- "Proteína 2,5 g · Carboidratos 28,1 g · Gorduras 0,2 g" = **319,9 dp**, não 323,5.
- 8 itens × 8 dp = **exatamente uma linha de 64**, não "quase".
- A porção mais longa do seed não é a escumadeira: é **"1 parte comestível de 1 caroço de pequi · 3,8 g" = 285,2 dp**. Só 2 de 1.913 porções passam de 270 dp (0,1%) — a afirmação "cabe com folga" continua verdadeira na prática, mas o exemplo estava errado.

---

## 2. Cor do carboidrato — trocar, mas o motivo alegado é falso

**Decisão:** `carbs` claro `#8A6520` → **`#9C5A2C`**; escuro `#D9AE64` → **`#EDA56E`**. A troca se paga pela queixa estética do dono (ΔE00 11,6 claro / 10,5 escuro contra a cor atual — muito acima do limiar de "outra cor"), **não** por WCAG.

### Medido por mim

| | `background` | `surface` | `surfaceMuted` | `track` |
|---|---|---|---|---|
| ocre `#8A6520` | 4,83 | 5,30 | 4,46 | 4,10 |
| cobre `#9C5A2C` | **4,89** | **5,37** | **4,51** | **4,15** |
| `#D9AE64` (escuro) | 8,77 | 7,90 | 7,06 | 6,69 |
| `#EDA56E` (escuro) | **8,79** | **7,91** | **7,08** | **6,70** |

Lab: `#9C5A2C` L* 45,0 · C* 43,9 · h 58,2° (ocre: 45,4 / 43,5 / 79,4°). `#EDA56E` L* 73,6 · C* 44,2 · h 62,0°. Ou seja: **mesma luminosidade, mesma saturação, matiz girada 21° para o vermelho.**

**Derrube a justificativa 4.** `MacroBar.tsx:71-80` pinta `backgroundColor: color` numa `View` de 3 dp; o rótulo é `inkMuted` e o valor é `ink`. O critério aplicável é 3:1 de não-texto (WCAG 1.4.11) contra o `track`, que o ocre já cumpria (4,10) e o cobre cumpre (4,15). Subir 4,46 → 4,51 sobre `surfaceMuted` é aritmética correta sobre um critério proibido para o token. Em `docs/BRAND.md:237` e `DESIGN_SYSTEM.md:70`, **atualize o número e mantenha a frase** "por isso macro nunca é cor de texto", com a razão certa.

### Separação (ΔE00 — normal / deuteranopia / protanopia / tritanopia)

```
CLARO, atual   carbs×protein  36,9  40,4  37,4  39,4
               carbs×fat      40,6  37,1  38,5  14,8
               protein×fat    21,8   3,0   2,9  38,1
CLARO, novo    carbs×protein  36,5  38,4  34,6  42,5
               carbs×fat      33,5  35,1  35,5  18,3
               carbs×danger   17,8  13,5  18,2   8,2
               carbs×accent   44,7  51,3  47,8  44,7
ESCURO, novo   carbs×protein  37,2  38,8  35,5  43,3
               carbs×fat      35,5  36,9  37,3  14,3
               protein×fat    24,4   2,5   5,2  42,1
```

Diga no spec o que a proposta escondeu: **todos os pares de macro perdem separação** em visão normal e nos dois dicromatismos vermelho-verde (pior caso −7,1 em carbs×fat normal). Nada desce de 33, então não bloqueia. Em compensação a **tritanopia melhora** (carbs×fat 14,8 → 18,3), o que a proposta não notou.

**Teste do cinza:** a razão de luminância entre as três macros vai de **1,31 para 1,30**. Continuam o mesmo tom em escala de cinza. Cor de macro segue sendo canal decorativo; rótulo e posição fixa é que carregam o dado (§6, §2.9).

### Gordura: não mexer agora

`protein×fat` dá ΔE00 **3,0 deut / 2,9 prot** no claro (2,5 / 5,2 no escuro). São a mesma cor para um dicromata, e isso já é verdade hoje. Não é reprovação de 1.4.1 porque `MacroBar` sempre tem rótulo, e conferi que não existe nenhuma superfície com cor de macro sem rótulo — os dois únicos usos são `HeroBlock.tsx:190` e `MealScreen.tsx:210`. Vira obrigatório no dia em que aparecer gráfico semanal, barra empilhada ou resumo compacto. **Não escureça a ameixa nesta rodada.**

### Lista de edição — 10 linhas

`src/theme/colors.ts:74` e `:97` · `docs/BRAND.md:219` e `:237` · `docs/DESIGN_SYSTEM.md:48` e `:70` · `docs/design/telas.html:22` **e `:32`** (o tema escuro do mock, que a proposta omitiu) · `docs/research/04-nome-e-marca.md:162` e `:167`. **Não tocar** em `04-nome-e-marca.md:182` e `:202`: conferi, são as Direções B ("Sálvia") e C ("Ameixa"), rejeitadas, com paletas próprias — editá-las reescreve registro histórico. `telas.html:108` usa `var(--carbs)`, não mexer.

`04-nome-e-marca.md:167` está errada em **três** pontos, corrija a linha inteira: (a) o trio **não** varia em luminosidade — protein L* 39,1 e fat L* 38,0, diferença de 1,1; (b) **não** sobrevive à deuteranopia — protein×fat ΔE00 3,0; (c) o piso da paleta passa de 4,83 para 4,89 e a saída `#7A5A1C` some junto com o ocre.

Custo no J6: zero. Dois literais; `MacroBar.tsx:41-43` anima só `scaleX`.

---

## 3. Calendário — o título vira o gatilho, e o título perde o dia da semana

**Decisão:** o título de "Hoje" (com glifo `calendar` 20 dp ao lado) abre uma folha de mês; **e `formatDayTitle` deixa de imprimir o dia da semana** — é essa segunda metade que faz a conta fechar.

### A conta de cabeçalho, refeita com métricas reais

Inter SemiBold 22 com tracking −0,2: "ter, 8 de set" = **124,2 dp** (não 150 como a proposta, nem ~122 como a crítica); "8 de set" = 83,2 dp. `TextButton` compacto é `labelMedium` 13 Medium com 12 dp de padding de cada lado: "Hoje" = 28,4 dp de texto, "Metas" = 38,3 + ícone 20 + gap 8. `ScreenHeader` põe 16 à esquerda e 4 à direita.

Largura fixa 96 dp; largura que escala com a fonte 190,9 dp. Limiar de truncamento:

| variante | trunca a partir de |
|---|---|
| hoje, sem calendário | **1,38×** |
| glifo na linha do título | **1,24×** |
| botão de ícone separado de 48 dp | **1,13×** |
| glifo no título **+ "8 de set"** | **1,57×** |
| botão separado **+ "8 de set"** | 1,44× |

As duas análises anteriores erraram aqui: a proposta disse que o botão separado deixa "1 dp de folga" (a folga real a 1,0× é 25,1 dp) e que o glifo aguenta 1,14×; a crítica chegou a 1,10× / 1,26×. O fato acionável é que **qualquer das duas formas reprova o compromisso de 1,3× do §1.2 enquanto o título disser "ter,"**, e que tirar o dia da semana resolve as duas com folga. Tire.

`formatDayTitle` (`src/i18n/format.ts:95-103`) perde `weekday: 'short'`. `formatDayLong` continua alimentando o leitor de tela via `titleAccessibilityLabel` (`TodayScreen.tsx:255`), e a faixa de dias logo abaixo já imprime "ter". Atualize o comentário das linhas 90-93.

### Gatilho

`ScreenHeader` ganha duas props novas — `onTitlePress?: () => void` e `titleIcon?: IconName` — e é isso que precisa ser declarado como mudança do componente canônico §2.17, não como edição local em `TodayScreen`. Quando `onTitlePress` existe, o `Text` do título e o glifo ficam dentro de um `Pressable` de 48 dp de altura, `accessibilityRole="button"`, `accessibilityLabel` = "Hoje" ou `formatDayLong(dia)`, `accessibilityHint` = "Escolher outro dia"; o `accessibilityRole="header"` sai **só nesse caso**. Título `flex: 1` e `numberOfLines={1}`; glifo `flexShrink: 0`, 8 dp de gap, cor `ink` (sem acento: é navegação, como "Metas").

### Folha

Rota nova `DayPicker: { day: string }` em `src/app/navigation/routes.ts` (o `Sheet` só existe dentro de rotas: `PortionSheetScreen.tsx:267`, `QuickLogSheetScreen.tsx:132`).

Conteúdo, de cima para baixo: alça 12 · 16 · linha do mês 48 ("setembro de 2026" `heading` 17 `ink` `accessibilityRole="header"` `flex:1`, mais dois botões 48×48 com `chevron-left`/`chevron-right`, `inkSubtle` + `disabled` nas pontas) · linha de dias da semana 20 (`caption` 11 `inkMuted`, 7 colunas, escondida do leitor com `accessibilityElementsHidden`) · 4 · grade **sempre 6 linhas × 48 = 288** · 8 · rodapé `TextButton` `compact` `accent` "Hoje" `align="start"` 48 · 16.

**Total 460 dp de conteúdo + `insets.bottom`.** `Sheet.tsx:205-206` já soma `insets.bottom + spacing.lg`, e `edgeToEdgeEnabled=true` está em `android/gradle.properties:44`: no J6 são **508 dp**, não 460. Teto de 85% = 629, folgado. Ficam 232 dp visíveis atrás: status 24 + cabeçalho 56 + faixa 56 + **96 dp do hero** — o número de 52 pt e a linha "restantes · 760 de 2.000 kcal" aparecem; a barra de progresso e as três barras de macro ficam atrás da folha. Escreva isso no spec assim, com esses números.

**Grade em 48 dp exatos (obrigatório).** A folha tem `paddingHorizontal: 16` fixo (`Sheet.tsx:202`), logo 328 dp — e 7 × 48 = 336 > 328. Dê à grade `marginHorizontal: -4`, largura 336, coluna = **48,00**. Sem `hitSlop` nenhum: o `hitSlop` proposto invadiria a célula vizinha (não há vão entre colunas), ao contrário do `DayStrip`, que tem 8 dp de vão por `space-between` para absorver o seu. Coluna 0 = [12, 60] com marcador 40 em [16, 56]; coluna 6 = [300, 348] com marcador em [304, 344] = 360 − 16. Simetria perfeita com o gutter e 12 dp da borda da tela (mínimo do §1.3 é 8). **Não** use `marginHorizontal: -16`.

Célula: marcador 40×40 raio `md` 12, número `body` 16 `ink` `tabular-nums`. Selecionado: marcador cheio em `ink`, número em `background`. Hoje: ponto 4 dp `accent` a 6 dp da base; se hoje é o selecionado, `inverseAccent` (§2.15 literal). Fora do intervalo: `inkSubtle`, sem marcador, sem toque. Meses vizinhos: célula vazia.

**Sem `usePressAnimation` na célula.** 42 shared values por página contra 7 da faixa, montados durante o próprio swipe, num Exynos 7870, não se paga por uma escala de 100 ms. A resposta ao toque é a folha fechando. Se quiser retorno imediato, use a forma funcional do `Pressable` (`style={({pressed}) => ({opacity: pressed ? 0.6 : 1})}`) — opacidade instantânea, zero Reanimated, zero duração escrita à mão, não viola §4.

**Abertura:** `FlashList` horizontal `pagingEnabled` `inverted`, mês mais novo primeiro, e **`initialScrollIndex={mesesAtrasDoSelecionado}`** — não `scrollToIndex` pós-montagem. Toda página tem a largura da janela, então o offset é determinístico e a lista pinta a página certa no primeiro frame. O truque do `DayStrip` (`DayStrip.tsx:167-175`) não cobre este caso: lá a semana corrente é sempre o índice 0; aqui o mês selecionado quase nunca é. `height: 288` fixo no pager (o corpo da folha é `flexShrink: 1`).

**Intervalo:** `[weeks[0], addDays(startOfWeek(today), 6)]`, exatamente o que `TodayScreen.tsx:94-99` já impõe — 25 páginas de mês. Tocar num dia seleciona e fecha; sem "OK".

**Sem marcação por dia.** O custo de banco é irrelevante (o índice `diary_day_meal` cobre a consulta), mas uma grade 6×7 com buracos é grade de aderência, banida pelo §7.

**Nenhuma biblioteca.** `react-native-calendars` traz `lodash` completo e `recyclerlistview` (segundo motor de lista ao lado do FlashList). Falta construir ~30 linhas em `src/domain/diary/days.ts` (`startOfMonth`, `addMonths`, `monthGrid` de 42 posições com segunda primeiro) e dois `Intl.DateTimeFormat` no cache de `format.ts` (`formatMonthTitle`; `formatDayFull` com ano, para o leitor).

**Docs:** `DESIGN_SYSTEM.md:403` diz hoje "`calendar` | abrir seletor de data (reservado; **não entra na v1**)". Tire o parêntese e registre `chevron-left`/`chevron-right` também como "mês anterior / próximo mês".

Copy nova: `today.pickDay` "Escolher outro dia" · `calendar.previousMonth` "Mês anterior" · `calendar.nextMonth` "Próximo mês".

---

## 4. Tema escuro — um `SegmentedControl` em Metas, e **uma** leva, não duas

**Decisão:** Sistema / Claro / Escuro em "Preferências", persistido no MMKV e aplicado pelo `ThemeProvider`; o modo noturno nativo entra na **mesma** entrega, porque sem ele o splash sai na cor errada em todo cold start.

### Controle

Bloco inserido em `GoalsScreen.tsx:370` (entre o `</View>` do idioma e o `SwitchRow` de vibração), com `marginTop: theme.spacing.md`, rótulo `body` `ink` "Tema" e o `SegmentedControl<AppearanceSetting>` a 8 dp abaixo, `testID="theme"`.

Medido: 360 − 2×16 = 328 de trilho; − 2×4 de `TRACK_PADDING` = 320 / 3 = **106,7 dp por segmento**; `SEGMENTED_HEIGHT` 48 com `hitSlop` 4/4. Rótulos em Inter Medium 13: "Sistema" 49,7 dp (64,6 a 1,3×), "Escuro" 43,0, "Claro" 33,1 — contra "Português" 64,0 (83,2 a 1,3×), que já cabe hoje. Folga enorme. `SegmentedControl` nunca usa `accent` (trilho `surfaceMuted` :99, pílula `surface` :101-108, rótulo `ink`/`inkMuted`) — a regra do acento único fica intacta.

Copy: pt-BR `theme: 'Tema'`, `themeSystem: 'Sistema'`, `themeLight: 'Claro'`, `themeDark: 'Escuro'`; en-US `'Theme'/'System'/'Light'/'Dark'`. Chaves próprias, não reuso de `goals.languageSystem`.

### Persistência

Espelho exato do idioma: `AppearanceSetting = 'system' | AppearanceMode` + `APPEARANCE_SETTINGS` em `colors.ts`; `KEYS.appearance` e `getAppearance`/`setAppearance` em `prefs.ts` usando o helper `readOneOf` (`prefs.ts:42-49`, mais robusto que o cast cru de `getLanguage` em :72-77); `ThemeProvider` passa a guardar `setting`, derivar `mode` e publicar um `AppearanceContext` com `{setting, resolved, setSetting}`. MMKV é síncrono: o primeiro frame já sai certo. Nada no `NavigationContainer` é remontado — `navigationTheme` já deriva de `theme.mode`. O docblock de `theme/index.ts:63` ("A manual override can be added here later") deixa de ser promessa.

### Nativo — leva única, ordem invertida em relação à proposta

O que a proposta chamou de "opcional" conserta mais por menos e vai **primeiro**:

1. `NavigationBarModule.setNightMode(mode)`: grava espelho em `SharedPreferences` e chama `AppCompatDelegate.setDefaultNightMode(MODE_NIGHT_YES/NO/FOLLOW_SYSTEM)`. `uiMode` já está em `AndroidManifest.xml:17`, então não recria a Activity. `MainApplication.onCreate` lê o espelho antes de `loadReactNative`. Com isso `values-night/`, `values-v27/styles.xml` e `values/splash.xml` passam a resolver **pela escolha**, e o splash sai certo.
2. `NavigationBarModule.setLightNavigationBars(light)`: `WindowInsetsControllerCompat(...).isAppearanceLightNavigationBars`. Necessário **só** para a troca ao vivo, porque `enableEdgeToEdge` roda uma vez (`WindowUtil.kt:67`, via `ReactActivityDelegate.java:142`) e fixa o bit pelo modo do sistema.
3. Barra de status: **zero linha nova**. `App.tsx` já faz `barStyle={theme.mode === 'dark' ? ...}`.

Corrija a citação: **`MainApplication.kt:17-18` é comentário** (`// Packages that cannot be autolinked yet...` / `// add(MyReactNativePackage())`), não um `add(BocadoPackage())` existente. O pacote e o módulo são criados do zero (~40 linhas de Kotlin no total, mais `BocadoPackage.kt`). E **remova** a afirmação de que virar `isAppearanceLightNavigationBars` mexe em `isNavigationBarContrastEnforced` — em `WindowUtil.kt:174-192` os dois são independentes.

### Docs

`DESIGN_SYSTEM.md:494` (primeiro marcador do §8: "Segue o sistema" → "Sistema, Claro ou Escuro, escolhido em Metas; o padrão é Sistema"), **`:503`** (último marcador do §8, que vira história de módulo nativo) e **`:382`** (§2.17, "Barra de status e de navegação nas cores do tema").

Teste: `__tests__/theme-appearance.test.tsx` ganha dois casos (escolha vence o sistema; escolha sobrevive à remontagem) e um `afterEach` com `prefs.setAppearance('system')` — o fake de MMKV do `jest-setup.js` é um `Map` de módulo que persiste entre casos.

---

## 5. Sugestões persistentes — abaixo das entradas, duas, **com** starters

**Decisão:** a linha de chips passa a existir também na refeição com itens, no fim da seção, a 8 dp da última entrada, com no máximo dois chips — e o fallback de starters **continua ligado**, senão a funcionalidade não existe para usuário novo.

### Anatomia

Bloco da seção: filete `line` 1 · cabeçalho 48 (inalterado) · entradas de **64** dp · **8 dp** · `ChipRow group="actions"` de 32 dp, gutter 16, gap 8, peek 24 · 8 dp até o filete seguinte.

Os 8 dp não são decoração: `CHIP_HIT_SLOP` é `{top: 8, bottom: 8}` (`Chip.tsx:30`) e a `DiaryEntryRow` é tocável nos 64 dp inteiros. Sem eles, um toque que devia abrir a folha de porção vira **gravação**.

`ActionChip` como já é: `surfaceMuted`, pill, 32 dp, padding 12, `maxWidth = min(240, 360−32−24) = 240`, label `label` 13 `ink`, detail `label` 13 `inkMuted`. Zero acento novo. Comportamento idêntico ao do estado vazio: toque curto grava a última porção e abre o snackbar de 4 s com "Desfazer"; toque longo abre a folha. Dias passados seguem sem chips (`isToday`).

### As três mudanças, e só elas

**(a) Portão.** `TodayScreen.tsx:412` deixa de exigir `entries.length === 0`.

**(b) Dois em vez de três, em uma linha.** `TodayScreen.tsx:399` vira `.slice(0, entries.length > 0 ? 2 : repeat ? 2 : 3)`. Não crie `LOGGED_MEAL_CHIPS` nem mexa em `useDaySuggestions` — o hook (`useDaySuggestions.ts:45-56`) constrói as quatro refeições com um `limit` único e nunca inspeciona `data.entries`; escolher limite por refeição ali obrigaria a mudar a assinatura. `pickRepeatSource` já retorna `null` quando a refeição tem item (`suggestions.ts:214`), então o ramo é limpo.

**(c) NÃO zere os starters.** Este é o furo que mata a proposta original: `SUGGESTION_EVENTS` é `WHERE day >= ?` sem teto (`DiaryRepository.ts:122-124`), então as entradas de hoje já contam como eventos; no dia 1, o único evento da refeição é o alimento recém-registrado, que leva `-100` (`suggestions.ts:145`) e cai abaixo de `SUGGESTION_MIN_SCORE = 0.05` — `ranked = []`. Com starters zerados, **nenhuma linha aparece**, em todas as quatro refeições, para todo usuário novo, exatamente no momento que a proposta usa para se justificar. Os starters já vêm filtrados por `alreadyLogged` (`suggestionsService.ts:205`), então o alimento recém-registrado nunca reaparece. Se quiser proteger qualidade, a regra é "starter nunca ocupa a 1ª vaga", não "starter fora".

**(d) Quase-duplicata entre fontes.** Descarte da linha o chip cuja primeira faceta coincida com a de algum alimento já registrado naquela refeição. Dobre com **`searchKey`** (`searchQuery.ts:8-10`), não com `alignedKey` (:36-43, que preserva alinhamento e é o helper de negrito da busca). O corte é `name.split(',')[0]` escrito na hora — `nameSegments` (`FoodResultRow.tsx:53`) exige uma query e devolve segmentos de destaque, não serve. Custo: um `Set` sobre no máximo 3 candidatos.

### Altura, recalculada com a linha de 64 dp

Bloco fixo do topo: 56 (`SCREEN_HEADER_HEIGHT`) + 56 (`DAY_STRIP_HEIGHT`) + 169 (`HERO_BLOCK_HEIGHT`) + 20 (`HERO_TO_MEALS`) = **301**. Útil no J6: 668. Sobram **367 dp** de refeições acima da dobra.

| cenário | por refeição | 4 refeições | total | passa de 668 |
|---|---|---|---|---|
| hoje, 1 entrada, sem chips | 49 + 72 = 121 | 508 | 809 | +141 |
| só decisão 1 (64 dp) | 49 + 64 = 113 | 476 | 777 | +109 |
| decisão 1 + chips | 49 + 64 + 8 + 32 = **153** | 636 | **937** | +269 |
| refeição vazia com chips | 49 + 32 = 81 | 324 | **649** | cabe |

Dia vazio com "Nada registrado ainda": 301 + 4×85 + 24 = **665**, que é exatamente o orçamento escrito em `DESIGN_SYSTEM.md:139` — o modelo está calibrado.

Custo real dos chips: **+40 dp por refeição com itens**, mas a linha de 64 dp devolve 8 dp por entrada, então o líquido contra hoje é **+128 dp** num dia de 4 refeições de 1 item, não +160.

Dobra: com duas refeições de 1 entrada acima, a terceira cai de **109 dp visíveis para 45** (o cabeçalho quase inteiro), não para 29 — porque a linha encolheu. Alavanca guardada, fora deste pedido: cortar a lista em 3 entradas + "ver mais" (pesquisa §4, nunca implementado), que devolve 192 dp num dia de 12 itens.

### O que medir no J6

Não é o toque duplo (`inFlight` tem chave `meal:foodId`, `useQuickLog.ts:65-67`, e **não** protege contra o vizinho que deslizou — dizer que protege é falso conforto; quem protege é o empurrão de 72 dp, que só chega depois do reload assíncrono). É: (i) arrastar a linha de chips não pode trocar o dia — o `ChipRow` usa `ScrollView` puro (`Chip.tsx:4`), sem `blocksExternalGesture`, contra o `Gesture.Pan` do dia (`TodayScreen.tsx:236-240`); (ii) o custo de remontar até 8 `ActionChip` com `usePressAnimation` mais 4 passes de layout a cada gravação.

---

## 6. Vitaminas e minerais — 5 minerais no banco, 7 linhas na tela, zero vitaminas

**Decisão:** embarque ferro, cálcio, magnésio, potássio e zinco; **não** embarque vitamina nenhuma; e a tela é nível 3 empurrada, opt-in, desligada por padrão, com sete linhas e nenhum percentual.

### Fase 0 — dados (pré-requisito absoluto)

Confirmei nas 69 chaves de `data/raw/TACO.json`: existem `iron_mg`, `calcium_mg`, `magnesium_mg`, `potassium_mg`, `zinc_mg`, `rae_mcg`, `vitaminC_mg`. **Não existem** selênio, B12, folato, vitamina D, vitamina E, açúcar total nem trans — esses ficam presos em no máximo 74,5% (só IBGE) por construção.

Cobertura que medi eu mesmo, contando `"Tr"` como zero legítimo (é o que `scripts/build-food-seed.mjs:420-434` faz):

| campo | TACO (n=597) | 113 do `boost` (88 TACO) | 54 starters (37 TACO) |
|---|---|---|---|
| ferro / cálcio / magnésio / potássio / zinco | 97,3–97,8% | **98,9%** | **100%** |
| sódio (já embarcado) | 98,3% | 98,9% | 100% |
| fibra (já embarcado) | 60,6% | 61,4% | 70,3% |
| vitamina C | 61,8% | 69,3% | 67,6% |
| vitamina A (RAE) | 42,7% | **28,4%** | **21,6%** |

No seed montado: `sodiumMg` 97,6% (2.264/2.319), `fiber` **56,4%** (1.308/2.319).

Três coisas que ninguém disse e mudam a conversa:

1. **Sódio não é o pior mineral do TACO, é o melhor** (98,3%). A crítica o rebaixou a 87,6% porque contou os 64 `"Tr"` como ausência; `"Tr"` é traço medido, e o build já o converte em 0.
2. **Fibra, que não custa nada em dados, tem a pior cobertura das sete linhas** (56,4% no seed). Ela é a única linha que realmente precisa do rodapé de cobertura.
3. Vitamina C parece salvável em global (61,8%) e desaba onde importa menos do que se imagina (69,3% no boost) — mas vitamina A é 28,4% entre os alimentos que o app empurra e 21,6% entre os starters. Um painel com vitamina A mostraria ~78% do dia como "sem dado" no arroz, no feijão, no pão e no ovo. **Vitaminas ficam fora, as duas.**

**Codificação:** array posicional `micro:[fe,ca,mg,k,zn]`, omitido quando os cinco faltam, arredondado a 1 casa na gravação (a TACO traz `magnesium_mg: 58.702` e o IBGE `3.509598866666667`). Medido por mim reserializando o seed: **+68.739 B (+8,8%)** contra os 779.684 B de hoje; com chaves nomeadas seriam **+176.966 B (+22,7%)**. O array economiza 108 KB. Em gzip, minha simulação com valores aleatórios dá +30 KB, mas dado real (cheio de zeros e valores redondos) comprime bem melhor — conte com +13 a +20 KB. Hermes está ligado (`gradle.properties:39`), então o seed vai como bytecode: o risco de parse que a proposta descreveu não é o mecanismo certo, e o custo é pequeno de qualquer jeito.

**Banco:** migração nova (índice 3 em `MIGRATIONS`; **nunca** editar a entrada `[0]` de `schema.ts:5`), `ALTER TABLE foods ADD COLUMN iron_mg_100 REAL` e as outras quatro, **anuláveis, sem `DEFAULT 0`**. Bump de `version` no seed. Escreva junto o teste que prova que 0 e "não medido" continuam distinguíveis — cinco colunas nulas em 2.319 linhas convidam a um `COALESCE(..., 0)` em algum agregado futuro.

**Também mexem:** `Per100g` (`NormalizedFood.ts:13-24`), `SeedFood` (`seedTypes.ts:21-38`), `build-food-seed.mjs` (TACO :461-487 e IBGE :499-518, colunas 15/11/12/18/20), `mapSeedFood`, `offMapper`, `usdaMapper` (`USDA_NUTRIENT` mapeia 11 ids, nenhum micro).

### Valores de referência — corrigidos antes de codificar

`magnésio 420` e `zinco 11` são a **RDA do DRI norte-americano para homem adulto**, exatamente a referência que a própria proposta rejeita. Os brasileiros (IDR da RDC 269/2005, carregada no Anexo II da IN 75/2020, valor único de adulto, o mesmo %VD do rótulo):

**cálcio 1.000 mg · ferro 14 mg · magnésio 260 mg · potássio 3.510 mg · zinco 7 mg · sódio 2.000 mg · fibra 25 g.**

Isso não é pendência, é correção: com 420 em vez de 260, um dia de 235 mg de magnésio lê "56%" onde o rótulo do supermercado diria "90%". (Não tenho como abrir o PDF oficial daqui; confira `potássio 3.510` e `fibra 25 g` antes do merge — os outros cinco são verificáveis por inspeção contra qualquer rótulo brasileiro.)

### Fase 1 — a tela

- **Rota** `Nutrients: { day: string }`, empurrada, `chevron-left`.
- **Interruptor**: `SwitchRow` em Metas → **Exibição** (não "Preferências"; não crie seção), abaixo do `SegmentedControl` de "Mostrar no diário", `marginTop: spacing.md`. Rótulo "Vitaminas e minerais"; dica "Acrescenta uma linha no fim de 'Hoje'. Os dados são parciais." **Padrão desligado.** Nada anuncia a chave: sem onboarding, sem badge, sem tooltip.
- **Gatilho em "Hoje"**: depois da última refeição, filete `line`, depois uma `ActionRow` de 48 dp — rótulo `body` `ink` "Nutrientes", dica `label` `inkMuted` "vitaminas e minerais de hoje", `chevron-right` 20 `inkMuted`. Sem acento (o índigo de "Hoje" já está gasto em "Adicionar" e no ponto de hoje). Só aparece se o interruptor está ligado **e** o dia tem ao menos uma entrada. Zero pixel acima da dobra, zero toque no caminho de registrar comida.
- **Cabeçalho**: `ScreenHeader` 56, título "Nutrientes" (não "Micronutrientes"), sem ação à direita. 12 dp abaixo, a linha de honestidade `label` 13 `inkMuted`, até 2 linhas: "ter 8 · 9 dos 12 alimentos de hoje têm estes dados." 16 dp, filete, lista.
- **Linha: 72 dp, não 64.** O §2.5 já fixou 72 para linha de três linhas. Anatomia: 22 (nome `body` `ink` à esquerda + valor `labelMedium` `ink` `tabular-nums` à direita, gap 12) + 4 + barra 3 + 4 + linha de cobertura `label` 13 `inkMuted` = **51 dp**, e **63,0 dp a 1,3×** — dentro de 72 com folga. Em 64 dp cortaria.
- **Base é o `MacroBar`, não o `ProgressBar`.** `ProgressBar.tsx:12` fixa altura 4 e `:77` fixa o preenchimento em `accent`; não aceita prop de cor nem de altura. `MacroBar` já é 3 dp, já tem prop `color`, já anima por `scaleX` com `transformOrigin: 'left'` e já monta rótulo/valor/4 dp/barra. Passe **`color={theme.colors.ink}`** — não `accent` (7 barras índigo violam o acento único), não `protein`/`carbs`/`fat` (são das macros, e é isso que impede a colisão protein×fat de vazar para uma superfície nova).
- **Sem `FlashList`.** São 7 linhas fixas; `map` num `ScrollView`, como o resto do app.
- **Sete linhas, nesta ordem:** Fibra · Cálcio · Ferro · Magnésio · Potássio · Zinco. Depois um rótulo de seção `labelMedium` `inkMuted` **"Limites"** (20 dp acima, 8 abaixo, sem caixa alta — padrão do §1.2, não do §2.14, que é o campo de busca), e sob ele **Sódio**. É a palavra que faz o trabalho semântico que a cor não pode fazer: sem "Limites", "916 de 2.000 mg" lê-se como "falta encher", e a regra do projeto proíbe vermelho/âmbar para dizer o contrário.
- **Sem percentual, em lugar nenhum.** O valor é `8,4 mg de 14 mg` e a barra carrega a proporção. Percentual convida a nota, nota convida a placar.
- **"Sem dado"**: nutriente sem nenhuma contribuição mostra "sem dado" em `label` `inkMuted` à direita, barra só trilho, sem linha 3, e ordena para o fim sob o rótulo "Sem dado". Listado, nunca escondido. Zero nunca é usado como "não medido", nem na soma.
- **Denominador honesto**: conte no rodapé de cada linha os itens **com** valor, e inclua no denominador tanto os alimentos do OFF (0 de 149 produtos BR medidos têm micro — a RDC 429/2020 só obriga energia, carboidratos, açúcares, proteínas, gorduras, fibra e sódio) quanto os `user:quick-*` do "Registrar só as calorias" (`QuickLogSheetScreen`), que não têm nutriente nenhum. São duas populações degradando o denominador, não uma.
- **Rodapé**: 24 dp acima, `label` 13 `inkMuted`: "As referências são valores diários gerais para adultos. O Bocado não avalia sua saúde." Depois 24 dp.
- **Sem** alerta de deficiência, `danger`, verde de "atingiu", placar, selo, notificação, bolinha de aviso, paywall, tela de escolher nutrientes, "contributors", ou visão semanal.
- **Registre a revisão**: `docs/research/03-ux-adicionar-alimento.md:187` atribui "nutrientes" ao **nível 3 = item**. Esta decisão move para o nível 3 = dia (ninguém tem meta de magnésio por almoço) e adia a linha por item para depois. Escreva isso como revisão explícita, não deixe passar em silêncio.

---

# 2. Conflitos entre frentes, e como resolvi

**(a) Cor do carboidrato × macros por item.** As duas se encontram num só lugar e o encontro é limpo, mas por um motivo que ninguém escreveu: a decisão 1 apaga a única superfície onde macro aparecia como **texto** (`DiaryEntryRow`, sem cor). Depois dela, `carbs` existe em exatamente dois lugares no app inteiro — `HeroBlock.tsx:190` e `MealScreen.tsx:210` —, sempre como preenchimento de barra de 3 dp com rótulo. Consequências que precisam ficar escritas:
- A justificativa WCAG da troca morre duas vezes: o critério de texto já não se aplicava (barra é não-texto, 3:1) e agora nem superfície de texto existe. Mantenha `BRAND.md:237` e `DESIGN_SYSTEM.md:70` dizendo "macro nunca é cor de texto", com a razão certa.
- **A armadilha:** com um carboidrato mais bonito, alguém vai propor devolver a linha de macros ao diário "agora colorida". Não. O teste do cinza continua reprovando (razão de luminância entre as três: 1,30, contra 1,31 do ocre) e protein×fat continua em ΔE00 3,0 sob deuteranopia. A cor nova é mais bonita, não mais legível. Deixe a regra escrita no §2.5: se um dia algum macro voltar a alguma linha, é `P 3 · C 28 · G 0` (92,8 dp medidos, contra 145,7 da linha de hoje), maiúscula + numeral, **nunca colorido**.
- Ordem: podem ir em qualquer ordem, não se tocam em arquivo nenhum.

**(b) Vitaminas × simplicidade.** Resolvi por quatro travas simultâneas, e nenhuma delas sozinha bastaria: **(i)** desligada por padrão e sem anúncio — quem quer vitamina vai a Metas; **(ii)** zero pixel acima da dobra e zero toque no caminho de registrar comida — uma `ActionRow` no fim de uma lista que já rola; **(iii)** lista fixa de sete, sem tela de configuração — é a tela a menos que todo concorrente tem, e é a barreira contra "escolher nutrientes / ver semana / ver por refeição / ver quem contribuiu", que vêm todos juntos assim que um deles abre; **(iv)** sem percentual e sem número Fraunces — não existe um número que responda por vitaminas, e inventar um é o "Nutrition Score" do Cronometer, território de saúde. A frase que fica no spec: **micronutriente é nível 3 do dia, opt-in, e nunca disputa com o registro.**

**(c) Cabeçalho de "Hoje": calendário × "Hoje" × "Metas".** Três coisas querem 360 dp. Medido, qualquer solução com o dia da semana no título reprova o 1,3× do §1.2 (1,24× com glifo, 1,13× com botão separado). Resolvido cortando o dado redundante em vez do controle: `formatDayTitle` perde "ter,", a faixa logo abaixo já diz o dia da semana e `formatDayLong` continua alimentando o leitor de tela. Resultado: 1,57× de folga.

**(d) Fim de "Hoje": chips de sugestão × linha "Nutrientes".** Convivem sem conflito porque estão em níveis diferentes: os chips são por refeição, dentro do bloco da refeição, antes do filete seguinte; a linha "Nutrientes" é uma só, depois do último bloco, com seu próprio filete acima. Ordem final da tela: … última refeição → chips dela → 8 dp → filete → `ActionRow` "Nutrientes" → 24 dp de padding inferior. E a linha "Nutrientes" só existe quando há entrada no dia, então o dia vazio continua nos 649 dp que a decisão 5 calculou.

**(e) Orçamento vertical: decisão 1 paga parte da decisão 5.** As duas mexem no mesmo número e foram calculadas em paralelo com bases diferentes. Refeito: os chips custam +40 dp por refeição com itens, a linha de 64 dp devolve 8 dp por entrada, líquido +128 dp num dia de 4×1 item (não +160), e a terceira refeição cai de 109 para 45 dp visíveis (não 29). **Faça as duas na mesma tarefa** — senão o J6 é medido duas vezes contra números que não valem mais.

**(f) Cor das barras de nutriente × colisão protein/fat.** A tela de nutrientes usa `ink`, não as cores de macro. Isso resolve dois problemas de uma vez: mantém o acento único e impede que a colisão protein×fat (ΔE00 3,0 deut) ganhe uma superfície nova. É também o que mantém a decisão "não mexer na gordura" válida — o dia em que ela deixa de valer é o dia em que alguém desenhar cor de macro sem rótulo.

---

# 3. Ordem de execução

| # | tarefa | destrava | custo | risco |
|---|---|---|---|---|
| **1** | **Cor do carboidrato** — 2 literais em `colors.ts` + 8 linhas de doc | nada | ~1 h | nenhum |
| **2** | **Linha do diário (72→64, macro fora) + sugestões persistentes** — uma tarefa só | mede o J6 uma vez; corrige o orçamento vertical antes das outras telas | ~1 dia | dobra da 3ª refeição; gesto do `ChipRow` |
| **3** | **Tema escuro** (JS + Kotlin, leva única) | independente | ~1 dia | build nativo; módulo legado sob bridgeless |
| **4** | **Calendário** (rota + folha + prop no `ScreenHeader` + copy do título) | independente; toca `ScreenHeader` e `format.ts` | ~1,5 dia | `initialScrollIndex`; role `header` perdido |
| **5** | **Vitaminas fase 0** — `Per100g`, migração 3, `SeedFood`, build do seed, mappers | **bloqueia a 6** | ~1 dia | migração + reimportação no aparelho |
| **6** | **Tela "Nutrientes"** — rota, `SwitchRow`, `ActionRow`, linha de 72 dp sobre `MacroBar` | — | ~1 dia | nenhum técnico |

**O que junta numa tarefa só:** 1 e 2 são independentes e podem ir no mesmo commit se quiser (nenhum arquivo em comum além dos docs). 5 e 6 podem ser uma tarefa só, mas **só nessa ordem** e com um checkpoint entre elas: se a fase 0 escorregar, a fase 1 vira uma tela de sete linhas dizendo "sem dado".

**O que não pode ser feito em paralelo:** 2 e 4 tocam `TodayScreen.tsx`; 4 e qualquer coisa que use `ScreenHeader` (Metas, refeição, busca, onboarding) precisam do mesmo commit da prop nova. 5 antes de 6, sempre.

**Por que 1 primeiro:** é a única que responde à queixa do dono no mesmo dia, com risco zero, e serve de calibração — se ele olhar `#9C5A2C` e disser "continua mostarda", vale saber isso antes de gastar cinco dias no resto.

---

# 4. O que eu recomendo NÃO fazer

1. **Não mostre macro por item em forma nenhuma.** Nem colorido (ΔE00 3,0 protein×fat sob deuteranopia; razão de luminância 1,30 entre as três; até 24 manchas de cor por tela contra a regra do acento), nem à direita (coluna direita precisaria de ~172 dp, derrubando o nome de 270 para 144 dp e de 87,0% para 43,2% de nomes inteiros), nem por extenso (319,9 dp num espaço de 270). Nome truncado é o único dado da linha que não se recupera em lugar nenhum; macro está a 169 dp acima no hero, a um toque na folha de porção (`PortionSheetScreen.tsx:192`) e desenhado na tela da refeição (`MealScreen.tsx:210`).

2. **Não conserte a gordura agora.** `protein×fat` colide de verdade, mas é conforme (rótulo + posição fixa, §2.9 e §6), e o conserto (`fat` → `#572F53`) aproxima a gordura do índigo e deixa a barra visivelmente mais pesada que as outras duas. Custo real, benefício zero enquanto não existir cor de macro sem rótulo.

3. **Não embarque vitamina A nem vitamina C.** 28,4% e 69,3% entre os 113 alimentos que o app empurra; 21,6% e 67,6% entre os 54 starters. Uma tela que mostra vitamina A como "sem dado" em quatro de cada cinco itens do dia não é dado parcial honesto, é uma tela quebrada com pedido de desculpas. E não embarque os 22 nutrientes disponíveis: +56% de seed por dado com 78% de preenchimento médio.

4. **Não publique a tela "Nutrientes" antes da migração.** Hoje `foods` tem `fiber_100`, `sugar_100` e `sodium_mg_100` e nada mais (`schema.ts:19-25`): a tela sairia com duas linhas reais e cinco permanentes em "Sem dado".

5. **Não adicione `react-native-calendars`.** 4,7 MB, `lodash` completo e `recyclerlistview` — um segundo motor de lista ao lado do FlashList — contra ~30 linhas de aritmética de calendário.

6. **Não marque dias no calendário.** É barato no banco e errado no produto: grade 6×7 com buracos é grade de aderência, banida pelo §7, e seria um terceiro canal visual dentro de um marcador de 40 dp que já carrega dois.

7. **Não crie aba, acordeão nem tela cheia para o calendário ou para os nutrientes.** Aba custa 56 dp em todas as telas para sempre; acordeão é proibido pela própria pesquisa (03:187) e anima `height`, vetado pelo §4.

8. **Não parta o tema escuro em duas levas.** A leva "opcional" é a que conserta o splash, a barra de navegação no cold start e o `setTheme` da Activity, por menos código. Entregar só a leva 1 é entregar a feature com 400-800 ms de fundo osso toda vez que o dono abre o app no modo escuro — exatamente o estado que justifica a feature.

9. **Não zere os starters na refeição com itens.** Já expliquei: dia 1, nenhuma linha, nas quatro refeições.

### O pedido que não se paga

**Vitaminas e minerais.** É o único dos seis cujo custo excede o valor, e o dono merece ouvir isso com número: cinco colunas novas de banco, uma migração, um rebuild do seed (+8,8% de bytes), quatro mappers, uma rota nova, um componente de linha novo, um interruptor, uma `ActionRow` — cerca de dois dias, mais do que o calendário e o tema escuro juntos — para uma tela que **nasce desligada, sem anúncio nenhum**, e cuja própria pesquisa (03:187) só justificou nutrientes no nível do item, não do dia. A métrica de sucesso não pode ser adoção; será satisfação de quem liga, que por construção é quase ninguém.

Duas saídas honestas, e eu recomendo a primeira:
- **Adiar inteira** (fase 0 e fase 1 juntas) para depois de o dono usar o app um mês com as outras cinco decisões. Se ele nunca sentir falta, você economizou dois dias no orçamento mais apertado do projeto.
- Se ele quiser algo agora, **faça só a fase 0** (os dados, que envelhecem bem e destravam qualquer decisão futura) e **nada de UI**. O que **não** vale é a versão meio-boca: uma linha de micros na folha de porção sem total do dia não responde pergunta nenhuma.

O produto se define por registrar comida rápido. Das seis, as que atendem essa tese são a 2 (sugestões persistentes, que é literalmente o atalho no momento de maior uso) e a 1 (que devolve espaço e limpa a leitura). O calendário e o tema escuro são higiene barata. Micronutriente é o único item que adiciona superfície sem acelerar registro nenhum.

---

# 5. Riscos que o dono precisa saber antes de aprovar

**Acessibilidade e leitura**
1. O título de "Hoje" deixa de ser `accessibilityRole="header"` para virar botão: perde-se a navegação por cabeçalhos do TalkBack nessa tela. Troca consciente; a tela não tem conteúdo longo.
2. O usuário macro-first perde o relance por item e paga um toque (o mesmo que já abre a folha). Métrica de reversão: **aberturas da folha de porção que fecham sem alterar porção, por semana** — se subirem, ele estava usando a linha para ler, não para editar.
3. A linha de chips pode ser lida como mais uma entrada por quem só passa o olho. Separam-nas 32 vs 64 dp, pílula `surfaceMuted` vs linha em papel aberto, e kcal dentro da pílula vs kcal na margem. É o ponto a conferir na captura do auditor.

**Desempenho e aparelho**
4. `initialScrollIndex` em `FlashList` horizontal paginado é a classe exata de bug do spec 09 (a faixa que nasceu vazia). Se o calendário abrir em branco no J6, é aqui.
5. Remontar até 8 `ActionChip` a cada gravação, com `usePressAnimation` cada, mais 4 passes de layout de `ScrollView` horizontal, num Exynos 7870, durante adição rápida em sequência. Pequeno, mas não é zero — e é isso que precisa de medição, não o toque duplo.
6. Arrastar a linha de chips não pode trocar o dia: o `ChipRow` usa `ScrollView` puro, sem `blocksExternalGesture`, contra o `Gesture.Pan` do dia (limiar 60, `activeOffsetX` ±24). Pré-existente nas refeições vazias, mas esta decisão o promove a caminho de entrega.
7. Módulo nativo legado (`ReactPackage`) sob bridgeless: funciona pelo interop de TurboModules, mas é o único item do plano que não dá para confirmar sem build. Se `NativeModules.BocadoNavigationBar` sair `undefined`, o wrapper deve virar no-op silencioso e o plano B é `react-native-edge-to-edge`.
8. `AppCompatDelegate.setDefaultNightMode` faz `Appearance`/`useColorScheme` reportarem a escolha, não o sistema: o log `[bocado:theme]` deixa de distinguir "o aparelho não trocou" de "uma tela ignorou a troca". Inofensivo, mas ajuste o log.

**Dados**
9. Os VD de potássio (3.510) e fibra (25 g) vieram de transcrição; confira contra o Anexo II oficial antes do merge. Cálcio 1.000, ferro 14, magnésio 260, zinco 7 e sódio 2.000 batem com o que qualquer rótulo brasileiro imprime.
10. TACO e IBGE POF são de 2011, e a POF é compilação (TACO + USDA SR + literatura), não análise própria: dois alimentos parecidos podem trazer minerais de origens diferentes. Rotule a tela com a fonte, como `SourcesScreen` já faz.
11. Todo alimento vindo do OFF entra com micro nulo (0 de 149 produtos BR medidos têm qualquer micronutriente — é a lei, não a consulta), e os `user:quick-*` também. Num dia com dois industrializados a linha cai de "11 de 11" para "7 de 11". Por isso o rodapé conta itens, não só percentual.
12. Cinco colunas nulas em 2.319 linhas convidam a um `COALESCE(coluna, 0)` em algum agregado futuro, transformando "não medido" em zero sem ninguém perceber. O teste que prova a distinção entra junto com a migração, não depois.

**Contrato e testes**
13. Quebra qualquer teste que asserte o `testID` `diary-entry-<id>-macros` ou a altura 72 (`DIARY_ENTRY_ROW_HEIGHT`); muda `docs/specs/09-ajustes-do-dono.md` (o bullet 1 e o passo 2 da evidência viram revertidos; **o bullet 4, do rótulo de acessibilidade, continua válido**), `DESIGN_SYSTEM.md` §1.5, §2.5, §2.17, §3 (ícone `calendar`) e §8.
14. O fake de MMKV do `jest-setup.js` é um `Map` de módulo que persiste entre casos do mesmo arquivo: sem `prefs.setAppearance('system')` no `afterEach`, os testes de tema viram flaky assim que o `ThemeProvider` passar a ler `prefs`.
15. O escopo da tela de nutrientes escorrega sozinho: assim que ela existe vêm "escolher nutrientes", "ver a semana", "ver por refeição", "quem contribuiu". A lista fixa de sete e a ausência de tela de configuração são a única barreira; abrir qualquer um reabre todos.