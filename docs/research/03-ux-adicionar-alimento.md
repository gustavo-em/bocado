# 03 · UX do fluxo "adicionar alimento" e do dashboard diário

Pesquisa de interação (best-in-class) para um contador de calorias premium, simples e rápido — React Native, Android primeiro (dispositivo de teste: Samsung Galaxy J6, Exynos 7870, 2 GB RAM, tela 720p), depois iOS. Data: 2026-09-08.

Convenções: "toque" = tap discreto; digitar não conta como toque. Citações diretas em itálico; síntese própria marcada como **[proposta]**. URLs completas na seção 9.

---

## 1. Dez princípios (com evidência)

1. **Velocidade de registro é a métrica-mãe.** Um ex-PM do MyFitnessPal: *"If MyFitnessPal didn't get you to log food on the first day, the chances you'd log a food on the second day were very low"* (Tradecraft, S9). A enciclopédia da Nutrola resume: *"If logging takes >30 seconds, adherence collapses within 60–90 days"* (S23). O MacroFactor criou um índice de ações discretas (FLSI) e mede tudo por ele: 24 ações no total vs 38+ no MyFitnessPal, 42+ no Cronometer, 32 no Lose It (S3). Consequência: cada toque a menos no caminho "dashboard → alimento registrado" é a feature.

2. **Reconhecer, não lembrar: mostre o que a pessoa provavelmente vai registrar antes de ela digitar.** Heurística de Nielsen (S31); a Apple HIG pede *"display a person's recent searches before they start typing"* (S17). Foodnoms relata que as Smart Suggestions (por hora do dia + recência) são *"the second-most common way for users to log food"* e acertam *"9/10 times"* (S6). MacroFactor mostra Favoritos, "Hourly Go-Tos" (mais logados perto daquela hora, ponderados por recência e frequência) e "Latest" antes de qualquer digitação (S2).

3. **Busca local, instantânea, tolerante a erro e a acento.** Nielsen: 0,1 s = sensação de manipulação direta; 1 s = fluxo de pensamento mantido (S30). Foodnoms reescreveu o backend para buscar *"hundreds of thousands of items in a few milliseconds, versus hundreds of ms before"* (S6). MacroFactor vende "mais tolerante a erros de digitação, 2–4× mais rápido" (S4). Baymard: só *19%* dos sites acertam tudo em autocomplete; no mobile, 4–8 sugestões, área de toque grande e pouca competição visual (S14). SQLite FTS5 resolve "pao → pão" com `unicode61 remove_diacritics 2` e substring/typo com o tokenizer `trigram` (S33).

4. **Uma sugestão deve ser um resultado, não uma pergunta.** NN/g: garanta que *"every suggested query actually has good, relevant results"* e que sugestões enriquecidas sejam rotuladas (usuários as ignoraram: 7 usos em 60 exposições) (S12, S13). Para alimento, a "sugestão" é o próprio item com porção padrão e kcal — não um texto para re-buscar.

5. **Um toque adiciona; a tela de porção é opcional, não obrigatória.** MacroFactor: *"tap the small + button on the right side of the food tile to multi-add the food. This will add the food to your plate without any intermediate screens"*, e o app *"remembers your most recently used serving"* (S2, S1). Foodnoms: favorito com um único preset *"will be logged immediately"* ao tocar (S6). O redesign de busca do Cronometer (2019) mostra o risco inverso: ao priorizar multi-seleção, *"adding single items now required extra steps to adjust quantities"* (S24).

6. **Desfazer em vez de confirmar.** NN/g: diálogos de confirmação habituam (*"if you cry wolf too many times, people will stop paying attention"*); ofereça undo para *"reduce anxiety and allow users to recover"* (S32). Snackbar Material: uma ação opcional (Undo), uma por vez, ancorada acima da barra inferior (S36).

7. **Repetição é o caso de uso principal, não um atalho escondido.** Nutrola: *"20% of foods account for 80% of logging volume"*, pessoas repetem 6–8 refeições (S23). Foodnoms coloca em cada refeição um botão *"quickly copy over what you last ate for that respective meal type"* (S6). O MyFitnessPal removeu a cópia de item individual em 2026 e a nota caiu de 3,24 para 1,54 estrelas (S26, S27).

8. **Dashboard em três níveis: número-resposta → refeições → detalhe.** Oura reconstruiu o app em três níveis (anéis/barras abstratos → métricas focadas → exploração) e mediu D5 stickiness 80% e CTR do Today 42% (S39, S40). WHOOP responde uma pergunta com um número grande (~72 pt) e empurra o resto para telas abaixo (S41). Não é acordeão dentro de uma tela; são camadas com um toque entre elas.

9. **Números sem vergonha.** Estudo qualitativo com 24 mulheres (BJPsych Open): o número vermelho ao estourar o orçamento *"would scare me a lot"*; os autores recomendam reduzir a ênfase em contagem, menos lembretes diários e estudar o efeito das cores antes de usá-las (S43). Gentler Streak (Apple Design Award) prova que tom "supportive but not cheesy" e estados como "doente / de folga" retêm (S44, S45). Framing de orçamento restante é "psicologicamente bem calibrado" e o mais amigável para iniciantes (S28, S29) — mas sem vermelho.

10. **Restrição é o que parece premium.** Copilot Money: canvas navy `#000814` em vez de preto puro, texto a 90% de branco, uma cor por significado, *"constraint over addition"* (S42). Gentler Streak: paleta suave, números grandes e legíveis, transições fluidas (S46). Movimento curto (150–350 ms), easing assimétrico (entra devagar, sai rápido) e haptics escassos, *"less is more"* (Android Haptics Principles, S35). No J6, restrição também é performance.

---

## 2. Especificação do fluxo "adicionar alimento" **[proposta]**

Meta: alimento comum registrado em **≤ 3 toques a partir do dashboard**, sem tela de porção obrigatória, com undo.

### 2.1 Caminho feliz (3 toques)

