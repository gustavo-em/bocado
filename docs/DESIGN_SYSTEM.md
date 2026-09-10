# Bocado — Design System

Este é o contrato. Toda tarefa do orquestrador obedece a ele; o `feature_lead` e
o `ux_auditor` julgam fidelidade por ele e pelas telas de referência em
`docs/design/telas.html`. A fonte dos valores é `src/theme/*.ts` — se este
documento e o código divergirem, o código está errado e este documento manda,
até alguém corrigir os dois.

Leia junto: `docs/BRAND.md` (símbolo, paleta, voz), `docs/ARCHITECTURE.md`
(camadas), `docs/research/03-ux-adicionar-alimento.md` (evidência das decisões).

---

## 0. Cinco princípios

1. **Papel, não cartão.** A tela é uma página. Hierarquia vem de tipografia e
   espaço; caixas, bordas e sombras não organizam nada. Um filete de 1 dp separa
   seções; nada mais.
2. **Um número responde.** Cada tela tem um número grande em Fraunces e todo o
   resto é apoio em Inter. Se dois números disputam, a tela está errada.
3. **O acento marca fazer.** No máximo um papel de ação e um papel de estado por
   tela — e **uma tela pode ter zero papéis de ação**. O índigo é raro de
   propósito: quatro acentos idênticos numa tela (era o caso dos quatro
   "Adicionar" de "Hoje") destroem a raridade que faz o acento ser encontrado
   sem procurar. Ação repetida por seção é tinta, não acento (§2.6).
4. **Cor nunca julga.** Nada de vermelho ao passar da meta, nada de verde ao
   sobrar. Cor semântica só nas barras de macro, sempre com rótulo.
5. **O J6 é o piso.** 360 × 740 dp, 720p, 2 GB. Sem blur, sem sombra grande, sem
   animar layout, sem imagem de comida. O que não roda liso lá não entra.

---

## 1. Tokens

### 1.1 Cores (`src/theme/colors.ts`)

| Token | Papel | Claro | Escuro |
| --- | --- | --- | --- |
| `background` | a página | `#F7F4EE` | `#15161A` |
| `surface` | folha, bandeja, campo de texto | `#FFFFFF` | `#1E2026` |
| `surfaceMuted` | chip não selecionado, badge, campo de busca | `#EFEBE3` | `#262930` |
| `ink` | texto primário, ícones de ação, chip de dia selecionado | `#1B1D21` | `#ECEAE4` |
| `inkMuted` | texto secundário: qualificadores, porções, placeholder, badge, rótulos | `#5C5F66` | `#A7A6A0` |
| `inkSubtle` | classe 3:1 — borda do anel "+", alça da folha, texto desabilitado | `#7E8188` | `#767A82` |
| `accent` | ação primária, "✓", selecionado, progresso, ponto de "hoje" | `#2F3A8C` | `#93A0F2` |
| `onAccent` | texto e ícone sobre `accent` | `#FFFFFF` | `#15161A` |
| `accentSoft` | fundo do chip selecionado | `#E4E7F7` | `#2A2F4F` |
| `line` | filete de 1 dp entre seções, borda superior da bandeja | `#E3DFD6` | `#2C2F37` |
| `track` | trilho das barras | `#E6E2DA` | `#2A2D34` |
| `overGoal` | excedente da barra diária | `#1E2661` | `#C4CCFF` |
| `protein` / `carbs` / `fat` | preenchimento das barras de macro, só | `#3F5F7C` / `#9C5A2C` / `#6E4E76` | `#8FB6D6` / `#EDA56E` / `#C39ACB` |
| `danger` | diálogo de confirmação destrutiva ("Apagar tudo") e falha de rede | `#9E2A2B` | `#E5757A` |
| `scrim` | atrás da folha | `rgba(27,29,33,.42)` | `rgba(0,0,0,.55)` |
| `inverseSurface` / `onInverseSurface` / `inverseAccent` | snackbar e ação de deslizar ("Remover") | `#1B1D21` / `#F7F4EE` / `#93A0F2` | `#ECEAE4` / `#15161A` / `#2F3A8C` |

**O acento marca fazer, e uma tela pode ter zero papéis de ação.** `accent` é
para a ação primária, o "✓", o selecionado e o progresso — nunca para uma ação
que se repete por seção. Em "Hoje" o acento ficou só no papel de estado (barra e
ponto do dia); o acento de ação vive no "+"→"✓" da busca (§2.4), no
`PrimaryButton` da folha e no "Concluir" da bandeja. A ação de cada refeição é o
anel "+" em tinta (§2.6).

**Três tintas, por obrigação de contraste.** `ink` ≥ 12:1 (o que se lê primeiro);
`inkMuted` ≥ 4,5:1 (qualquer texto legível — inclusive placeholder e badge);
`inkSubtle` ≥ 3:1 (só não-texto e desabilitado). Um texto em `inkSubtle` é defeito.

Contraste medido (WCAG 2.1, claro / escuro):

| | sobre `background` | sobre `surface` | sobre `surfaceMuted` |
| --- | --- | --- | --- |
| `ink` | 15,4 / 15,0 | 16,9 / 13,5 | 14,2 / 12,1 |
| `inkMuted` | 5,8 / 7,4 | 6,4 / 6,7 | 5,4 / 6,0 |
| `inkSubtle` (não-texto) | 3,6 / 4,2 | 3,9 / 3,8 | 3,3 / 3,4 |
| `accent` | 9,1 / 7,4 | 10,0 / 6,6 | 8,4 / 5,9 |
| `danger` | 6,8 / 6,2 | 7,5 / 5,6 | 6,3 / 5,0 |

`onAccent`/`accent` 10,0 / 7,4 · `accent`/`accentSoft` 8,1 / 5,3 ·
`onInverseSurface`/`inverseSurface` 15,4 / 15,0 · `inverseAccent`/`inverseSurface`
6,9 / 8,3 · `overGoal`/`background` 12,7 / 11,6. As cores de macro **não são cor de
texto** (`carbs` cai a 4,51 sobre `surfaceMuted`; o critério que a barra cumpre é o
de não-texto, 3:1 contra o `track`); o rótulo da macro é `inkMuted` e o valor é
`ink`.

