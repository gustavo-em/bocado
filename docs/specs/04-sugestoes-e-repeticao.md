# 04 · Sugestões, recentes, favoritos e "repetir ontem"

Leia junto: `docs/research/03-ux-adicionar-alimento.md` (seções 2.2 e 3),
`docs/research/01-concorrentes.md` (seção 3: reclamações sobre histórico),
`docs/specs/02-busca-e-adicao-rapida.md`.

## Trabalho do usuário

Como 80% do que eu como se repete, quero que o app já saiba o que vou
registrar às 12h30 de uma terça e me deixe confirmar com um toque — inclusive
"o mesmo almoço de ontem".

## Decisões fechadas

### Uma superfície só: "Sugestões" antes de digitar

- A seção **"Sugestões"** da tela de busca passa a ser ranqueada pelo histórico
  do usuário (função abaixo), até seis linhas, com o mesmo layout de linha da
  tarefa 02 e o mesmo "+" que registra na hora com a **última porção usada
  daquele alimento** (ou a padrão).
- Enquanto a refeição tiver menos de cinco registros no histórico, a lista
  mistura: primeiro os alimentos do histórico que atingirem o limiar, depois os
  `starters[meal]` do seed até completar seis.
- Abaixo de "Sugestões": chips horizontais **"Recentes"** (até oito, os últimos
  alimentos registrados em qualquer refeição, com kcal da última porção) e
  **"Favoritos"** (até oito). Chip = um toque registra com a última porção;
  toque longo abre a folha de porção. Seções vazias não aparecem.
- Enquanto digita, a seção **"Seus"** (histórico + favoritos que casam com a
  consulta, até três) aparece acima de "Base".

### Score de frecência com contexto (`src/domain/diary/suggestions.ts`)

```
score(alimento, refeição_alvo, agora) =
  Σ sobre registros r do alimento nos últimos 90 dias:
      w_recência(r)   1,0 (≤ 4 h) · 0,8 (≤ 1 dia) · 0,6 (≤ 3 dias) · 0,4 (≤ 7 dias) · 0,2 (≤ 30 dias) · 0,1 (≤ 90 dias)
    × w_refeição(r)   1,0 se r foi na mesma refeição; 0,35 caso contrário
    × w_hora(r)       1,0 se |hora(r) − hora(agora)| ≤ 1 h; 0,7 se ≤ 3 h; 0,4 senão
    × w_semana(r)     1,15 se mesmo dia da semana
  × (1 + 0,25 × favorito)
  − 100 se o alimento já está na refeição de hoje (não sugerir o que já foi registrado)
```

- Empate: prefira o item com porção conhecida.
- Recalcular ao abrir a tela de busca (consulta SQL sobre `diary_entries` dos
  últimos 90 dias; cache em memória por refeição/dia). Deve rodar em < 30 ms
  com 2.000 entradas no J6 — teste unitário com fixture grande.
- Testes unitários: (a) alimento registrado ontem no almoço vence alimento
  registrado há 20 dias no jantar; (b) alimento já na refeição de hoje não é
  sugerido; (c) favorito desempata.

### "Repetir [refeição] de ontem"

- Quando a refeição de hoje está vazia **e** a mesma refeição de ontem tem ≥ 2
  itens, a primeira linha de "Sugestões" é um item composto:
  **"Repetir almoço de ontem · 4 itens · 612 kcal"** com "+". Um toque copia
  todas as entradas (mesmas porções) para hoje, com snackbar "Almoço de ontem
  copiado · Desfazer" que desfaz o conjunto inteiro.
- Se ontem não houver mas o mesmo dia da semana passada tiver ≥ 2 itens, a
  linha vira "Repetir almoço de terça passada".
- No diário, uma refeição vazia mostra até três chips de sugestão (os dois
  primeiros alimentos do score + "Repetir ontem" quando aplicável) no lugar do
  texto "Nada registrado ainda", **no dia que está na tela**, seja ele hoje ou
  não. Chip registra com um toque, sempre no dia selecionado.
- Quando o dia selecionado não é hoje, o chip de repetição não diz "ontem" nem
  "semana passada" (seriam lidos contra a data de hoje): traz a data curta da
  refeição copiada — "Repetir jantar de ter 8".

### Favoritos

- Ícone de coração na folha de porção (cabeçalho) e no cabeçalho da tela da
  refeição para a entrada aberta. Favorito é `food_usage.favorite = 1`.
- Sem limite; chips mostram oito e "ver todos" abre uma lista simples.

### Limpar histórico

- Em "Metas" (tela de configurações desta fase), uma ação **"Limpar sugestões"**
  zera `food_usage` (não apaga o diário), com snackbar de desfazer.

### Acessibilidade

- Linha composta: "Repetir almoço de ontem, quatro itens, 612 quilocalorias,
  botão adicionar". Chips com o nome e a última porção no label.

## Fora de escopo

"Refeições salvas" (templates nomeados), sugestão automática de salvar
combinação, provedores online, notificações.

## Evidência esperada no device

O device chega a esta tarefa com entradas das tarefas 02 e 03 (estado
"manter"). O tester deve:

1. Abrir "Adicionar" do Almoço → screenshot: "Sugestões" com alimentos já
   registrados antes (ex.: Arroz, tipo 1, cozido) nas primeiras posições;
   chips "Recentes".
2. Tocar "+" numa sugestão → "✓" com a última porção usada (linha 2 mostra a
   mesma porção da vez anterior).
3. Mudar o dia em "Hoje" para amanhã não é possível (só passado/hoje), então
   para "Repetir ontem": registrar dois itens no Jantar, voltar a "Hoje", mudar
   para o dia seguinte não existe — o tester valida a linha "Repetir jantar de
   ontem" abrindo o Jantar do dia atual **após** o driver registrar itens no
   dia anterior pela faixa de dias (selecionar ontem → Adicionar → dois itens →
   voltar a hoje → Adicionar no Jantar).
4. Favoritar um alimento na folha de porção → chip em "Favoritos".
5. Digitar "arr" → seção "Seus" acima de "Base".
