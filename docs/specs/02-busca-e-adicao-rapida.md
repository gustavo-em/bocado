# 02 · Buscar alimento e adicionar em um toque

Leia junto: `docs/FOOD_DATA_CONTRACT.md`, `docs/research/03-ux-adicionar-alimento.md`
(seções 1, 2 e 5), `docs/research/01-concorrentes.md` (seção 3), `docs/DESIGN_SYSTEM.md`.

Esta é a tarefa que define o produto. O critério de sucesso é contável: um
alimento comum entra na refeição em **três toques a partir de "Hoje"**
("Adicionar" → "+" na linha → "Concluir"), com a porção certa, sem tela de
porção obrigatória e com desfazer.

## Trabalho do usuário

Acabei de comer; quero registrar o que foi antes de esquecer, sem pensar em
gramas, e sem me perder entre dez variantes de arroz.

## Decisões fechadas

### Entrada

- "Adicionar" em qualquer refeição de "Hoje" abre a tela **Buscar alimento**
  como modal de tela cheia (native-stack `presentation: 'modal'` ou
  `fullScreenModal`; não use bottom sheet aqui — no J6 com teclado aberto sobra
  pouca tela). Parâmetros: dia e refeição.
- O campo de busca vem **focado com o teclado aberto**, placeholder
  **"Buscar alimento"**, ícone de limpar quando há texto, botão "Cancelar"/"X"
  que fecha a tela. O nome da refeição aparece no cabeçalho ("Almoço · ter 8").

### Antes de digitar (a tela mais importante)

- Seção **"Sugestões"** com até seis linhas. Nesta tarefa o ranking por
  histórico ainda não existe: use a lista `starters[meal]` do seed (os básicos
  brasileiros daquela refeição). A tarefa 04 troca a origem da lista para o
  histórico do usuário mantendo o layout.
- Abaixo, a linha de utilidades com um único item nesta fase: **"Registrar só as
  calorias"** (chega na tarefa 05; aqui pode ficar desabilitado ou omitido —
  escolha omitir).

### Busca

- Search-as-you-type sobre a base local (SQLite FTS5), debounce de **150 ms**,
  sem botão de enviar. A consulta obsoleta é descartada; só renderiza resultado
  cuja consulta é igual ao texto atual.
- Normalização: coluna `name_norm` (minúsculas, sem acentos) + FTS5 com
  `tokenize='unicode61 remove_diacritics 2'` e busca por **prefixo de palavra**
  (`arr*`). "pao" encontra "Pão, trigo, francês"; "frango pei" encontra "Frango,
  peito, sem pele, cozido". Aliases entram no índice.
- Ranking dentro da base: relevância textual (exato > prefixo do nome > prefixo
  de palavra > alias > contém todos os termos) + `boost` do seed + genérico
  antes de específico + nome curto antes de descrição longa. Veja
  `docs/FOOD_DATA_CONTRACT.md`. Teste unitário: "arroz" devolve "Arroz, tipo 1,
  cozido" em primeiro; "pao" devolve "Pão, trigo, francês" em primeiro; "cafe com
  leite" devolve "Café com leite" em primeiro.
- Resultados agrupados sem abas: **"Seus"** (histórico e favoritos — vazio nesta
  tarefa, seção some) e **"Base"** (até 20 itens, com "ver mais" além disso).
- Mínimo de 1 caractere. Até 2 caracteres, só a base por prefixo.

### Anatomia da linha de resultado (64 dp, alvo 48 dp)

```
Arroz, tipo 1, cozido                                [ + ]
1 colher de servir (45 g) · 58 kcal    128 kcal/100 g   TACO
```

- Linha 1: primeira faceta do nome em peso 500; o restante ("tipo 1, cozido")
  na mesma linha em cor secundária — é o que desambigua as variantes sem abrir
  nada. Trecho digitado em negrito.
- Linha 2: porção padrão com gramas e kcal dessa porção, depois kcal/100 g, e
  no fim o badge da fonte (`TACO`, `IBGE`; neutro, nunca colorido).
- Botão **"+"** de 48×48 dp à direita: **adiciona imediatamente** com a porção
  padrão (primeira medida caseira do alimento; 100 g quando não houver).
  Após adicionar, o botão vira "✓" com fundo de destaque, haptic leve, e a
  linha 2 passa a mostrar a porção registrada. Tocar de novo no "✓" **não
  duplica**: abre a porção (tarefa 03; nesta tarefa, apenas não duplica).