Mudanças feitas nesta rodada, com motivo: `inkSubtle` claro de `#8A8D94` para
`#7E8188` (o anterior dava 2,8:1 sobre `surfaceMuted`, abaixo até da classe
não-texto); `inverseSurface`, `onInverseSurface` e `inverseAccent` adicionados
(o acento do tema claro sobre tinta dava 1,7:1 — um snackbar precisa do acento
do *outro* tema).

**Regra do acento.** O acento marca fazer, e uma tela pode ter **zero** papéis de
ação. Por tela: no máximo um papel de ação (`PrimaryButton` da folha **ou**
"+"→"✓" da busca **ou** "Concluir" da bandeja) e um papel de estado (selecionado,
hoje, progresso). Ação que se repete por seção é tinta, não acento: a de cada
refeição é o anel "+" de §2.4. Nunca em ícone decorativo, título, filete, fundo
de seção, ilustração ou texto corrido.

**Elevação.** Não existe sombra no app, exceto na bandeja inferior (§2.10). Folha
usa scrim. Cards não existem. No escuro, cada nível de superfície clareia ~4
pontos de luminosidade HSL: `background` 9 % → `surface` 13 % → `surfaceMuted` 17 %.

### 1.2 Tipografia (`src/theme/type.ts`)

Duas famílias, empacotadas de `assets/fonts` (OFL): **Fraunces 144 Soft** (só
números grandes e o lockup) e **Inter** (todo o resto). Uma tela escolhe um papel,
nunca um número.

| Papel | Fonte | Corpo / entrelinha | Tracking | Onde |
| --- | --- | --- | --- | --- |
| `hero` | Fraunces 400 | 52 / 56 | −1 | o número-resposta de "Hoje" |
| `display` | Fraunces 400 | 40 / 44 | −0,6 | a quantidade na folha de porção ("1,5") |
| `title` | Inter 600 | 22 / 28 | −0,2 | título de tela ("Hoje", "Metas") |
| `heading` | Inter 500 | 17 / 22 | 0 | nome da refeição, nome do alimento na folha, unidade ao lado do `display`, título do modal de busca |
| `body` | Inter 400 | 16 / 22 | 0 | nome do alimento, entrada do diário, linha sob o hero, snackbar, campo de busca |
| `bodyMedium` | Inter 500 | 16 / 22 | 0 | primeira faceta do nome, rótulo de botão, total da bandeja |
| `label` | Inter 400 | 13 / 18 | 0 | porção, kcal/100 g, rótulo de macro, "Nada registrado ainda", linha de ajuda |
| `labelMedium` | Inter 500 | 13 / 18 | 0 | valor de macro, botão compacto, chip selecionado, rótulo de seção ("Sugestões", "Base") |
| `caption` | Inter 500 | 11 / 14 | +0,5 | badge de fonte, dia da semana na faixa. Nunca menor |

Ajustes feitos, com motivo: `displaySmall` (Fraunces 24) foi **removido** da
escala em 2026-09-10. Em 2026-09-09 o subtotal do cabeçalho deixou a serifa
(§2.6) e o papel ficou sem uso; a Fraunces aparece só onde há **uma** resposta
por tela (hero, quantidade da folha, total da tela da refeição, decisão 11), e
um papel sem uso só convida a voltar a usá-lo. Não recrie o papel. `display` (40)
é novo, porque a folha de porção pede 36–44 sp (spec 03) e nada na escala
atendia. A escala pedida (52 · 28 · 22 · 17 · 16 · 13 · 11) fica confirmada em
todo o resto.

Regras:

- `tabular-nums` (`fontVariant: ['tabular-nums']`) em **todo número que pode
  mudar**: hero, subtotal, kcal de linha, bandeja, macro, stepper, dia na faixa.
- `includeFontPadding: false` no Android (já em `textDefaults`).
- Fraunces nunca compõe palavra; a unidade ao lado de um número Fraunces é Inter
  (`heading` ou `label`, `inkMuted`).
- Texto sempre alinhado à esquerda; números em coluna alinhados à direita.
- Sem caixa alta forçada (`textTransform`) em lugar nenhum: o badge já é sigla,
  e "ter"/"seg" são minúsculas em pt-BR.
- `maxFontSizeMultiplier`: 1,2 em `hero`/`display`, 1,3 nos demais. As linhas de
  64 dp acomodam duas linhas a 1,3× (22 + 18) × 1,3 = 52 dp.

### 1.3 Espaçamento (`src/theme/spacing.ts`)

Grade de 4: `xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`.

| Onde | Valor |
| --- | --- |
| Margem lateral de tela (gutter) | 16 |
| Do bloco hero à primeira refeição | 20 |
| Entre refeições | 8 — o filete separa, e as linhas de 56 já carregam 17 dp de ar |
| Entre rótulo e valor dentro de um bloco | 4 |
| Entre itens de uma linha (nome ↔ kcal, texto ↔ botão) | 12 |
| Entre chips | 8 |
| Topo do bloco hero, abaixo da faixa de dias | 20 |
| Orçamento vertical de "Hoje" vazio | 665 dp de conteúdo para os 668 úteis do J6 (740 − 24 de status − 48 de barra de navegação): as quatro refeições precisam aparecer sem rolar |
| Padding inferior de lista com bandeja | altura da bandeja + 16 |
| Nada a menos de 8 dp de uma borda de tela | — |

### 1.4 Raios

`xs 6` badge de fonte · `sm 8` snackbar · `md 12` botão primário, campo de busca,
chip de dia · `xl 24` topo da folha · `pill` chips. `lg 16` existe e não é usado
por nenhum componente canônico.

### 1.5 Alvos de toque

