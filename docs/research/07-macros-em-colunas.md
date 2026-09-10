# Macros em colunas, ancorados na margem direita

Pedido do dono em 2026-09-10: "está ali P C G, só que só a letra e o número não
está muito bom. Eu quero comparar quantos gramas de proteína eu comi em cada
alimento que adicionei e comparar entre eles de uma forma mais fácil. Uma
tabela, ou pelo menos de uma forma mais bonita, ao lado das calorias."

O estudo 06 pôs os macros de volta na linha 2 e resolveu o custo de altura. O
que ele não resolveu é o que o dono está pedindo agora: **comparar entre
linhas**. Hoje o bloco começa depois da porção, e a porção mede de 36,8 dp
(`100 g`) a 146,7 dp (`1 colher de servir · 45 g`), então o `P` de cada entrada
nasce num x diferente. Nenhum tamanho de célula conserta isso — só a âncora.
A regra já existia em §1.2 do design system: "números em coluna alinhados à
direita".

Todas as larguras foram remedidas neste repositório pelo método do estudo 06:
`hmtx`/`cmap` de `assets/fonts/Inter-Regular.ttf`, sem kerning e sem `tnum`
(o texto real usa `tabular-nums`), erro abaixo de 3% e sempre para mais — as
folgas relatadas são conservadoras.

**A tabela do estudo 06 §2 fica inválida**: ela media o cabimento em 270 dp, a
caixa do nome. A linha 2 deixou de morar nessa caixa e passou a ocupar os
**328 dp** da linha, então o denominador mudou. As contas abaixo substituem
aquelas.

---

## 1. A célula, medida

O bloco é uma grade de três células idênticas, não uma frase:

```
Arroz, tipo 1, cozido                                    128
1 colher de servir · 45 g          P   2     C  21     G   0
```

| Peça | Conteúdo mais largo | Medido (Inter 13) | Caixa |
| --- | --- | --- | --- |
| rótulo | `G` | 9,7 dp | **10 dp** |
| espaço rótulo→valor | — | — | **4 dp** |
| valor | três dígitos (`100`) `tabular-nums` | 25,3 dp | **26 dp** |
| célula | — | — | **40 dp** |
| espaço entre células | — | — | **16 dp** |
| bloco (3 células + 2 espaços) | — | — | **152 dp** |

O espaço externo é **o dobro** do interno, e isso não é gosto: o valor é
alinhado à direita dentro dos 26 dp, então um número de um dígito fica a até
22 dp do seu próprio rótulo. Com 8 dp entre células (a primeira medida, vista
na captura `refeicao-colunas`), o `3` do arroz ficava 8 dp do `C` vizinho e
22 dp do seu `P`: lia-se "3 C". Com 16 dp o número volta a pertencer à letra à
sua esquerda, e o alinhamento à direita — que é o que faz a coluna — não muda.

O valor é alinhado à direita dentro dos 26 dp: é o que faz `2`, `21` e `100`
terminarem no mesmo x. O rótulo tem caixa fixa porque `P`, `C`, `G` e `F` medem
entre 7,9 e 9,7 dp — sem caixa, a letra empurraria o número e a coluna dos
valores andaria de linha para linha.

## 2. A linha 2 refeita, sobre 328 dp

| Peça | 1,0× | 1,3× |
| --- | --- | --- |
| linha (margem a margem) | 328,0 | 328,0 |
| bloco de macros | 152,0 | **197,6** |
| espaço porção→bloco | 12,0 | 12,0 |
| **sobra para a porção** | **164,0** | **118,4** |

As caixas da célula crescem com o corpo do texto até 1,3× (o teto que todo
`Text` da entrada já carrega em `maxFontSizeMultiplier`), senão três dígitos a
1,3× (32,9 dp) não caberiam nos 26. Daí o bloco de 197,6 dp na coluna da
direita.

| Porção | 1,0× | Cabe em 164 dp | 1,3× | Cabe em 118,4 dp |
| --- | --- | --- | --- | --- |
| `100 g` | 36,8 | sim, 127,2 de folga | 47,8 | sim |
| `1 xícara · 120 g` | ~104 | sim | ~135 | não: trunca a medida |
| `1 colher de servir · 45 g` | **146,7** | **sim, 17,3 de folga** | 190,7 | não: trunca a medida |