- Tocar no nome nesta tarefa faz o mesmo que "+" (a folha de porção chega na
  tarefa 03 e passa a ser o destino do toque no nome).

### Gravação, bandeja e conclusão

- A entrada é gravada no toque do "+", com snapshot de kcal/proteína/carbo/
  gordura calculado para os gramas da porção (`per100g × gramas / 100`), na
  última posição da refeição, com `food_usage` atualizado (contagem, última
  porção, hora, refeição).
- **Bandeja** fixa na parte inferior da tela de busca: "1 item · 58 kcal" à
  esquerda e o botão **"Concluir"** à direita. Nasce ao primeiro item
  adicionado; some quando não há item nesta sessão. Nesta tarefa a bandeja não
  expande (tarefa 03 permite editar/remover a partir dela).
- **"Concluir"** só fecha a tela; nada é perdido se o usuário sair pelo "X" ou
  pelo back do Android — os itens já estão no diário. Um único haptic de
  sucesso no "Concluir".
- Ao voltar a "Hoje": a refeição mostra os itens novos, o subtotal e o
  número-resposta se atualizam com count-up.
- **Desfazer**: snackbar de 4 s "Arroz adicionado ao Almoço · Desfazer", uma
  por vez, acima da bandeja. "Desfazer" remove a entrada e reverte o "✓".

### Estados

- Sem resultado: "Nada para 'xyz'." + uma linha de ajuda "Tente outra grafia ou
  um termo mais curto". (As ações de produto online e registro rápido chegam
  nas tarefas 05.)
- Seed ainda importando (primeiro lançamento): a busca mostra "Preparando a
  base de alimentos…" com progresso indeterminado discreto e funciona assim
  que a importação termina (< 3 s no J6).
- Teclado: `keyboardShouldPersistTaps="handled"`; a lista rola por baixo da
  bandeja sem ficar coberta pelo teclado (use `KeyboardAvoidingView` ou
  `react-native-keyboard-controller` se já existir no projeto — não adicione
  dependência nova sem necessidade comprovada).
- Back do Android fecha o teclado primeiro se aberto? **Não**: fecha a tela
  direto (o diário já está salvo). Comportamento simples e previsível.

### Acessibilidade

- Cada linha é um elemento acessível único: "Arroz, tipo 1, cozido, 1 colher de
  servir, 58 quilocalorias, fonte TACO, botão adicionar". Após adicionar,
  `announceForAccessibility("Arroz adicionado ao Almoço, 58 quilocalorias")`.
- Campo de busca com `accessibilityLabel="Buscar alimento"`.
- O botão "+" de cada linha tem `accessibilityLabel="Adicionar <nome do alimento>"`
  (ex.: "Adicionar Arroz, tipo 1, cozido"); depois de adicionado, "Adicionado
  <nome>, tocar para ajustar a porção". O tester navega por esses rótulos.

### Performance (J6)

- Lista com FlashList, item memoizado, sem imagem, sem sombra por linha.
- Consulta local devolve em < 50 ms; renderização do resultado < 100 ms após o
  debounce. Medir com `performance.now()` em dev e registrar no summary.

### Motion (mínimo aqui; vocabulário completo na tarefa 07)

- "+" → "✓": 200 ms, escala 0,8 → 1.
- Bandeja entra com translateY de 300 ms (SHEET_SPRING ou equivalente).
- Snackbar: entra 150 ms, sai 100 ms.

## Fora de escopo

Folha de porção, edição/remoção pela "Hoje", sugestões por histórico, favoritos,
copiar refeição, provedores online, código de barras, criar alimento, registro
rápido de kcal.

## Evidência esperada no device

1. Abrir "Hoje" → tocar "Adicionar" do Almoço → screenshot com teclado aberto,
   campo focado com placeholder "Buscar alimento", seção "Sugestões" com seis
   alimentos e botões "+".
2. Digitar "arroz" → screenshot dos resultados: "Arroz, tipo 1, cozido" em
   primeiro, linha 2 com porção e kcal, badge TACO.
3. Tocar "+" do primeiro resultado → "✓" e bandeja "1 item · N kcal · Concluir".
4. Digitar "pao" → "Pão, trigo, francês" em primeiro (prova de busca sem
   acento).
5. Tocar "Concluir" → "Hoje" com o item no Almoço, subtotal e número-resposta
   atualizados.
6. Repetir o fluxo e tocar "Desfazer" no snackbar → item removido.