Mínimo **48 × 48 dp** em tudo que responde a toque, inclusive quando o visual é
menor (o anel "+" tem 36 dp dentro de um alvo de 48). Linha de resultado 64 dp,
entrada do diário 64 dp, cabeçalho de refeição 48 dp, cabeçalho de tela 56 dp.
Chip de 32 dp ganha `hitSlop` vertical de 8.

---

## 2. Componentes canônicos

Cada componente: anatomia, medidas, estados, motion, acessibilidade. As telas em
`docs/design/telas.html` mostram todos eles montados.

### 2.1 Botão primário

- Altura 48, raio `md`, fundo `accent`, rótulo `bodyMedium` em `onAccent`,
  padding horizontal 20, largura total na folha e no rodapé; na bandeja, largura
  do conteúdo.
- Rótulo pode carregar o número: `Adicionar · 116 kcal`, `Salvar · 116 kcal`
  (número `tabular-nums`). Um botão primário por tela.
- Pressed: `PRESS` (100 ms), opacidade 0,85 e escala 0,98. Desabilitado: fundo
  `surfaceMuted`, texto `inkSubtle` (isento de contraste), sem opacidade extra.
  Foco de teclado: anel de 2 dp em `accent` a 2 dp do botão.
- Haptic: só no "Concluir" (`effectDoubleClick` / `notificationSuccess`), uma vez
  por sessão.

### 2.2 Botão texto

- Alvo 48 de altura; só texto, padding horizontal 12 para o rótulo não colar na
  borda.
- **Padrão**: `bodyMedium` 16 em `accent` — "Desfazer" (em `inverseAccent`),
  "Cancelar" na folha de metas. A ação de uma refeição **não** é botão texto:
  repetida quatro vezes por tela, ela é o anel "+" de §2.4 (decisão 12).
- **Compacto**: `labelMedium` 13 — "Hoje" (volta ao dia atual, `accent`),
  "ver mais" (`accent`), "Metas" com ícone `settings-2` 20 + 8 de espaço (`ink`,
  porque é navegação, não ação).
- Pressed: opacidade 0,85, sem escala.

### 2.3 Chip

- Altura 32, raio `pill`, padding horizontal 12, espaço entre chips 8.
- Não selecionado: fundo `surfaceMuted`, texto `label` 13 em `ink`.
  Selecionado: fundo `accentSoft`, texto `labelMedium` 13 em `accent`.
- Seleção única: `accessibilityRole="radio"` + `accessibilityState.selected`.
  Chip de sugestão (tarefa 04) é `button`.
- Motion: `SELECT` (120 ms) no fundo; haptic `clockTick` / `selection`.
- Linha de chips rola na horizontal com o gutter como padding; nunca quebra em
  duas linhas na folha.
- Um chip pode ficar fixo fora da rolagem, numa das pontas: na folha de porção
  é "g" (ou "ml") na **primeira** posição, com as medidas caseiras rolando à
  direita dele (spec 09); em "Mover para…" o pino segue na ponta direita.

### 2.4 Linha de resultado de alimento (busca)

```
Arroz, tipo 1, cozido                                    ( + )
1 colher de servir (45 g) · 58 kcal   TACO
```

- Altura fixa **64** (FlashList recicla sem medir); padding esquerdo 16, direito 8
  (o botão tem os seus 48). Sem filete entre linhas, sem card.
- Linha 1, uma linha, reticências no fim: primeira faceta do nome
  (`bodyMedium`, `ink`); o resto (", tipo 1, cozido") na mesma linha em `body`
  `inkMuted`. O trecho que casa com a busca fica em Inter 600, `ink`, onde
  estiver.
- Linha 2, `label` `inkMuted`: porção padrão com gramas e kcal dessa porção;
  depois o badge de fonte (§2.13) a 8 dp. `128 kcal/100 g` entra **só** quando o
  alimento não tem medida caseira (a porção padrão é 100 g) ou quando a linha tem
  ≥ 400 dp — em 360 dp não cabe com porção + kcal + badge, e a porção é o dado que
  faz o caminho rápido funcionar.
- Botão "+": alvo 48 × 48 à direita; anel visual de 36 dp com borda 1,5 dp em
  `inkSubtle`, ícone `plus` 24 em `ink` (medidas em `src/components/AddRing.tsx`:
  `RING_SIZE` 36, `RING_BORDER` 1,5). **Adicionado**: anel preenchido em
  `accent`, sem borda, ícone `check` 24 em `onAccent`; a linha 2 passa a mostrar a
  porção registrada. Tocar de novo abre a folha, nunca duplica.
- **O "+"→"✓" é exclusivo desta linha.** Aqui o anel é por alimento e confirma
  uma gravação, por isso pode preencher em `accent`. O anel do cabeçalho de
  refeição (§2.6) é por refeição e só abre a busca: nunca preenche, nunca vira
  "✓". Não "conserte" a diferença — ela é a diferença entre confirmar e abrir.
- Motion: "+" → "✓" em `CONFIRM` (200 ms), o "✓" com escala 0,8 → 1; linhas
  aparecem com `LIST_STAGGER_MS` 20, máx. 6, opacidade + subida de 8 dp.
  Haptic `effectClick` / `impactLight` ao adicionar.
- Acessibilidade: a linha inteira é um elemento; o "+" tem
  `accessibilityLabel="Adicionar <nome>"` e, depois, `"Adicionado <nome>, tocar
  para ajustar a porção"`; `announceForAccessibility` com nome, refeição e kcal.

### 2.5 Entrada do diário ("Hoje")

```
Arroz, tipo 1, cozido                                    128
1 colher de servir · 45 g            P   2    C  21    G   0
```

- Altura 64 (`minHeight`, com `alignItems: 'center'`: duas linhas dão 52 dp a
  1,3× e nunca são cortadas); nome em `body` `ink` (sem facetar — aqui a leitura
  é rápida, não comparativa), reticências; linha 2 `label` `inkMuted` com a
  porção à esquerda **e os macros em colunas ancoradas na margem direita**.
  Iniciais, gramas inteiras e nenhuma unidade repetida — o "g" da porção já a
  diz. **Não há terceira linha**: os macros não podem custar altura.