| # | Toque | O que acontece |
|---|---|---|
| 1 | "+" no cabeçalho do card da refeição (ou FAB, que assume a refeição pela hora atual) | Abre a **folha de busca** (modal bottom sheet, ~92% da altura, scrim, alça de arraste). Campo de busca já focado, teclado aberto, placeholder "Buscar em Almoço…". Acima do teclado: seção **Sugestões** (6 itens, ver §3). |
| 2 | "+" na linha do alimento sugerido/encontrado | Item **gravado imediatamente** na refeição com a última porção usada (ou porção padrão). Linha vira "✓ · 1 colher de servir · 77 kcal"; haptic leve; barra inferior atualiza "1 item · 77 kcal". |
| 3 | "Concluir" (ou arrastar a folha para baixo) | Volta ao dashboard; o card da refeição já mostra o item e o subtotal; o número principal se atualiza com count-up de 300 ms. |

Se o item não estiver nas sugestões: toque 1 → digita "arr" (sem contar toques) → toque 2 no "+" de "Arroz branco cozido" → toque 3 "Concluir". Continua em 3.

Decisão-chave: **gravar no toque 2, não no "Concluir"**. Justificativa: FLSI (S3) — cada confirmação é uma ação; NN/g — undo > confirmação (S32). O "Concluir" só fecha a folha; nada se perde se o usuário sair (mesma regra do ScreensDesign: *"do not discard work when the user changes methods"*, S22).

### 2.2 Estado "antes de digitar" (a tela mais importante)

Ordem vertical, do teclado para cima (o que está mais perto do polegar aparece primeiro):

1. **Sugestões para [refeição]** — 6 linhas, ranking da §3. Se a refeição de ontem existir e a de hoje estiver vazia, a primeira linha é um item composto **"Repetir almoço de ontem · 4 itens · 612 kcal"** com "+" (um toque copia tudo, com undo).
2. **Recentes** — chips horizontais (8), com kcal da última porção.
3. **Favoritos** e **Refeições salvas** — chips; favorito com um preset registra ao toque (padrão Foodnoms, S6); com vários presets abre popover de presets.
4. Linha de utilidades: **Código de barras · Rótulo (foto) · Criar alimento · Registro rápido de kcal**. Trocar de método nunca descarta o que já foi adicionado (S22).

Estado vazio (primeiro uso): sem ilustração grande; texto de uma linha + caminhos diretos (NN/g: comunicar status, dar dicas, oferecer caminho, S37): "Ainda não há histórico. Comece por aqui:" + 6 alimentos básicos brasileiros da refeição (arroz, feijão, frango grelhado, ovo, pão francês, café com leite).

### 2.3 Busca (comportamento)

- **Search-as-you-type** local (SQLite FTS5 no dispositivo), sem botão de submit. Debounce **150 ms** (fontes convergem em 200 ms, com degradação acima de 300 ms — S15; 300 ms na Atomic Object, S16). Como a busca é local e não tem custo de rede, 150 ms mantém a sensação de "instantâneo" (S30). Cancelar consultas obsoletas; renderizar só quando a consulta corresponder ao texto atual.
- **Normalização**: coluna `nome_norm` (minúsculas, sem acentos, sem pontuação) + FTS5 `tokenize = "unicode61 remove_diacritics 2"` para prefixo (`arr*`) e uma tabela `trigram` para typo/substring ("frnago" → frango) quando o prefixo devolver < 3 resultados (S33). Ranking: `bm25` com peso maior no nome que na descrição, depois reordenado pelo histórico do usuário (§3).
- **Mínimo de 1 caractere** para prefixo (trigram exige 3). Até 2 caracteres: mostrar só "Seus" + prefixo na base.
- **Agrupamento dos resultados** (padrão MacroFactor "From History / Custom / Common / Branded", S2; Cronometer com filtros, S24): 
  1. **Seus** — histórico + alimentos criados + favoritos (máx. 3, expansível "+N")  
  2. **Base** — alimentos genéricos TBCA/TACO (máx. 8)  
  3. **Produtos** — rótulos/OFF (máx. 5, "ver mais")  
  Sem abas (abas escondem; grupos rolam). Sem filtro persistente entre sessões (erro relatado no Cronometer, S24).
- **Desambiguação de variantes** ("arroz branco cozido" × "arroz integral cozido" × "arroz e feijão"): o nome mostra a variante em texto normal e o **qualificador em peso menor** ("Arroz, **branco**, cozido"); a linha 2 mostra kcal da porção padrão **e** kcal/100 g, para comparar sem abrir; badge de fonte no fim. Ordenação dentro do grupo: exatidão do prefixo no nome > popularidade global (contagem agregada anônima ou lista curada de "básicos") > menor número de qualificadores (o genérico antes do específico).
- **Sem resultado**: "Nada para 'xyz'." + 3 ações: *Buscar produtos (rótulos)* · *Criar alimento* · *Registrar só as calorias*. Nunca um estado vazio mudo (S37).
- **Carregando**: busca local não mostra skeleton. Para busca de produtos online (fallback), skeleton só depois de 300 ms e com texto "Procurando produtos…"; se offline, banner discreto "Sem conexão — mostrando sua base local" e a busca local continua funcionando 100%.
- **Offline-first**: base TBCA/TACO embarcada; produtos escaneados ficam em cache local após o primeiro uso.

### 2.4 Anatomia da linha de resultado (altura 64 dp, alvo de toque 48 dp)

```
┌──────────────────────────────────────────────────────────────┐
│ Arroz, branco, cozido                                   [ + ] │  ← nome (16 sp, 500); "+" 48×48 dp
│ 1 colher de servir (60 g) · 77 kcal   128 kcal/100 g   TACO   │  ← 13 sp, cor secundária; badge 11 sp
└──────────────────────────────────────────────────────────────┘
```

- Toque no **nome** → folha de porção (§2.5). Toque no **"+"** → adiciona com a porção mostrada. Toque longo no "+" → popover com 3 presets (registra ao soltar).
- Trecho digitado destacado em **negrito** no nome (NN/g: destacar a parte que corresponde à consulta quando ela aparece no meio do texto, S12).
- Badges de fonte: `TACO`, `TBCA`, `Rótulo`, `Meu`, `Receita`. Cor neutra; nunca vermelho/verde.
- Quando há macro-foco (config): substituir "128 kcal/100 g" por "P 2,5 g".
- Após adicionar: "+" vira "✓" com fundo de destaque; o texto da linha 2 mostra a porção efetivamente registrada. Tocar de novo abre a porção (não duplica).

