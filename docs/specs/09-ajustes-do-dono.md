# 09 · Ajustes do dono: faixa de dias, macros por item, remover, ml e gramas primeiro

Cinco pedidos do dono, feitos em 2026-09-09 depois de usar o aplicativo no
aparelho. Um é regressão; os outros quatro mudam decisões anteriores, e onde
mudam está dito por quê.

Leia junto: `docs/specs/01-diario-hoje.md`, `docs/specs/03-porcao-e-edicao.md`,
`docs/DESIGN_SYSTEM.md`, `docs/FOOD_DATA_CONTRACT.md`.

## 1. A faixa de dias voltou a sumir (regressão)

Sintoma na captura de referência da tarefa 06 (`cycle-0/hoje.png`, aparelho
limpo): entre o cabeçalho "Hoje" e o número do dia existe um vão da altura da
faixa, e nenhum chip de dia dentro dele. A faixa funcionou na verificação da
tarefa 03 e no ciclo 4 da tarefa 04; voltou a falhar depois.

Análise: `TodayScreen` monta 104 semanas (`WEEKS_BACK`) e o `DayStrip` pede
`initialScrollIndex = weeks.length − 1`, ou seja, a lista precisa posicionar-se
no índice 103 de páginas horizontais cuja largura ela ainda não mediu. Num
aparelho lento isso rende uma lista vazia com a altura reservada — exatamente o
vão da captura.

Correção pedida: eliminar a classe do problema em vez de ajustar o sintoma. A
semana atual deve ser o **primeiro** item que a lista renderiza, sem depender de
`initialScrollIndex`, e a página deve declarar a própria largura. Se a ordem da
lista precisar inverter para isso, inverta, mantendo o gesto como está hoje —
arrastar para a direita continua indo para o passado.

Verificação: abrir "Hoje" com o aplicativo recém-instalado e ver os sete chips
da semana corrente com o dia de hoje selecionado, **sem tocar na tela antes**.

## 2. Cada item registrado mostra proteína, carboidrato e gordura

Hoje a linha de uma entrada mostra nome, porção e kcal. O dono quer ver os
macros do item, não só do dia.

- ~~A entrada ganha uma terceira linha, em `label` e `inkMuted`, com
  `tabular-nums`: `P 1,9 g · C 21 g · G 0,2 g`.~~ **Revertido** pela pesquisa 05
  §1: a terceira linha saiu do pixel, a entrada caiu para 64 dp e as kcal
  ganharam coluna fixa de 46 dp. O que a linha dizia continua a um toque, na
  folha de porção, e desenhado na tela da refeição.
- Vale nas duas listas onde a entrada aparece: em "Hoje" e na tela da refeição.
- O kcal continua à direita, sozinho, como está.
- O rótulo de acessibilidade da linha passa a incluir os três macros depois das
  calorias, na mesma ordem. **Continua válido**: o macro por item some do pixel,
  não do áudio.
- Macro com valor desconhecido na fonte não vira zero: some daquele trecho.

## 3. Remover um item sem depender do gesto

Existe remoção por deslizar a entrada para a esquerda, e o dono não a
encontrou. Gesto escondido não conta como caminho.

- A folha de porção em modo edição ganha uma ação **"Remover"** visível, abaixo
  do botão primário, em `danger` (é ação destrutiva, o único uso permitido da
  cor). Alvo ≥ 48 dp.
- Tocar em "Remover" fecha a folha, apaga a entrada e mostra o snackbar
  "<alimento> removido · Desfazer" por 4 s, reaproveitando o caminho de
  remoção e restauração que já existe.
- O gesto de deslizar continua funcionando como atalho; nada muda nele.

## 4. Mililitros para líquidos

- `NormalizedFood.isLiquid` deixa de ser decorativo. Ele passa a ser preenchido
  na importação e nos mapeadores: no seed, pela categoria da fonte (bebidas,
  leites e sucos); no Open Food Facts, quando `serving_quantity_unit` é `ml`.
- Para um alimento líquido, a unidade base da folha de porção é **ml** no lugar
  de g, e a referência é "100 ml".
- Conversão: **1 ml = 1 g**. É aproximação, e o motivo de ela ser aceitável
  está nas próprias fontes — TACO e IBGE publicam bebidas por 100 g, e as
  medidas caseiras de leite do IBGE já vêm em gramas. Registre isso em
  comentário no código, para ninguém "corrigir" com densidade inventada.
- Nada de oferecer g e ml ao mesmo tempo para o mesmo alimento: um alimento é
  líquido ou não é.

## 5. Gramas primeiro, medidas caseiras depois

Decisão do dono que **substitui** a ordem anterior. Antes as medidas caseiras
vinham primeiro e o "g" ficava fixo na ponta direita. O dono observou que quase
ninguém registra leite como "copo médio", e prefere pesar.

- Na fila de unidades, **g** (ou **ml**, item 4) é o **primeiro** chip, à
  esquerda, e continua fixo fora da rolagem. As medidas caseiras vêm depois,
  roláveis à direita dele.
- Ao abrir a folha sem histórico, a unidade selecionada é g (ou ml), com
  quantidade inicial de 100.
- **A memória do usuário continua vencendo**: se aquele alimento já foi
  registrado antes, a folha abre na última unidade e quantidade usadas, mesmo
  que seja uma medida caseira. O que muda é só o padrão de quem nunca registrou
  aquele alimento.
- Pelo mesmo motivo, o "+" de um toque na busca passa a registrar 100 g (ou
  100 ml) quando não há porção lembrada, no lugar da primeira medida caseira.
  A segunda linha da linha de resultado já mostra o que será registrado, então
  o número continua honesto antes do toque.

## Fora de escopo

Densidade real por alimento, conversão entre unidades imperiais, edição em lote,
qualquer mudança de cor, tipografia ou motion.

## Evidência esperada no device

1. Abrir "Hoje" recém-instalado: os sete chips da semana aparecem sem interação.
2. Registrar um alimento e ouvir, com o leitor de tela, os três macros depois
   das calorias — a linha de macros não é mais desenhada (pesquisa 05 §1).
3. Tocar na entrada, usar "Remover" na folha, e ver a entrada sumir com o
   snackbar de desfazer; tocar "Desfazer" e vê-la voltar.
4. Buscar "leite" e abrir a folha: a unidade é ml, a referência é 100 ml.
5. Buscar "arroz" e abrir a folha de um alimento nunca registrado: o primeiro
   chip é "g" e a quantidade abre em 100.
6. Reabrir a folha de um alimento já registrado: volta a última porção usada.
