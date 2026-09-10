# Macros de volta à linha da entrada, sem crescer a linha

Descoberta pedida pelo dono em 2026-09-09: ver proteína e carboidrato sem tocar
no item, em "Hoje" e na tela da refeição, **sem a entrada ficar grande**. Isto
reverte a decisão 9 de `docs/DECISIONS.md` e a §1 do estudo 05 — mas só a
conclusão delas, não as medidas: os dois números que mataram as formas
anteriores continuam valendo como restrição.

Todas as larguras abaixo foram remedidas neste repositório, lendo `hmtx`/`cmap`
de `assets/fonts/Inter-Regular.ttf` e os 2.319 nomes de
`assets/data/foods.seed.json`. Sem kerning e sem `tnum` (o texto real usa
`tabular-nums`): erro abaixo de 3%, sempre para mais, então as folgas relatadas
são conservadoras. O método reproduz o estudo 05 §1 quase na casa decimal —
87,0% em 270 dp, mediana 156,2, p75 217,1 —, o que é o teste de que ele mede a
mesma coisa que mediu lá.

---

## 1. O espaço que já existia

A entrada tem duas linhas e a segunda gasta quase nada:

| Linha | Conteúdo hoje | Largura da caixa | Tinta usada |
| --- | --- | --- | --- |
| 1 | nome + coluna de kcal de 46 dp | 270 + 12 + 46 | nome mediano 156,2 dp |
| 2 | porção (`100 g`) | **270 dp** | **33,3 dp** |

São **236,7 dp livres na linha 2** no caso mais comum, atrás de nada. É aí que
os macros cabem: não custam altura (a linha 2 já existe), não custam largura do
nome (a linha 1 não é tocada) e não custam a coluna de kcal.

## 2. A forma escolhida

`100 g · P 3 · C 28 · G 0` — iniciais, gramas inteiras, sem repetir unidade,
mesmo `label` 13 `inkMuted` da porção, com `tabular-nums`.

| Cadeia | 1,0× | 1,3× | Cabe em 270 dp |
| --- | --- | --- | --- |
| `100 g · P 3 · C 28 · G 0` | **137,2** | 178,3 | sim, com 132,8 dp de folga |
| só o rabo ` · P 3 · C 28 · G 0` | 103,8 | 135,0 | sim |
| pior rabo plausível ` · P 100 · C 100 · G 100` | 136,7 | 177,7 | sim |
| `1 colher de servir · 45 g · P 2 · C 12 · G 0` | 244,8 | 318,2 | 1,0× sim; 1,3× não |

O único caso que estoura é medida caseira **a 1,3×**. Resolvido por ordem de
truncamento, não por corte de dado — e a ordem exige **três** Texts, não dois:
a porção inteira num Text só ellipsisaria pela cauda, que é justamente onde o
grama está, e a linha imprimiria colher sem quantidade. Então o rótulo da
medida fica sozinho com `flexShrink: 1`, e `· 45 g` e o bloco de macros ficam
com `flexShrink: 0`.

Contas a 1,3×, em 270 dp: os pedaços fixos somam 50,4 (` · 45 g`) + 135,0
(macros) = 185,4 dp, sobrando **84,6 dp** para "1 colher de servir" (que pediria
136,5). Ele trunca — "1 colher de…" —, os números todos sobrevivem. A 1,0× nada
trunca: 244,8 dp de 270. O rótulo de acessibilidade segue dizendo a porção
inteira e os macros por extenso, com decimal.

**Custo aceito:** as gramas viram inteiras no pixel (0,2 g de gordura imprime
`G 0`), e no caso de medida caseira em fonte grande o rótulo da colher trunca.
A folha de porção e o leitor de tela continuam com `P 2,5 g · C 28,1 g`.

## 3. O que a linha 1 não perdeu — o número do critério 4