### 2.5 Folha de porção (só quando o usuário quer ajustar)

Bottom sheet de altura média (metade da tela), sem scrim total para manter a lista visível atrás:

1. **Cabeçalho**: nome + badge de fonte + "para Almoço".
2. **Número grande** (36–44 sp, `tabular-nums`) com unidade ao lado: `1,5  colher de servir` — atualiza kcal e P/C/G ao vivo logo abaixo (400 ms de count-up, ver §5).
3. **Chips de medidas caseiras** (Material filter chips, seleção única, S38): vindos do banco por alimento. Ex.: `colher de sopa (25 g)` · `colher de servir (60 g)` · `escumadeira` · `concha (150 mL)` · `unidade` · `fatia` · `100 g`. Chips ordenados por uso do usuário; o último usado vem selecionado. Base: TACO/TBCA trazem valores por medida caseira (S47, S48); referências brasileiras: colher de sopa cheia de arroz cozido ≈ 20–25 g, colher de servir ≈ 60 g (≈ 77 kcal), concha média 150 mL (S48, S49, S50). **Calibrar cada alimento com a tabela POF/IBGE de medidas referidas antes de publicar.**
4. **Stepper ±** (Apple HIG: bom para pequenas variações; emparelhar com campo de texto quando saltos grandes são prováveis, S18): passo 0,5 para medidas, 10 para gramas; tocar no número abre teclado numérico (`inputMode="decimal"`) para digitar "135".
5. **Alternância de unidade** (segmented, 2–3 opções): `porção · g · mL` — `mL` só para líquidos.
6. Botão primário **"Adicionar · 116 kcal"** (o kcal vive no botão). Sem "Cancelar" explícito; arrastar para baixo fecha.
7. Salvar a porção escolhida como **última porção deste alimento** (por usuário; por refeição se o histórico mostrar padrões diferentes, ex.: pão no café × pão no lanche).

Sem slider para gramas: imprecisão e alvo pequeno. Sem "confiança da porção" (Foodnoms tem "exato/aproximado/estimado", S5) na v1 — é elegante, mas adiciona decisão.

### 2.6 Multi-adição, bandeja e confirmação

- A **bandeja** é a barra inferior da folha de busca: "3 itens · 540 kcal · Concluir". Toque na barra expande a lista da sessão (editar porção / remover) — o "Plate" do MacroFactor e a "bottom drawer" do Cronometer (S1, S24), mas com itens já gravados.
- Cada item adicionado permanece marcado nas listas (✓) durante a sessão; a busca volta a mostrar as Sugestões quando o campo é limpo (padrão MacroFactor: *"auto-resets for next query"*, S1).
- **Concluir** não é confirmação: é fechar. Um único haptic de sucesso aqui, não em cada item.
- **Undo**: snackbar de 4 s "Arroz adicionado ao Almoço · Desfazer", uma por vez, ancorada acima da bandeja/barra (S36). Depois de fechar a folha, o item ainda pode ser deslizado para excluir no card da refeição (com snackbar "Desfazer").
- Cópia de refeição/dia ("Repetir ontem", "Copiar para Jantar") é um item composto na bandeja e desfaz-se como um todo.

### 2.7 Estados e erros

| Estado | Tratamento |
|---|---|
| Vazio (sem histórico) | Básicos brasileiros da refeição + caminho para escanear/criar (S37) |
| Sem resultado | Mensagem de uma linha + 3 ações; nunca sugerir consultas sem resultado (S12) |
| Offline | Busca local intacta; produtos online desabilitados com aviso discreto; fila de sincronização silenciosa |
| Erro de gravação (raro, SQLite) | Snackbar "Não foi possível salvar · Tentar de novo"; item continua na bandeja |
| Leitor de tela | Cada linha é um único elemento acessível: "Arroz branco cozido, 1 colher de servir, 77 quilocalorias, fonte TACO, botão adicionar"; após adicionar, `announceForAccessibility("Arroz adicionado ao Almoço, 77 quilocalorias")` (S34) |

---

## 3. Repetição: recentes, frequentes, "repetir ontem" e ranking **[proposta]**

Superfície única: a seção **Sugestões** antes de digitar (6 linhas) + chips de Recentes/Favoritos. Não criar abas "Recentes / Frequentes / Meus": elas fragmentam e exigem um toque extra; o MacroFactor e o Foodnoms convergiram em uma lista ranqueada por contexto (S2, S6).

### 3.1 Score (frecência com contexto)

Inspirado em Slack (buckets 4 h = 100, 1 dia = 80, 3 dias = 60, 1 semana = 40, 1 mês = 20, 90 dias = 10; score = contagem × média dos buckets, S20) e Firefox (decaimento exponencial, meia-vida de 30 dias, amostra das últimas N ocorrências, S21):

```
score(alimento, refeição_alvo, agora) =
  Σ_{registros r do alimento nos últimos 90 dias}
      w_recência(r)      # 1,0 / 0,8 / 0,6 / 0,4 / 0,2 / 0,1 pelos buckets acima
    × w_refeição(r)      # 1,0 se r foi na mesma refeição; 0,35 caso contrário
    × w_hora(r)          # 1,0 se |hora(r) − hora(agora)| ≤ 1 h; 0,7 se ≤ 3 h; 0,4 senão
    × w_semana(r)        # 1,15 se mesmo dia da semana (padrões de sábado/domingo)
  × (1 + 0,25·favorito)
  − penalidade se já está na refeição de hoje (não sugerir o que já foi registrado)
```