O caso que o estudo 06 perdia a 1,0× — a medida caseira — **para de truncar**:
antes ela dividia os 270 dp com o bloco que vinha logo atrás dela (244,8 dp de
cadeia); agora ela tem 164 dp só para si. A 1,3× a colher trunca, como já
trunca hoje, e a ordem de truncamento continua a mesma: só o rótulo da medida
encolhe (`flexShrink: 1`); gramas e bloco nunca.

## 3. O que a linha 1 não perdeu — o número do critério 4

A linha 1 não foi tocada: `[nome 270][12][kcal 46]`. Logo a distribuição do
estudo 06 §3 vale sem remedição: **87,0% dos 2.319 nomes** cabem inteiros em
270 dp (mediana 156,2 · p75 217,1 · p95 350,8). Nenhum nome mudou de lado, e
nenhum macro subiu para a linha do nome.

A borda direita do bloco cai no mesmo x da borda direita da coluna de kcal, e é
isso que o critério 2 mede: a lista termina numa borda só, nas duas linhas.

## 4. O ponto fraco aceito

Numa refeição de porções curtas o vão entre `100 g` e o bloco chega a ~155 dp;
numa de medidas caseiras cai a 12 dp. O ritmo horizontal muda de linha para
linha dentro da mesma refeição. É o preço da coluna: ou o bloco anda com a
porção (e não há comparação), ou o vão varia (e há). Escolhido o segundo, com o
julgamento final na captura do J6.

**Plano B, não adotado neste ciclo:** se a captura mostrar o `G 0` (13
`inkMuted`) sendo lido como uma segunda caloria logo abaixo do kcal (16 `ink`)
na mesma borda, o bloco recua 58 dp (46 + 12) e termina na borda do nome,
aceitando que a colher trunque a 1,0×. Se isso acontecer, a captura que
motivou fica citada aqui e em `docs/DECISIONS.md`.

## 5. Direções descartadas

**(a) Tabela de verdade (cabeçalho `P C G` uma vez por refeição, filete,
linhas).** Um cabeçalho por refeição custa 24 dp em refeições que têm de 1 a 6
itens — até 96 dp por dia de tela no J6 — para repetir três letras que já estão
em cada linha. Filete e moldura contrariam §2.5 ("sem separador; entradas se
separam por espaço"). A coluna nasce do alinhamento; a moldura não acrescenta
leitura, só peso.

**(b) Cor por macro.** Proibida e já medida: ΔE00 3,0 entre `protein` e `fat`
sob deuteranopia (estudo 05), e o design system reserva o acento para uma ação
por tela. Continua descartada.

**(c) Terceira linha com os macros por extenso.** Levava a entrada de 64 para
72 dp a 1,0× e 75,4 a 1,3× (estudo 05 §1): come uma entrada inteira de tela no
J6. Descartada de novo, pelo mesmo número.

**(d) Macros na linha 1, ao lado das kcal.** Derruba os nomes inteiros de 87%
para 44% em 360 dp (estudo 05 §1). Descartada de novo, pelo mesmo número.

**(e) Ordenar ou realçar a refeição por macro na `MealScreen`.** É um controle
novo, um estado persistido e um rótulo de acessibilidade novo, para refeições
de 1 a 6 itens — onde a comparação já se faz com o olho depois que as colunas
existem. Custo desproporcional ao ganho.

**(f) Rodapé de total de macros na `MealScreen`.** As barras de §2.9 já são o
total da refeição; um rodapé repetiria a mesma resposta num segundo lugar.

**(g) Célula elástica (largura pelo conteúdo, com `minWidth`).** Descartada
sem medir: com `2` e `100` na mesma coluna, a largura mudaria por linha e as
colunas voltariam a andar — é exatamente o defeito que esta tarefa corrige.

## 6. Custo aceito

Gramas continuam inteiras no pixel (0,2 g de gordura imprime `0`), a folha de
porção e o leitor de tela continuam com o decimal, e um macro que a fonte nunca
declarou imprime **célula vazia** — nunca um zero — mantendo os 40 dp para que
a coluna das outras linhas não ande.