- As **duas linhas ocupam os 328 dp** da entrada, não a caixa do nome: a linha 1
  é `[nome 270][12][kcal 46]` e a linha 2 é `[porção][12][bloco 152]`. É o vão
  elástico da porção — e não uma célula maior — que põe P, C e G no mesmo x em
  todas as linhas de uma refeição (estudo 07).
- kcal à direita em `body` `tabular-nums` `ink`, sem unidade (a unidade está
  dita uma vez, na linha sob o hero), em **coluna fixa de 46 dp** com
  `textAlign: 'right'`, a 12 dp do nome — é o que faz todas as entradas da lista
  terminarem na mesma borda (§1.2). O nome fica com 270 dp.
- Bloco de macros: três células iguais de **40 dp** — rótulo em caixa fixa de
  **10 dp** (o `G` mede 9,7) + **4 dp** + valor `tabular-nums` alinhado à direita
  em **26 dp** (três dígitos medem 25,3) —, **16 dp** entre células, **152 dp**
  de bloco, com a borda direita no mesmo x da coluna de kcal. As caixas crescem
  com o corpo do texto até 1,3× (197,6 dp), senão três dígitos não caberiam.
  **Nenhum `·` dentro do bloco**: o ponto só separa medida caseira de gramas.
- O vão **entre** células é maior que o vão **dentro** delas: alinhar à direita
  um número de um dígito o afasta até 22 dp do seu próprio rótulo, e com 8 dp de
  respiro externo `P 3 C 28` se lia como "3 C". Com 16 dp o número volta a
  pertencer à letra à sua esquerda.
- Macro que a fonte nunca declarou imprime **célula vazia**, sem rótulo e sem
  número, mantendo os 40 dp — a coluna das linhas vizinhas não pode andar. Um
  registro rápido não tem bloco nenhum.