- Recência × frequência juntas evitam os dois erros clássicos: "Recentes" mostra o que foi um evento único; "Frequentes" congela o passado.
- Empate: preferir o item com porção conhecida (registra em um toque).
- **Cold start** (< 5 registros na refeição): lista curada por refeição e região (café da manhã: pão francês, café com leite, ovo, mamão; almoço: arroz, feijão, frango grelhado, salada; lanche: banana, iogurte; jantar: sopa, sanduíche…), ordem fixa.
- Recalcular sob demanda ao abrir a folha (< 90 dias × poucos alimentos = milissegundos em SQLite; cache em memória por refeição/dia).
- Item composto **"Repetir [refeição] de ontem"** aparece em 1º quando: a refeição de hoje está vazia **e** a de ontem tem ≥ 2 itens. Variante "Repetir [refeição] de [dia da semana passada]" se houver padrão semanal (mesmo w_semana). Foodnoms implementa exatamente "copiar o que você comeu por último nesta refeição" (S6); MyPlate descreve "Copy yesterday" em dois toques (S23).
- **Refeições salvas** (templates): propor salvar automaticamente quando a mesma combinação de ≥ 3 itens se repete 3 vezes (o Yazio faz *"proactively suggests… save frequently logged food combinations as a single meal"*, S25). Nome sugerido: "Almoço de sempre".
- **Favoritos**: coração na folha de porção e no card; favorito com preset = um toque. Sem limite, mas mostrar só 8 chips (o resto via "ver todos").
- Privacidade: tudo local. Sem "search history" exposto fora do app (HIG pede opção de limpar histórico, S17) — configurar "Limpar sugestões".

---

## 4. Dashboard: estrutura recomendada e por quê **[proposta]**

Um só scroll, três níveis (Oura/WHOOP, S39–S41), sem cards pesados (a conversão do diário do MFP em *"gigantic, space-consuming cards"* foi a queixa nº 1 do redesign de 2026, S26).

```
┌────────────────────────────────────────────┐
│  ‹ seg 7 · [ter 8] · qua 9 · qui 10 ›   📅 │  ← faixa de dias (semana), hoje fixo; toque no ícone abre calendário
│                                            │
│   1.240                                    │  ← número-resposta (48–56 sp, serif display, tabular)
│   restantes · 760 de 2.000 kcal            │  ← 14 sp, cor secundária
│   ─────────────────────────── 38%          │  ← barra fina de progresso (não anel)
│   Proteína 42/120 g · Carbo 90/230 g · Gord 20/65 g   (3 barras finas)
│                                            │
│  Café da manhã                     412 kcal│  ← cabeçalho de refeição com subtotal e "+"
│   Pão francês · 1 un · 150                 │
│   Café com leite · 1 xíc · 95              │
│   Ovo mexido · 2 un · 167                  │
│  Almoço                            348 kcal│
│   Arroz, feijão, frango…  (3 itens) ver ›  │
│  Lanche                           [ + ]    │  ← vazio: chips "Repetir ontem" · "Banana" · "Iogurte"
│  Jantar                           [ + ]    │
└────────────────────────────────────────────┘
```

Decisões e evidências:

- **Restantes como número principal** (framing de orçamento): mais amigável para iniciantes e "psicologicamente bem calibrado" (S28, S29); a nutricionista que avaliou o Yazio destacou justamente *"the visibility of the remaining daily calories as meals progress"* (S51). Consumidas aparecem em segundo plano ("760 de 2.000"). Configuração: "Mostrar como: restantes / consumidas" — pessoas em recuperação ou que não querem "orçamento" trocam em um toque (recomendação do estudo BJPsych de reduzir ênfase, S43).
- **Acima da meta sem vermelho**: "120 acima da meta" em tinta neutra, e a barra passa da meta em tom levemente diferente. Sem sirene, sem cor de erro (S43). Verde também não — a cor semântica fica reservada para dados de macro.
- **Barras, não anéis, para macros**: três anéis concêntricos são difíceis de ler e de descrever para leitor de tela; barras finas com "42/120 g" já são acessíveis por texto. Um único indicador de progresso principal (barra) com `accessibilityRole="progressbar"` e `accessibilityValue={{min:0,max:2000,now:760,text:"760 de 2000 quilocalorias, 1240 restantes"}}` (S34).
- **Cards de refeição com subtotal no cabeçalho** e "+" sempre visível: os per-meal totals escondidos foram outra queixa do MFP 2026 (S26). Itens colapsam em 3 + "ver mais" para não estourar a tela de 720p. Deslizar item = excluir (com undo); tocar = editar porção.
- **Refeições vazias** mostram 2–3 chips de sugestão em vez de uma linha morta (Foodnoms permite ocultar refeições vazias; aqui preferimos o espaço como convite, S6; NN/g S37). Refeição atribuída pela hora quando o usuário usa o FAB (faixas configuráveis, padrão Foodnoms, S6).
- **Navegação de data**: faixa horizontal da semana (um toque para dias próximos, que é 95% do uso) + calendário só via ícone; swipe horizontal no conteúdo muda o dia. Evita o "‹ ›" de um dia por vez do Yazio e o calendário modal para tudo.
- **Dia vazio**: número principal mostra a meta ("2.000 disponíveis") e cada refeição oferece "Repetir ontem" — sem ilustração de estado vazio ocupando a tela.
- **Nível 2** (toque no cabeçalho da refeição): tela da refeição com macros da refeição e lista completa. **Nível 3**: item (porção, fonte, nutrientes). Sem acordeões dentro do dashboard (WHOOP, S41).
- Fora do dashboard: streaks e "hábitos" (água, passos) **não** entram na tela inicial na v1 — o estudo BJPsych associa lembretes e streaks à dependência (S43) e o MFP foi criticado por enterrar o diário debaixo de "Healthy Habits" (S26).

---

## 5. Motion & feedback: vocabulário **[proposta, baseado em Material Motion tokens e HIG]**

Tokens de duração/easing do Material 3 (S52): `short2` 100 ms · `short4` 200 ms · `medium2` 300 ms · `medium4` 400 ms; easing `standard` (0.2, 0, 0, 1); `emphasized-decelerate` (0.05, 0.7, 0.1, 1) para entrar; `emphasized-accelerate` (0.3, 0, 0.8, 0.15) para sair. Regra: *"Duration should increase as the area/traversal of an animation increases."*