A caixa do nome continua com **270 dp** (328 − 46 de kcal − 12 de espaço), pelo
mesmo motivo de antes: nada foi acrescentado à linha 1. Logo a distribuição
medida no estudo 05 §1 fica intacta, e eu a remedi para confirmar:

| Medida | Estudo 05 | Agora | Δ |
| --- | --- | --- | --- |
| nomes inteiros em 270 dp | 87,0% (2.018/2.319) | **87,0%** (2.018/2.319) | 0 |
| mediana · p75 · p95 | 156,2 · 217,0 · 348,5 | 156,2 · 217,1 · 350,8 | ruído do kerning |

`Pão, trigo, francês`, o nome citado no pedido, mede **138,9 dp** em Inter
Regular 16: cabia inteiro antes desta tarefa e cabe inteiro depois. Nenhum nome
mudou de lado.

## 4. Direções descartadas

**(a) Só proteína e carboidrato, gordura no toque.** Foi o pedido literal do
dono e é o que eu descartaria por último — mas ele economiza 33,4 dp (` · G 0`)
numa linha que sobra com 132,8. Pagar um toque pela gordura sem precisar da
largura seria cobrar sem motivo, e criaria a única inconsistência incômoda do
conjunto: o leitor de tela anuncia três macros e a tela mostra dois. Descartada
por não comprar nada.

**(b) Barra ou marca gráfica compacta, número só no áudio.** Duas falhas. A
primeira é de conteúdo: a pergunta do dono é "quanto de proteína", e barra
responde proporção, não quantidade — o trio proporcional já está no hero, então
seria repetir a resposta errada. A segunda é de regra: sem cor (proibida, ΔE00
3,0 entre proteína e gordura sob deuteranopia, medido no estudo 05) restam três
segmentos distinguíveis só por ordem, o que exige legenda que não existe na
linha. Some o custo no J6: mais uma `View` (ou um `svg`) por entrada, contra
zero nó novo do texto.

**(c) Terceira linha `P 1,9 g · C 21 g · G 0,2 g`.** É a forma revertida. Levava
a entrada de 64 para 72 dp a 1,0× e para 75,4 dp a 1,3× (estudo 05 §1), o que
come uma entrada inteira de tela no J6. Descartada de novo, pelo mesmo número.

**(d) Os três à direita, ao lado das kcal.** Derruba os nomes inteiros de 87%
para 44% em 360 dp (estudo 05 §1). Descartada de novo, pelo mesmo número.

**(e) Macros em `caption` 11 para caber mais.** Descartada sem medir largura: o
design system fixa `caption` como piso e proíbe texto corrido menor; e a linha
não precisa de largura nenhuma — sobram 132,8 dp.

## 5. O subtotal que não parecia caloria

`meal-<refeição>-subtotal` era Fraunces 24 (`displaySmall`) e as kcal de uma
entrada são Inter 16 `tabular-nums`. Duas fontes para a mesma unidade, a 128 dp
de distância vertical uma da outra: o número sob "Adicionar" era lido como
título, não como caloria.

Das duas saídas que o dono admitiu, vale a tipográfica: o subtotal passa a
`body` Inter 16 `tabular-nums` `ink`, idêntico às kcal da entrada. A outra —
acrescentar "kcal" visível — não resolveria o critério 7 (continuariam sendo
tratamentos diferentes) e ainda arrisca os 360 dp do cabeçalho com "1.240 kcal"
+ "Adicionar".

Efeito colateral bom: a Fraunces volta a aparecer só onde há **uma** resposta
por tela (hero do dia, quantidade da folha, total da tela da refeição). O
cabeçalho segue com 48 dp — a entrelinha cai de 28 para 22, nada reflui — e o
nome da refeição (`heading` Inter Medium 17) fica sendo o elemento dominante,
que é o certo para um cabeçalho.

**Custo aceito:** o dia perde um pouco de ritmo tipográfico; quatro números
serifados grandes davam textura à rolagem. Em troca, uma unidade tem uma forma
só.