- Ordem de truncamento na linha 2: só o rótulo da medida caseira ("1 colher de
  servir") tem `flexShrink: 1` e reticências; `· 45 g` e o bloco de macros têm
  `flexShrink: 0` e **nunca** encolhem. Quem some primeiro é o rótulo, não o
  número — e por isso a porção não pode ser um `Text` único, que cortaria pela
  cauda, onde está o grama. A porção fica com 164 dp a 1,0× (a colher mede 146,7
  e cabe) e 118,4 dp a 1,3× (a colher trunca).
- Macro por item nunca é colorida (o trio tem razão de luminância 1,30 e
  proteína × gordura dá ΔE00 3,0 sob deuteranopia) nem vai para a linha 1, ao
  lado das kcal (mediu-se queda de 87% para 44% dos nomes inteiros): rótulo e
  número ficam no mesmo `label` `inkMuted` da porção, sem peso e sem acento.
- Tocar abre a folha em modo edição, onde **"Remover"** é uma ação visível em
  `danger` sob o botão primário (spec 09). Deslizar para a esquerda continua
  revelando **"Remover"** em `inverseSurface` com texto `onInverseSurface` — ali
  não é vermelho: é atalho, e o desfazer torna a ação segura.
- Sem separador; entradas se separam por espaço. A seção se delimita pelo
  cabeçalho e por um filete `line` acima dele.
- Acessibilidade: o rótulo da linha é nome, porção, kcal **e os três macros**,
  nesta ordem e por extenso ("proteína 2,5 gramas…"), com o decimal que o pixel
  arredonda. O texto abreviado não vira nó acessível: a linha continua sendo um
  só nó, e o leitor de tela ouve a forma longa.

### 2.6 Cabeçalho de refeição

```
Café da manhã                                   412   ( + )
```

- Altura 48; filete `line` de 1 dp acima; padding esquerdo **16**, direito **8**
  (o anel tem os seus 48), igual à linha de resultado (§2.4).
- Nome em `heading` `ink` à esquerda com `flex: 1` (tocar abre a tela da
  refeição, tarefa 03).
- Subtotal em `bodyMedium` Inter `tabular-nums` `ink`, **sem "kcal"** (a unidade
  fica implícita depois do hero) — **mesma família e mesmo corpo das kcal de uma
  entrada (§2.5), um peso acima, porque é soma**: a 90 dp de distância, dois
  números de desenho idêntico não têm hierarquia. Vive numa **coluna fixa de
  46 dp** (`KCAL_COLUMN_WIDTH`, a mesma da kcal da entrada) com
  `textAlign: 'right'`, a 12 dp do nome. É a coluna, e não a margem, que põe os
  quatro subtotais na mesma x; sem ela o número flutua atrás de um nome de
  largura variável.
- Ação: o **anel "+"** de §2.4 (`AddRing`) — alvo 48 × 48, anel 36 dp, borda
  1,5 dp em `inkSubtle`, ícone `plus` 24 em `ink`, `accessibilityLabel`
  "Adicionar em Café da manhã". **Nunca preenche em `accent` e nunca vira "✓"**:
  aqui a ação é por refeição e abre a busca; o "✓" é da linha de resultado, por
  alimento. Nada de pílula contornada (nasceria igual aos chips de sugestão 8 dp
  abaixo), nada de texto "Adicionar" em `ink` (§2.2 reserva tinta de texto para
  navegação) e nada de botão preenchido (gritaria mais que o hero).
- A borda direita do anel cai a 2 dp da coluna de kcal das entradas: a margem
  direita da tela lê como uma coluna só.
- Refeição vazia: subtotal oculto (nunca "0") e **sem espaçador** — a posição do
  anel não depende dele; abaixo do cabeçalho, uma linha de
  36 dp com "Nada registrado ainda" em `label` `inkMuted`, **texto, não alvo**
  (o convite é o anel; decisão 12) (a tarefa 04 troca por
  chips). 36 e não mais: com o hero, as quatro refeições vazias têm de caber nos
  668 dp úteis do J6.
- Refeição **com itens**: a linha de chips (`ChipRow` `group="actions"`, 32 dp,
  gutter 16) fica no fim da seção, a **8 dp** da última entrada, com no máximo
  **dois** chips. Os 8 dp não são decoração: o chip tem `hitSlop` vertical de 8 e
  a entrada é tocável nos 64 dp inteiros. Bloco: filete 1 · cabeçalho 48 ·
  entradas 64 · 8 · chips 32 · 8 até o filete seguinte.
- Subtotal muda com `COUNT_UP` (300 ms).

### 2.7 Bloco hero (número-resposta)

- `hero` 52 Fraunces `tabular-nums` `ink`, alinhado ao gutter (à esquerda — nunca
  centralizado); abaixo, `body` `inkMuted`: `restantes · 760 de 2.000 kcal`.
- Dia vazio: `2.000` + `disponíveis hoje`. Acima da meta: `120` + `acima da meta ·
  2.120 de 2.000 kcal`, **mesma tinta**.
- 10 dp abaixo, a barra de progresso (§2.8); 14 dp abaixo dela, as três barras de
  macro (§2.9). O bloco inteiro mede 169 dp.
- Motion: `COUNT_UP` 300 ms ao mudar; `FADE` 180 ms ao trocar de dia.
- Acessibilidade: o bloco é um elemento com `accessibilityRole="progressbar"` e
  `accessibilityValue.text` = `"760 de 2.000 quilocalorias, 1.240 restantes"`.

### 2.8 Barra de progresso fina

- Altura 4, raio 2, trilho `track`, preenchimento `accent`, largura total do
  gutter.
- Acima da meta: o trecho até a meta fica em `accent` (proporção
  meta / consumido), um vão de 2 dp em `background`, e o excedente em `overGoal`
  até o fim — a barra sempre termina cheia. O vão existe porque `overGoal` e
  `accent` diferem só 1,4:1 e um encontro sem vão não se lê.
- Motion: `PROGRESS` 400 ms a partir do valor anterior; sem animar com reduced
  motion.

### 2.9 Barra de macro

- Três colunas iguais com 12 dp entre elas; em cada uma: rótulo (`label`
  `inkMuted`: Proteína / Carboidratos / Gorduras), valor abaixo (`labelMedium`
  `ink` `tabular-nums`: `42 / 120 g`), 4 dp, barra de **3 dp** (raio 1,5, trilho
  `track`, preenchimento `protein` / `carbs` / `fat`).
- Acima da meta: barra cheia, valor em `ink`, nada mais. A cor nunca muda.
- Fibra não aparece **nestas três colunas**: o hero conta kcal e os três macros,
  e é ele que domina a tela. Fibra, minerais e sódio têm componente próprio, no
  fim do dia e opt-in (§2.18).

### 2.10 Bandeja inferior (busca)

- Altura 56 + inset inferior; fundo `surface`; borda superior 1 dp `line`; **a
  única sombra do app**: iOS `shadowOffset (0, −2)`, raio 8, opacidade 0,08 em
  `ink`; Android `elevation 8` (o filete garante a borda onde a sombra não
  aparece).
- Esquerda: `1 item · 58 kcal` em `bodyMedium` `tabular-nums` `ink` (tarefa 03:
  tocar expande). Direita: botão primário **"Concluir"**, 48 de altura.
- Fica **acima do teclado**; a lista rola por baixo com padding.
- Motion: entra com `SHEET_IN` (translateY, 300 ms), sai com `SHEET_OUT`.

### 2.11 Snackbar

- Fundo `inverseSurface`, raio `sm`, altura mínima 48, margem lateral 16,
  padding 12 à esquerda e 4 à direita, 8 entre texto e ação; posição 8 dp acima
  da bandeja (ou 16 dp acima do inset quando não há bandeja). Em 360 dp sobram
  218 dp para o texto — "Arroz adicionado em Almoço" cabe inteiro; nomes mais
  longos encolhem.
- Texto `body` em `onInverseSurface`, uma linha, em **dois `Text`**: o nome do
  alimento com `flexShrink: 1` e `numberOfLines={1}`, e o resto da frase
  (" adicionado em Almoço") com `flexShrink: 0` — só o nome trunca, nunca a
  refeição nem o verbo. Ação `bodyMedium` em `inverseAccent` ("Desfazer"), alvo
  48, padding 8, nunca trunca. Um snackbar por vez; o novo substitui o anterior.
- Motion: `SNACKBAR_IN` 150 ms, `SNACKBAR_OUT` 100 ms, `SNACKBAR_VISIBLE_MS` 4 s.
- `accessibilityLiveRegion="polite"`; o conteúdo também é anunciado.

### 2.12 Folha (sheet)

- Fundo `surface`, raio `xl` no topo, alça 36 × 4 (raio 2, `inkSubtle`) a 8 dp
  do topo, padding lateral 16, padding inferior 16 + inset. Scrim `scrim`. Altura
  pelo conteúdo, no máximo 85 % da tela; arrastar para baixo, tocar no scrim ou
  back fecham sem salvar.
- Conteúdo da folha de porção, de cima para baixo: nome do alimento (`heading`,
  faceteado como na linha), linha com badge de fonte + `para Almoço` (`label`
  `inkMuted`); 24 dp; **stepper** (§2.16) com a quantidade em `display` e a
  unidade em `heading` `inkMuted`; 8 dp; `87 kcal · P 1,7 g · C 19 g · G 0,1 g`
  (`label` `inkMuted` `tabular-nums`); 24 dp; chips de medida; 24 dp; botão
  primário `Adicionar · 87 kcal` / `Salvar · 87 kcal`.
- Com teclado numérico aberto, a folha sobe; o botão continua visível.
- Motion: `SHEET_IN` / `SHEET_OUT`; com reduced motion, crossfade de 120 ms.

### 2.13 Badge de fonte

- `caption` 11 em **`inkMuted`** sobre `surfaceMuted`, raio `xs` 6, padding 2 × 6
  (altura 18). Texto: `TACO`, `IBGE`, `TBCA`, `OFF`, `USDA`, `Seu`.
- Nunca colorido, nunca `inkSubtle` (2,8:1 sobre `surfaceMuted` — foi por isso
  que o brief mudou aqui), nunca clicável.

### 2.14 Campo de busca

- Altura 48, fundo `surfaceMuted`, raio `md`, **sem borda**; ícone `search` 20 em
  `inkMuted` a 14 dp da borda; texto `body` `ink`; placeholder `Buscar alimento`
  em `inkMuted`; cursor e seleção em `accent`; botão limpar (`x` 20 `ink`, alvo
  48) só quando há texto.
- Cabeçalho do modal: linha de 56 com o nome da refeição e o dia (`Almoço · ter
  8`, `heading` `ink`) e o botão fechar (`x` 24, alvo 48) à direita; o campo vem
  abaixo com 4 dp acima e 12 abaixo, e nasce focado com o teclado aberto.
- Rótulos de seção da lista (`Sugestões`, `Seus`, `Base`): `labelMedium`
  `inkMuted`, 20 dp acima e 8 abaixo, sem caixa alta.

### 2.15 Faixa de dias

- Sete chips de **40 × 56**, espaço 8, no gutter (7 × 40 + 6 × 8 = 328 = 360 −
  32). Cada chip: dia da semana (`caption` `inkMuted`: `seg`, `ter`…) sobre o
  número (`body` `tabular-nums` `ink`), raio `md`.
- Selecionado: fundo `ink`, os dois textos em `background`. Hoje: ponto de 4 dp em
  `accent` a 6 dp da base do chip; se hoje também é o selecionado, o ponto usa
  `inverseAccent` (o acento claro sobre tinta dá 1,7:1).
- Deslizar a faixa muda de semana (paginado); tocar seleciona. Quando o dia
  selecionado não é hoje, aparece o botão compacto **"Hoje"** no cabeçalho, à
  esquerda de "Metas".
- `accessibilityLabel` completo: "terça-feira, 8 de setembro, selecionado".

### 2.16 Stepper

- `[ − ]  1,5 colher de servir  [ + ]`: dois alvos de 48 com anel de 36 (1,5 dp
  `inkSubtle`) e ícones `minus` / `plus` 24 `ink`; entre eles a quantidade em
  `display` `tabular-nums` `ink` e a unidade em `heading` `inkMuted` na mesma
  linha de base. Tocar no número abre teclado numérico decimal.
- Passo 0,5 em medida caseira, 10 em gramas; segurar acelera; mínimo 0,25 / 1 g.
- `SELECT` 120 ms; haptic `clockTick` / `selection` a cada passo; rótulos
  "Diminuir quantidade" / "Aumentar quantidade"; o número tem `accessibilityValue`.

### 2.17 Cabeçalho de tela

- Altura 56; título `title` 22 `ink` no gutter; ações à direita como botões de
  48 (texto compacto ou ícone 24 `ink`); telas empurradas usam `chevron-left`;
  o modal de busca usa `x`. Barra de status e de navegação nas cores do tema —
  os ícones das duas seguem a aparência escolhida, inclusive na troca ao vivo.
- O título pode ser o próprio gatilho de uma folha (`onTitlePress`), com um
  glifo de 20 dp ao lado (`titleIcon`, `ink`, 8 dp de gap, `flexShrink: 0`) e o
  título em `flex: 1` numa linha. Nesse caso a linha vira `accessibilityRole`
  `button` com rótulo e dica (`titleAccessibilityHint`), e o `role="header"` do
  texto sai — não há dois papéis na mesma coisa. Sem gatilho, nada muda: o
  cabeçalho continua com um título e um bloco de ações à direita, nunca um
  segundo botão para a mesma navegação.

### 2.18 Grade de minerais do dia

O total do dia de fibra, cinco minerais e sódio, no fim de "Hoje". Opt-in
(Metas → Exibição, "Minerais do dia"), **desligado** por padrão; com a chave
desligada, ou num dia sem nada registrado, o bloco não está na árvore.

- **Ordem e vãos** — última refeição → chips dela → **8 dp** → filete de
  `StyleSheet.hairlineWidth` em `line`, recuado 16 dp de cada lado → **16 dp** →
  linha de cobertura → **12 dp** → grade → **16 dp** → "Limites" → **8 dp** →
  sódio → **12 dp** → rodapé.
- **Linha de cobertura** — `label` 13 `inkMuted`: "8 dos 11 alimentos de hoje
  têm estes dados." Conta **itens**, nunca porcentagem, e o denominador inclui
  os produtos do Open Food Facts e os registros rápidos, que não têm o dado.
- **Grade** — 2 colunas × 3 linhas de barra de macro (§2.9), célula de
  (328 − 12) / 2 = **158 dp**, altura **43 dp** (rótulo 18 + valor 18 + 4 +
  barra 3), **12 dp** de vão na coluna e na linha. Ordem de leitura: Fibra ·
  Cálcio / Ferro · Magnésio / Potássio · Zinco.
- **Cor** — `ink` no preenchimento de **todas** as barras, `track` no trilho.
  Nem `accent` (seis barras índigo matam o acento único da tela) nem
  `protein`/`carbs`/`fat` (são o vocabulário do hero). As três barras do hero
  continuam dominantes.
- **Valor** — `labelMedium` `ink` `tabular-nums`, no formato `8,4 de 14 mg`
  (fibra em g): uma casa decimal abaixo de 10, inteiro de 10 para cima, unidade
  uma vez só no fim. **Nenhum percentual, nenhum %VD, em lugar nenhum.**
- **Sem dado** — célula sem nenhum contribuinte imprime "sem dado" no lugar do
  valor, com o trilho vazio, e **desce para o fim** da grade mantendo a ordem
  relativa. Nunca um zero que ninguém mediu.
- **Limites** — rótulo `labelMedium` `inkMuted` e, sob ele, **Sódio** numa linha
  de largura cheia, também em `ink`: a palavra faz o trabalho semântico que a
  cor não pode fazer. Acima da referência a barra fica cheia e nada mais muda —
  sem cor de alerta, sem palavra de alarme (§0, o aplicativo não culpa).
- **Rodapé** — `caption` `inkMuted`: "As referências são valores diários gerais
  para adultos. O Bocado não avalia sua saúde." As referências são a IDR da RDC
  269/2005: cálcio 1.000 mg, ferro 14 mg, magnésio 260 mg, potássio 3.510 mg,
  zinco 7 mg, sódio 2.000 mg, fibra 25 g.
- **Leitura** — o bloco não é pressionável e não empurra tela. Cada célula é um
  nó acessível só: "Ferro, 8,4 de 14 miligramas" ou "Ferro, sem dado" — a
  unidade por extenso, porque "mg" é soletrado pelo leitor de tela.
- **Sem card, sem fundo, sem sombra, sem ícone**: filete, espaço e rótulo
  delimitam a seção, como em todo o resto.

---

## 3. Ícones

`lucide-react-native`, traço **1,75**, `strokeLinecap="round"`,
`strokeLinejoin="round"`. Tamanho **20** dentro de linha, chip ou campo; **24**
em ação isolada. Cor `ink` em ação, `inkMuted` dentro de campo/linha; `onAccent`
só dentro de um controle preenchido em `accent` (o "✓"). Nunca ícone preenchido,
nunca duas cores, nunca emoji. A lista é fechada (`src/theme/icons.ts`); somar um
ícone é mudança de design system.

| Ícone | Onde |
| --- | --- |
| `search` | campo de busca |
| `plus` | "+" da linha de resultado, stepper |
| `check` | "✓" da linha adicionada |
| `x` | fechar modal, limpar campo |
| `chevron-left` | voltar em tela empurrada (Metas, refeição); mês anterior na folha de mês |
| `chevron-right` | "ver mais", entrar na refeição; próximo mês na folha de mês |
| `calendar` | ao lado do título de "Hoje": abre a folha de mês |
| `settings-2` | "Metas" no cabeçalho de "Hoje" |
| `heart` | favorito (tarefa 04) |
| `trash-2` | remover na bandeja expandida (tarefa 03) |
| `minus` | stepper |
| `undo-2` | desfazer quando houver espaço para ícone (bandeja expandida) |
| `info` | "como calculamos" nas metas |

---

## 4. Motion

`src/theme/motion.ts` é a única fonte. Uma duração escrita à mão num componente é
defeito. Só `transform` e `opacity`; nunca `height`, `width`, layout, blur, sombra
ou Lottie.

| Componente | Momento | Preset |
| --- | --- | --- |
| Botão, linha, chip, dia | pressed | `PRESS` 100 ms · `PRESSED_OPACITY` 0,85 · `PRESSED_SCALE` 0,98 |
| Chip, stepper | selecionar / passo | `SELECT` 120 ms |
| "+" da linha | vira "✓" | `CONFIRM` 200 ms · escala de `CONFIRM_SCALE_FROM` 0,8 |
| Folha, bandeja | entra / sai | `SHEET_IN` 300 ms · `SHEET_OUT` 200 ms |
| Hero, subtotal, bandeja | número muda | `COUNT_UP` 300 ms, `tabular-nums` |
| Barra diária, barras de macro | preenche | `PROGRESS` 400 ms, do valor anterior |
| Snackbar | entra / sai / fica | `SNACKBAR_IN` 150 · `SNACKBAR_OUT` 100 · 4 000 ms |
| Lista de resultados | aparece | `LIST_STAGGER_MS` 20 · `LIST_STAGGER_MAX_ROWS` 6 · `LIST_RISE_DP` 8 |
| "Hoje" | troca de dia | `FADE` 180 ms |
| Campo, folha | erro de entrada | `SHAKE` 200 ms · `SHAKE_DP` 4, dois ciclos |
| Loader do símbolo (só na importação do seed) | loop | o bocado volta ao lugar e sai de novo, 600 ms ease-in-out (`docs/BRAND.md` §4.5) |
| Abertura | uma vez | `LAUNCH_BITE` 220 ms (o bocado sai, 10 dp no eixo −45°) · `LAUNCH_OUT` 180 ms (o fundo entrega "Hoje"). Nunca segura a tela; nunca engole um toque (`docs/BRAND.md` §9) |

`ReduceMotion.System` está em todos os presets, com três exceções declaradas —
`SHEET_FADE`, `FADE_REDUCED` e `LAUNCH_OUT`, os crossfades que precisam
sobreviver à redução porque não têm percurso e cortar seco é pior. Com redução
ativa: crossfades de 120 ms, sem stagger, sem count-up (o número troca direto),
barras sem animar, loader parado, e a abertura mostra a marca já mordida.

---

## 5. Estados por tela

Regra geral: **nunca vermelho para passar da meta**; nunca spinner de tela cheia;
nunca ilustração de estado vazio; o vazio é um convite com a ação ao lado.

| Tela | Vazio | Carregando | Erro |
| --- | --- | --- | --- |
| **Hoje** | hero mostra a meta cheia (`2.000` / `disponíveis hoje`); cada refeição sem registros mostra a linha de chips de sugestão (§2.3) quando há sugestão, e "Nada registrado ainda" (`label` `inkMuted`, texto e nunca alvo) só quando não há chip — como na tela da refeição vazia; nos dois casos o convite é o anel "+" do cabeçalho | primeiro frame mantém o layout com os valores anteriores ou `—`; nunca spinner | não há rede aqui; falha de banco mostra snackbar "Não foi possível abrir o diário · Tentar de novo" |
| **Buscar — antes de digitar** | "Sugestões" com os básicos da refeição; nunca tela em branco | seed importando: "Preparando a base de alimentos…" com o loader do símbolo; a busca liga sozinha quando termina | — |
| **Buscar — resultados** | `Nada para "xyz".` + `Tente outra grafia ou um termo mais curto.` (`body` `ink` + `label` `inkMuted`, alinhados à esquerda, 24 dp abaixo do campo) | resultados locais: sem estado (< 100 ms); online (tarefa 05): 3 linhas skeleton com a forma da linha (`surfaceMuted`, sem brilho) | online falhou: linha de sistema "Sem conexão · os resultados locais continuam" em `label` `inkMuted`; nada em `danger` |
| **Folha de porção** | — | — | quantidade fora do limite: `SHAKE` no número e volta ao limite; sem texto de erro |
| **Metas** | valores padrão preenchidos (2.000 / 120 / 250 / 65) | — | campo vazio ao salvar: `SHAKE` + volta ao valor anterior |

Acima da meta em "Hoje": `120` + `acima da meta · 2.120 de 2.000 kcal` em `ink`;
barra com o excedente em `overGoal`. Nada muda de cor, nada aparece.

---

## 6. Acessibilidade

- AA em todo texto nos dois temas (tabela §1.1); `inkSubtle` nunca em texto.
- Alvos ≥ 48 dp; `hitSlop` onde o visual é menor.
- Rótulos completos nos chips de dia, nos "Adicionar" ("Adicionar em Almoço"),
  no "+" ("Adicionar Arroz, tipo 1, cozido"), no campo ("Buscar alimento").
- Progresso com `accessibilityRole="progressbar"` e valor em texto; macros
  legíveis como texto (por isso barras, não anéis).
- `announceForAccessibility` ao adicionar, remover e desfazer.
- `maxFontSizeMultiplier` conforme §1.2; nada quebra até 1,3×.
- Reduced motion conforme §4; nada depende de animação para ser entendido.
- Cor nunca é o único canal: macro tem rótulo e posição fixa; "✓" muda forma,
  não só cor.

---

## 7. Anti-padrões (o "generic-AI look")

| Não | Por quê | Em vez disso |
| --- | --- | --- |
| Card dentro de card, card por item | vira a queixa nº 1 do redesign do MFP ("gigantic cards"); esconde os totais | linhas em espaço aberto, filete por seção |
| Sombra em lista, sombra em card | ruído, e custa frame no J6 | sombra só na bandeja |
| Gradiente, brilho, glassmorphism | cara de template, briga com a tinta | chapado |
| Emoji ou ilustração como ícone | inconsistente entre sistemas, infantiliza | Lucide 1,75 |
| Tudo centralizado | anula a leitura em coluna; hero centrado vira widget | tudo no gutter esquerdo; só o stepper é centrado |
| Roxo-azul saturado `#4x5xFB`, gradiente roxo→azul | território saturado de SaaS e de clones de IA | índigo profundo `#2F3A8C`, um papel por tela |
| Anéis concêntricos de macro | ilegíveis em 720p, inacessíveis | três barras de 3 dp |
| Vermelho/verde de julgamento | "red number would scare me" | tinta neutra + `overGoal` |
| Streak, confete, medalha, "parabéns" | dependência e culpa | descrição do que aconteceu |
| Serif em texto corrido | Fraunces em parágrafo lê como landing page | Fraunces só em número |
| Borda em tudo, raio em tudo | "outline template" | raio só nos 5 lugares de §1.4 |
| Ícone de garfo/maçã/folha/chama | clichê da categoria | o símbolo, e só onde §BRAND 4.5 permite |

---

## 8. Tema escuro

- Sistema, Claro ou Escuro, escolhido em Metas; o padrão é Sistema
  (`useColorScheme`). Os dois temas são de primeira classe.
- Fundo `#15161A` (grafite quente, nunca preto puro), tinta `#ECEAE4` (papel,
  nunca branco puro).
- Superfícies por elevação, +4 pontos de luminosidade HSL por nível
  (9 % → 13 % → 17 %); sem sombra — sombra em fundo escuro não se vê, o filete
  `line` faz o trabalho.
- Acento clareia para `#93A0F2` (7,4:1) e `onAccent` vira o fundo escuro; as três
  macros clareiam para 7,6–8,8:1.
- Scrim 55 %; ícone do app e splash têm versão escura (`docs/BRAND.md` §8–§9).
- Barra de status `light-content`; barra de navegação em `background`.
- A escolha chega ao Android por um módulo nativo (`BocadoNavigationBar`), que
  a espelha em `SharedPreferences`; `MainApplication.onCreate` a entrega ao
  `AppCompatDelegate` antes de carregar o React, então `values-night/` e a
  janela da Activity resolvem pela escolha a partir do `attachBaseContext`. A
  janela inicial da abertura fria (`Theme.App.SplashScreen`) é desenhada pelo
  sistema antes de o processo existir e pode continuar seguindo o aparelho —
  confirmar na captura antes de afirmar o contrário.
- Na troca ao vivo o mesmo módulo escreve as duas barras: os ícones
  (`isAppearanceLightNavigationBars`) e o fundo (`setBarColors` com
  `background`), porque `uiMode` está em `configChanges` e a Activity não é
  recriada. Sem o módulo, o app continua correto e as barras e o splash seguem
  o aparelho.

---

## 9. Checklist de fidelidade

O `ux_auditor` reprova a tarefa se qualquer item falhar:

1. Nenhum valor de cor, tamanho, raio ou duração fora de `src/theme`.
2. Um número Fraunces por tela; o resto Inter; `tabular-nums` em todo número que muda.
3. Índigo em no máximo um papel de ação e um de estado por tela.
4. Nenhum vermelho ou verde ligado a meta.
5. Alvos ≥ 48 dp; linhas de 64 / 56 / 48 conforme §2.
6. Sem card, sem sombra fora da bandeja, sem gradiente, sem emoji, sem centralização de bloco de texto.
7. Estados vazio / carregando / erro conforme §5, sem spinner de tela cheia.
8. Rótulos de acessibilidade conforme §6; contraste AA nos dois temas.
9. Motion só de `motion.ts`; reduced motion respeitado.
10. Copy no tom de `docs/BRAND.md` §2: sem exclamação, sem "parabéns".
11. Tema escuro sem sombra e sem preto/branco puros.
12. Tela bate com `docs/design/telas.html` em estrutura, ordem e medidas.