| Momento | Duração / easing | Haptic (iOS → Android) |
|---|---|---|
| Pressionar linha/chip (estado pressed) | 100 ms, opacidade/escala 0,98 | — |
| Selecionar chip de porção, passo de stepper | 120 ms | `selection` → `CLOCK_TICK`/`SEGMENT_TICK` |
| "+" vira "✓" + kcal na bandeja | 200 ms standard; o "✓" faz scale 0,8→1 | `impact light` → `CONFIRM` (leve) |
| Folha de busca/porção entra | 300 ms emphasized-decelerate (translateY) | — |
| Folha sai | 200 ms emphasized-accelerate | — |
| Count-up de números (bandeja, restantes) | 250–350 ms, ease-out, `tabular-nums` para não tremer (S53) | — |
| Barra de progresso preenche | 400 ms standard, a partir do valor anterior | — |
| "Concluir" (fecha folha + dashboard atualiza) | 200 ms sair + 300 ms count-up | `notification success` → `CONFIRM` — **uma vez por sessão** |
| Snackbar Undo | entra 150 ms, sai 100 ms; fica 4 s | — |
| Lista de resultados aparece | stagger 20 ms por linha, máx. 6 linhas (120 ms total), opacidade+translateY 8 dp | — |
| Erro | 200 ms shake sutil (2 ciclos, 4 dp) | `notification error` → `REJECT` |

Regras:

- Haptics: *"less is more"*; força proporcional à importância; usar constantes do sistema; nunca `Vibrator.vibrate(ms)` legado (fica "buzzy" 20–50 ms além do toque em atuadores fracos — exatamente o caso do J6) (S35). iOS: usar padrões do sistema conforme o significado documentado, manter causa-efeito claro, permitir desligar (S54). Em RN/Expo: `Haptics.selectionAsync`, `impactAsync(Light)`, `notificationAsync(Success)`; no Android, `performAndroidHapticsAsync(Confirm | Clock_Tick | Reject)` (S55). **Desligável em Configurações.**
- Nada de item "voando" para a refeição na v1: custa um layout animation em lista (caro no J6) e ganha pouco; a combinação "✓ no lugar + kcal sobe na bandeja + haptic leve" já fecha o loop de causa-efeito (S54).
- **Reduced motion** (WCAG 2.3.3, S56): ler `AccessibilityInfo.isReduceMotionEnabled()` e ouvir `reduceMotionChanged` (S34); com reduce motion, folhas fazem crossfade de 120 ms, sem stagger, sem count-up (número troca direto), barras trocam sem animar. iOS: respeitar `prefersCrossFadeTransitions`.
- Performance no J6 (Exynos 7870, 2 GB, 720p, S57): animar só `transform`/`opacity` no thread de UI (Reanimated), nunca `height` de linhas; listas com FlashList (reciclagem de views; caso real: FPS 36,9 → 56,9 e fim dos OOM em Android de entrada, S58, S59); sem blur, sem sombras grandes, sem Lottie no dashboard; ícones em SVG simples; imagens de alimentos = nenhuma (texto só). Orçamento: resultado da busca local renderizado em < 100 ms (S30).

---

## 6. Onboarding mínimo: meta diária sem conta **[proposta]**

Evidência: Foodnoms (*"No account required"*, S7), Calory (*"no barriers to use such as asking for account creation"*, S8), Counter44, Food Loops e Free Calorie Track calculam a meta com Mifflin-St Jeor localmente, sem cadastro (S60–S62). Contra-exemplos: Yazio 78 passos, Cal AI 28, Lifesum 24, MyFitnessPal 18, Noom 12+ (S25, S63–S65, S66). ScreensDesign: *"There is no universal screen count"*, mas cada pergunta deve ter efeito visível no plano (S67).

Três telas, sem conta, sem e-mail, sem paywall:

1. **"O que você quer?"** — Perder · Manter · Ganhar (3 botões grandes). Selecionar avança.
2. **"Só o necessário para calcular"** — sexo (2 segmentos), idade, altura, peso (steppers/roletas com valores padrão preenchidos: 30 anos, 170 cm, 70 kg), atividade (4 chips: sedentário 1,2 · leve 1,375 · moderado 1,55 · intenso 1,725). Mifflin-St Jeor: homens `10·kg + 6,25·cm − 5·anos + 5`; mulheres `… − 161`; × fator de atividade; −500 kcal/dia para "perder" (≈ 0,5 kg/semana), +300 para "ganhar"; piso 1.200 (mulheres) / 1.500 (homens) kcal com aviso. Macros padrão: proteína 1,6 g/kg, gordura 25%, resto carboidrato.
3. **"Sua meta: 1.850 kcal"** — número grande, editável no lugar (tocar no número abre teclado), linha "como calculamos" expansível, botão "Começar". Link discreto: "Prefiro definir manualmente".

Regras: botão "Pular" na tela 2 usa 2.000 kcal e marca "meta estimada — ajustar em Configurações"; tudo fica editável depois em Perfil (o Cal AI foi criticado por não permitir revisar as respostas, S68). Conta/backup só quando houver valor concreto (exportar, trocar de aparelho), como recomenda o ScreensDesign (S67). Sem pedido de avaliação nos primeiros dias (Yazio/Lifesum criticados por pedir cedo, S25, S64).

---

## 7. Anti-padrões a evitar (com exemplos)

1. **Quiz-onboarding de dezenas de telas antes de qualquer valor** — Yazio 78 passos, Cal AI 28, Lifesum 24, MFP 18 (S25, S63–S65). Noom: *"why am I filling out this stupid onboarding form again??"* (S66).
2. **Enterrar o diário atrás de "View All" e transformar refeições em cards gigantes** — MFP v26.16 (abr/2026): mais toques, macros por refeição escondidas, cópia de item removida; nota de 3,24 → 1,54 (S26, S27).
3. **Remover repetição** (copiar item/refeição, multi-add) — MFP removeu multi-add e cópia por item; fóruns pedem de volta há anos (S27, S69).
4. **Tela de porção obrigatória para cada item** — o FLSI mostra que isso custa 3–5 ações por alimento (S3); Cronometer 2019 quebrou o caso simples ao otimizar o múltiplo (S24).
5. **Vermelho ao passar da meta, verde ao "sobrar"** — *"red number would scare me a lot"* (S43). Cor semântica só para dados; estado "acima" em tinta neutra.
6. **Anúncios, pop-ups e feeds no caminho do registro** — Foodnoms se define por *"No ads, no popups, no content feeds"* (S7); MacroFactor, *"We will never serve ads"* (S70); os case studies do MFP citam anúncios como o que mais atrasa a tarefa (S10).
7. **IA por foto como caminho único, com zona morta** — Lose It Snap It: mediana de 11,2 s entre foto e sugestão, *"long enough that users frequently abandon the app and enter food manually"* (S71). Se existir foto na v2: progresso visível, cancelável, e busca disponível ao lado (S22).
8. **Base de dados ruidosa sem procedência** — meio abacate de 165 a 560 kcal no Yazio (S51); MFP "14M entries with crowdsourced noise" vs Cronometer 1,3M verificadas (S29). Mostrar badge de fonte; base genérica curada (TACO/TBCA) primeiro.
9. **Filtros de busca que persistem entre sessões** e "Edit a copy" que duplica alimentos — Cronometer (S24, S72).
10. **Dashboard em branco no primeiro dia** — Bevel: *"completely blank slate on the dashboard, which could feel demotivating"* (S73). Mostrar a meta e os convites por refeição.
11. **Streaks, lembretes diários e "hábitos" competindo com o registro** — associação com dependência/obsessão (S43); MFP colocou "Healthy Habits" acima do diário (S26).
12. **Anéis triplos de macro e números proporcionais que tremem** — ilegíveis em 5,6"/720p e inacessíveis; usar barras e `tabular-nums` (S53).
13. **Diálogo "Tem certeza?"** ao adicionar/remover — habituação; usar undo (S32).
14. **Sugestões que não levam a um resultado** (texto genérico, categorias) — NN/g (S12, S13).

---

## 8. Referências visuais premium e tipografia OFL

### 8.1 O que as referências fazem (e o que copiar)

| Referência | O que ensina | Aplicação aqui |
|---|---|---|
| **Copilot Money** (S42, S74) | Navy `#000814` em vez de preto puro; texto a 90% de branco; hierarquia por superfície, não por bordas; uma cor por significado; *"constraint over addition"*; animações só onde confirmam algo (Face ID, dials). | Dark mode em navy/carvão quente; sem bordas de card; cor só nas barras de macro. |
| **Gentler Streak** (S44–S46) | Paleta suave (azuis/verdes), números grandes e legíveis, copy *"supportive but not cheesy"*, estados humanos (doente, folga). | Tom de voz do "acima da meta"; opção "hoje não conto". |
| **Oura** (S39, S40) | Três níveis de leitura, tipografia refinada, cor semântica dinâmica; +7 pts de CTR no Today. | Dashboard → refeição → item. |
| **WHOOP** (S41) | Um número-resposta em ~72 pt, fundo quase preto, cor com significado, camadas com um toque entre elas. | "1.240 restantes" como o único número grande. |
| **Foodnoms / Calory** (S5, S8) | Nativo, denso mas limpo, sem anúncios; anel simples; "plates" (refeições salvas). | Densidade de informação sem cards; refeições salvas. |
| **Lifesum** (S64) | Roletas verticais custom para porção, animações de recompensa ao registrar água. | Roleta/stepper para quantidade; recompensa discreta, não confete. |
| **Ate** (S75) | Diário por foto sem calorias, "sem julgamento". | Lembrete de que o produto pode ter modo "sem números". |

### 8.2 Tipografia (todas OFL no Google Fonts)

Critérios: (a) numerais tabulares (`tnum`) disponíveis para os números que mudam (S53; RN: `fontVariant: ['tabular-nums']`); (b) display com personalidade editorial para o número-resposta; (c) sans neutra e muito legível a 13–16 sp em 720p; (d) peso de arquivo pequeno (subsetting).

| Par | Papel | Por quê |
|---|---|---|
| **1. Fraunces (display, opsz/SOFT) + Inter (UI)** — recomendado | Fraunces só no número-resposta, subtotais de refeição e títulos; Inter em tudo o mais. | Fraunces é variável com eixos ópticos e de "suavidade" (S76): no eixo SOFT alto, o número grande fica caloroso e "editorial" sem parecer jornal; Inter tem `tnum`, `cv` e é a sans mais testada em mobile. Medley classifica Fraunces/Inter como *"retro-modern editorial meets functional digital clarity"* (S77). |
| **2. Instrument Serif + Instrument Sans** | Serif condensada no número e títulos; Instrument Sans na UI. | Superfamília com métricas verticais compartilhadas (*"pre-harmonized"*, S78); a serif condensada economiza largura na tela de 5,6"; leitura *"refined, editorial, premium"* (S79). Instrument Serif tem só um peso (400 + itálico) — usar tamanho, não peso, para hierarquia. Verificar `tnum` no Instrument Sans; se faltar, Inter nos números de lista. |
| **3. Manrope (display) + Inter (UI)** — alternativa 100% sans | Manrope semibold no número-resposta. | Para quem não quer serif: Manrope/Inter é a dupla "fintech e produtividade" (S77). Risco: Manrope, Poppins e Montserrat são os "startup fonts" de 2025 (S80) — parece limpo, não parece próprio. |

Evitar: Roboto (cara de app Android padrão), Poppins/Montserrat (saturadas, S80), Plus Jakarta Sans e DM Sans como display (funcionam, mas são o "template look" de landing pages de SaaS; Space Grotesk e Sora lêem como "AI tool/crypto", S77). Geist é boa sans de UI, mas com Inter já resolvido, não muda a percepção.

Escala (Android, sp): número-resposta 48–56 (Fraunces 400, opsz 144); subtotais 20 (Fraunces) ; nome do alimento 16/500 (Inter); detalhe 13/400; badge 11/500 caps com tracking +0,5. `tabular-nums` em todos os números de lista, bandeja e dashboard.

Cor: light default seguindo o sistema (o J6 é AMOLED, dark economiza bateria; oferecer os dois). Tinta principal `#14161A`, secundária 60%; fundo off-white quente `#F7F5F0`; dark: `#0E1116` fundo, superfícies +4% de luminância, texto 90% branco (S42). Uma cor de marca para o "+"/"✓"/botão primário; três cores de macro dessaturadas; nenhum vermelho no dashboard.

---

## 9. Fontes (URLs)

S1. MacroFactor — "Rolling out the Fastest Food Logging Workflows": https://macrofactor.com/new-food-logger/
S2. MacroFactor Help — "How to Log Food in MacroFactor": https://help.macrofactorapp.com/en/articles/215-how-to-log-food-in-macrofactor
S3. MacroFactor — "Is MacroFactor Still the Fastest Food Logger? (2025 FLSI)": https://macrofactor.com/fastest-food-logger-2025/
S4. MacroFactor Help — "Food Search Database": https://help.macrofactorapp.com/en/articles/46-food-search-database
S5. MacStories — FoodNoms review: https://www.macstories.net/reviews/foodnoms-a-privacy-focused-food-tracker-with-innovative-new-ways-to-log-meals/
S6. Foodnoms — "FoodNoms 2: Feature Overview": https://foodnoms.com/news/foodnoms-2
S7. Foodnoms — "What is Foodnoms?": https://foodnoms.com/help/about-foodnoms
S8. MacStories — Calory review: https://www.macstories.net/reviews/calory-review-simple-convenient-calorie-tracking/
S9. Tradecraft — "MyFitnessPal: A UX Case Study": https://medium.com/tradecraft-traction/myfitnesspal-a-ux-case-study-f377ff66a504
S10. Atharva Dikondawar — "Fixing broken navigation and cluttered interface of MyFitnessPal": https://medium.com/@atharva.designs/fixing-broken-navigation-and-cluttered-interface-of-myfitnesspal-product-design-case-study-e1b1d021b44d
S11. Luke O'Sullivan (UX Collective) — "Designing an improved MyFitnessPal experience": https://uxdesign.cc/ui-ux-case-study-designing-an-improved-myfitnesspal-experience-3492bbe4923c
S12. NN/g — "Site Search Suggestions": https://www.nngroup.com/articles/site-search-suggestions/
S13. NN/g — "Enriched Site-Search Suggestions: Rarely Used": https://www.nngroup.com/articles/enriched-site-search-suggestions/
S14. Baymard — "9 UX Best Practice Design Patterns for Autocomplete Suggestions": https://baymard.com/blog/autocomplete-design
S15. Algolia — "Improve performance" (debounce 200 ms): https://www.algolia.com/doc/guides/building-search-ui/going-further/improve-performance/js
S16. Atomic Object — "Improve Your Search Autocomplete Timing with Debouncing": https://spin.atomicobject.com/automplete-timing-debouncing/
S17. Apple HIG — Searching: https://developer.apple.com/design/human-interface-guidelines/searching
S18. Apple HIG — Steppers: https://developer.apple.com/design/human-interface-guidelines/steppers
S19. Material Components — Search (SearchBar/SearchView): https://github.com/material-components/material-components-android/blob/master/docs/components/Search.md
S20. Slack Engineering — "A faster, smarter Quick Switcher" (frecency): https://slack.engineering/a-faster-smarter-quick-switcher/
S21. Firefox Source Docs — URL bar ranking / frecency: https://firefox-source-docs.mozilla.org/browser/urlbar/ranking.html
S22. ScreensDesign — "16 Calorie Tracker App Design Examples": https://screensdesign.com/articles/calorie-tracker-app-design/
S23. Nutrola — "Every Calorie Tracker App Feature Explained (2026)": https://nutrola.app/en/blog/every-calorie-tracker-app-feature-explained-complete-encyclopedia-2026
S24. Cronometer Community — "New Beta Build: Re-Designed Food Search!": https://forums.cronometer.com/discussion/2411/new-beta-build-re-designed-food-search
S25. ScreensDesign — Yazio showcase (78 passos de onboarding): https://screensdesign.com/showcase/yazio-calorie-counter-diet
S26. PiunikaWeb — "MyFitnessPal users complain new Today tab update makes the app harder to use": https://piunikaweb.com/2026/04/24/myfitnesspal-new-update-complaints/
S27. MWM — "MyFitnessPal v26.16.0 Update Removes Diary Tab…": https://mwm.ai/articles/app-updates/myfitnesspal-v26-16-0-replaces-diary-with-new-ui-sparking-rating-drop-in-april-2026
S28. Calorie Rankings — Lose It! review: https://calorierankings.com/reviews/lose-it/
S29. Calorie Rankings — "How to Choose a Calorie Tracking App": https://calorierankings.com/blog/how-to-choose-a-calorie-tracking-app/
S30. NN/g — "Response Times: The 3 Important Limits": https://www.nngroup.com/articles/response-times-3-important-limits/
S31. NN/g — "Memory Recognition and Recall in User Interfaces": https://www.nngroup.com/articles/recognition-and-recall/
S32. NN/g — "Confirmation Dialogs Can Prevent User Errors — If Not Overused": https://www.nngroup.com/articles/confirmation-dialog/
S33. SQLite — FTS5 Extension (unicode61 remove_diacritics, trigram, bm25): https://www.sqlite.org/fts5.html
S34. React Native — Accessibility e AccessibilityInfo: https://reactnative.dev/docs/accessibility · https://reactnative.dev/docs/accessibilityinfo
S35. Android Developers — "Haptics design principles": https://developer.android.com/develop/ui/views/haptics/haptics-principles
S36. Material Components — Snackbar: https://github.com/material-components/material-components-android/blob/master/docs/components/Snackbar.md
S37. NN/g — "Designing Empty States in Complex Applications": https://www.nngroup.com/articles/empty-state-interface-design/
S38. Material Components — Chips (filter chips, alvo 48 dp): https://github.com/material-components/material-components-android/blob/master/docs/components/Chip.md
S39. Oura — "Introducing the New Oura App Design": https://ouraring.com/blog/new-oura-app-experience/
S40. Instrument — "Designing a more intuitive ŌURA app": https://www.instrument.com/work/oura-app
S41. 925 Studios — "WHOOP Design Breakdown": https://www.925studios.co/blog/whoop-design-breakdown
S42. Blake Crosley — "Copilot Money: Deep Space Finance with Cinematic Data": https://blakecrosley.com/guides/design/copilot-money
S43. Eikey, "Effects of diet and fitness apps on eating disorder behaviours: qualitative study", BJPsych Open (PMC8485346): https://pmc.ncbi.nlm.nih.gov/articles/PMC8485346/
S44. Sketch — "How Gentler Streak brings kindness to fitness": https://www.sketch.com/blog/gentler-streak/
S45. Apple Developer — "Behind the Design: Gentler Streak": https://developer.apple.com/news/?id=3m0ht22s
S46. Pixso — "Gentler Streak's Design: The Hidden UX Gems": https://pixso.net/articles/gentler/
S47. TBCA — Tabela Brasileira de Composição de Alimentos (USP/FoRC): https://www.tbca.net.br/
S48. TACO — Tabela Brasileira de Composição de Alimentos (NEPA/UNICAMP), medidas caseiras: https://www.cfn.org.br/wp-content/uploads/2017/03/taco_4_edicao_ampliada_e_revisada.pdf
S49. Nutritotal — "Você sabe quanto pesam as medidas caseiras de cada ingrediente?": https://nutritotal.com.br/publico-geral/material/voce-sabe-quanto-pesam-as-medidas-caseiras-de-cada-ingrediente/
S50. Ecologia Médica — "Arroz branco cozido: calorias, medidas caseiras": https://www.ecologiamedica.net/2026/02/arroz-branco-cozido-calorias-valor.html
S51. Darwin Nutrition — "I tested YAZIO: a dietitian's review": https://www.darwin-nutrition.fr/en/brand-tests/yazio-review/
S52. Material Components — Motion (tokens de duração e easing M3): https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md · https://m3.material.io/styles/motion/easing-and-duration
S53. MDN — font-variant-numeric (tabular-nums): https://developer.mozilla.org/docs/Web/CSS/font-variant-numeric · RN `fontVariant`: https://reactnative.dev/docs/text-style-props#fontvariant
S54. Apple HIG — Playing haptics: https://developer.apple.com/design/human-interface-guidelines/playing-haptics
S55. Expo — Haptics API: https://docs.expo.dev/versions/latest/sdk/haptics/
S56. W3C — Understanding SC 2.3.3 Animation from Interactions: https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
S57. GSMArena — Samsung Galaxy J6 specs: https://www.gsmarena.com/samsung_galaxy_j6-9203.php
S58. Shopify Engineering — "FlashList v2": https://shopify.engineering/flashlist-v2
S59. React Native Pro — "FlashList Performance in React Native: a case study": https://www.reactnativepro.com/tutorials/flashlist-performance-in-react-native-a-case-study/
S60. Counter44 (Google Play) — sem conta, Mifflin-St Jeor: https://play.google.com/store/apps/details?id=com.ehmtech.calorie
S61. Food Loops — "The Food Tracker That Doesn't Want Your Data": https://foodloops.app/
S62. Free Calorie Track — local, sem conta, Mifflin-St Jeor: https://freecalorietrack.com/
S63. ScreensDesign — Cal AI showcase (28 passos): https://screensdesign.com/showcase/cal-ai-calorie-tracker
S64. ScreensDesign — Lifesum showcase (24 passos): https://screensdesign.com/showcase/lifesum-food-calorie-tracker
S65. ScreensDesign — MyFitnessPal showcase (18 passos): https://screensdesign.com/showcase/myfitnesspal-calorie-counter
S66. Justinmind — "UX case study of Noom app": https://www.justinmind.com/blog/ux-case-study-of-noom-app-gamification-progressive-disclosure-nudges/
S67. ScreensDesign — "13 Fitness App Onboarding Examples": https://screensdesign.com/articles/fitness-app-onboarding-examples/
S68. Nutrola — "Cal AI Review 2026": https://nutrola.app/en/blog/cal-ai-review-2026
S69. MyFitnessPal Community — "Bring back multi add": https://community.myfitnesspal.com/en/discussion/10861611/bring-back-multi-add · Multi-add (doc antiga): http://myfitnesspal.desk.com/customer/portal/articles/852172-what-is-multi-add-and-how-does-it-work
S70. MacroFactor — página do app ("We will never serve ads"): https://macrofactor.com/macrofactor/
S71. AI Food Tracker — "Lose It! Snap It AI Review: 68.7% accuracy, 11.2 s": https://ai-food-tracker.com/reviews/lose-it/
S72. ScreensDesign — Cronometer showcase (8 passos; "Edit a Copy"): https://screensdesign.com/showcase/calorie-counter-cronometer
S73. ScreensDesign — Bevel showcase (34 passos; dashboard em branco): https://screensdesign.com/showcase/bevel-health-performance
S74. ScreensDesign — Copilot Money showcase: https://screensdesign.com/showcase/copilot-track-budget-money
S75. YouAte / Ate — diário por foto sem calorias: https://youate.net/
S76. Google Fonts — Fraunces: https://fonts.google.com/specimen/Fraunces
S77. Matt Medley — "Best Google font pairings for UI design in 2025": https://medley.ltd/blog/best-google-font-pairings-for-ui-design-in-2025/
S78. DEV Community — "10 Font Pairings So Good They Feel Like a Secret": https://dev.to/web_dev-usman/10-font-pairings-so-good-they-feel-like-a-secret-8c3
S79. Google Fonts — Instrument Serif: https://fonts.google.com/specimen/Instrument+Serif · Jukebox Print — Instrument Serif: https://www.jukeboxprint.com/fonts/font-preview/instrument-serif
S80. Erahaus — "Best Fonts for Startups 2025" (Montserrat, Inter, Poppins, Manrope como padrão de startup): https://erahaus.com/web-design/best-fonts-startups/
S81. Growth.design — case studies (não há teardown de MFP/Noom/Lifesum; ver Strava/Headspace/Duolingo): https://growth.design/case-studies
S82. MyFitnessPal Help — "How do I copy a meal from one day to another?": https://support.myfitnesspal.com/hc/en-us/articles/360032622131-How-do-I-copy-a-meal-from-one-day-to-another
S83. Lose It! Support — "How to Use Snap It": https://loseit.zendesk.com/hc/en-us/articles/47771695186580-How-to-Use-Snap-It
S84. WCAG 2.2 — SC 2.5.8 Target Size (Minimum) (24 px mínimo; Apple 44 pt; Material 48 dp): https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

Notas de método: ~45 páginas consultadas via WebFetch/WebSearch em 2026-09-08. Páginas JS-only (m3.material.io, developer.apple.com) foram lidas via espelhos do repositório material-components-android e via proxy de leitura; support.myfitnesspal.com e o Yazio Help bloqueiam fetch (403) — citados pelo título e por relatos de terceiros (S26, S27, S51). Growth.design não tem case study de app de calorias (S81). Valores de medidas caseiras (S48–S50) são referências para calibrar, não dados finais.
