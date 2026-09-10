# Bocado — Marca

Este documento fecha a identidade do Bocado: nome, voz, símbolo, lockup, paleta,
ícone e splash. Tudo que está aqui foi medido (contraste WCAG, tamanhos em pixel
real, métricas da fonte) e gerado a partir de uma única fonte de geometria,
`scripts/generate-brand-assets.mjs`. Onde o resultado ficou apenas correto, e não
bom, está escrito.

Leia junto: `docs/research/04-nome-e-marca.md` (a pesquisa que escolheu o nome e a
paleta) e `docs/DESIGN_SYSTEM.md` (como a marca vira interface).

---

## 1. Nome

**Bocado.** Um bocado é a porção que cabe na boca — a unidade atômica do que o app
faz: registrar um bocado por vez. O nome nasce de *boca* e é palavra viva em
português e espanhol, com o mesmo sentido positivo nos dois; em inglês lê como
"avocado", sem significado ruim.

| Uso | Forma |
| --- | --- |
| Texto corrido, loja, sistema (nome do app na launcher) | `Bocado` |
| Lockup (logotipo) | `bocado`, minúsculas, Fraunces 144 Soft Regular |
| Descritor pt-BR (loja, título) | `Bocado — contador de calorias`; alternativo: `Bocado — diário alimentar` |
| Descritor en-US | `Bocado — Calorie Counter` |
| Linha de posicionamento | `Bocado a bocado.` / `One bite at a time.` |

Nunca: `BOCADO`, `Bocado App`, `Bocado AI`, `Bocado+`, "o Bocado" com artigo em
copy de interface. Nunca a piada "um bocado de calorias" (em pt-BR "um bocado"
também significa "bastante").

Pronúncia: bo-CA-do. Sem acento gráfico, sem cedilha — o nome sobrevive a URL,
e-mail, ASO e teclado internacional.

## 2. Tom de voz

Calmo, direto, sem culpa. O app é um caderno bem composto, não um treinador.

| Regra | Escreva assim | Nunca assim |
| --- | --- | --- |
| Número primeiro, adjetivo nunca | `1.240 restantes` | `Você ainda pode comer 1.240 kcal!` |
| Passar da meta é um fato, não um erro | `120 acima da meta` | `Você estourou a meta 😬` |
| Confirmação é descrição do que aconteceu | `Arroz adicionado em Almoço · Desfazer` | `Boa! Arroz registrado com sucesso!` |
| Erro diz o que fazer | `Nada para "xyz". Tente outra grafia ou um termo mais curto.` | `Ops! Não encontramos nada :(` |
| Vazio é convite, não cobrança | `Nada registrado ainda` | `Sua refeição está vazia` |
| Carregamento diz o que está sendo feito | `Preparando a base de alimentos…` | `Só um segundinho…` |

O que a voz nunca usa: ponto de exclamação; emoji; "parabéns", "ótimo", "boa",
"cuidado", "atenção"; "queimar", "trapaça", "pecado", "culpa"; "sucesso" ou "erro"
como palavra visível quando uma descrição basta; qualquer sequência, streak ou
medalha; qualquer pedido de avaliação nos primeiros dias.

Convenções: frases em caixa baixa com inicial maiúscula (sentence case); números
sempre em algarismos no formato pt-BR (`1.240`, `1,5`); unidades em minúsculas
depois de espaço (`58 kcal`, `45 g`); o separador entre informações da mesma linha
é o ponto médio `·`, nunca barra nem hífen.

## 3. O que a marca nunca faz

- Vermelho para "acima da meta", verde para "abaixo". Cor semântica só existe
  nos dados de macro, e mesmo assim acompanhada de rótulo.
- Fundo chapado saturado, gradiente, sombra ou brilho no símbolo, símbolo
  rotacionado, espelhado, contornado ou com efeito.
- Mascote, emoji como ícone, ilustração "kawaii" de comida, foto de banco de
  imagens, garfo, maçã, folha, chama, anel de progresso como marca.
- Silhueta orgânica com mordida (é a Apple, e a Cal AI já usa uma maçã
  branca), cunha aberta de dois raios retos (é o Pac-Man), mais de uma
  mordida, mordida em ângulo diferente do eixo −45°.
- Anúncio, pop-up, feed, pedido de avaliação, contador de streak, confete.
- Prometer precisão que não tem: o badge de fonte (`TACO`, `IBGE`, `OFF`) fica
  sempre visível ao lado do dado.
- Índigo em mais de um papel de ação por tela (ver §6).

---

## 4. Símbolo — "O bocado"

### 4.1 Escolha e o que mudou

O pedido do dono, em 2026-09-09, foi literal: **mais simples, mais sofisticado,
mais premium**. "Mais simples" é a instrução operante — menos traços, uma ideia
só, reconhecível em 24 dp e em preto sobre branco.

A marca é **um disco de tinta com uma mordida circular**. Duas circunferências e
uma subtração: não há segunda forma, não há segunda cor, não há acento. A ideia
é o nome — um bocado é a porção que sai numa mordida, e a marca é a prova de que
ela saiu.

O símbolo anterior ("tigela e bocado") está registrado em §4.6 com o motivo da
troca.

### 4.2 Geometria

Definida no quadro do ícone adaptativo Android, 108 × 108 dp, safe zone =
círculo de Ø 66 dp centrado em (54, 54).

| Elemento | Medida | Nota |
| --- | --- | --- |
| Disco anfitrião | raio **R = 26** (Ø 52) | coincide com a keyline circular do Material (52 dp) |
| Centro do disco | **(55,768, 52,232)** | 2,5 dp do centro do quadro, ao longo do eixo da mordida |
| Eixo da mordida | **−45°** (cima e à direita) | o único ângulo em que a marca é desenhada |
| Círculo da mordida | raio **r = 13**, centro a **d = 21** do centro do disco | centro em (70,617, 37,383) |
| Boca da mordida | **59,4°** do rebordo, corda de 25,8 dp | a mordida abre, não é um furo |
| Profundidade | a mordida chega a **8 dp** do centro do disco | menos que isso é uma mordidinha |
| Caixa da marca | **52 × 52**, é o próprio disco | a mordida é subtrativa, não aumenta a caixa |
| Ponto mais distante do centro da safe zone | **28,5 dp** | dentro dos 33 dp |
| Margens no quadro | 23,5 dp de quadro livre em volta do disco | |

**Centragem óptica.** A área removida (a lente entre as duas circunferências) é
de **366,0** dp², contra **2 123,7** dp² do disco inteiro — 17,2 %. O centroide
de área da forma mordida cai por isso **5,0 dp** no sentido oposto à mordida.
Corrige-se **metade**, 2,5 dp: com a correção inteira um disco lê visivelmente
descentrado no quadro; sem nenhuma, lê pesado embaixo à esquerda. O número está
aqui para não ser re-estimado no olho a cada rodada.

Caminho do símbolo, um só, fechado (o mesmo em todos os arquivos):

```
M80.853 45.397 A26 26 0 1 1 62.603 27.147 A13 13 0 1 0 80.853 45.397 Z
```

Lê-se: parte de uma ponta da boca, percorre o rebordo **pelo lado longo**
(300,6°, daí o large-arc), e volta pela parte do círculo da mordida que está
dentro do disco (193,9°, também large-arc, varrida ao contrário) — essa volta é
a mordida.

Cores: tinta (`#1B1D21`) sobre osso (`#F7F4EE`). No escuro: `#ECEAE4` sobre
`#15161A`. **A marca não carrega acento**: o índigo continua sendo da interface,
onde a regra de um papel por tela vale. Um preenchimento só é o que torna a
monocromática, o estêncil e o ícone temático o mesmo desenho, sem variante.

Não há corte por tamanho. O símbolo anterior precisava de um (a parede da tigela
afinava); este é um sólido com uma mordida de metade da sua largura, e o
gerador reduz o mestre sem perder nada.

### 4.3 O que deliberadamente não se fez

O pedido era ser singular. O mapa de identidade dos onze concorrentes está em
`docs/research/04-nome-e-marca.md` §3; a coluna "estilo de ícone" foi lida como
uma lista do que **não** desenhar.

| Território | Quem já ocupa | Por que ficou de fora |
| --- | --- | --- |
| Figura humana / silhueta | MyFitnessPal | é o líder de categoria; qualquer eco lê como imitação |
| Alvo, mostrador, velocímetro | Cronometer, Lose It! | metáfora de desempenho, o oposto de "sem culpa" |
| Anel ou arco de progresso | Cronometer, e meia categoria de saúde | vira barra de progresso na própria UI e some entre ícones do sistema |
| Maçã, folha, garfo, prato | Cal AI (maçã branca), Foodnoms (garfo) | pictograma de comida é o clichê da categoria, e a maçã mordida é da Apple |
| Buraco de fechadura, monograma | FatSecret, MacroFactor | monograma é marca sem ideia; "MF" cromado é a estética que este app recusa |
| Gradiente saturado, neon | YAZIO, Lifesum, Foodnoms | nove dos onze usam chapado saturado; o osso é o diferenciador a dez metros |
| Tigela, panela, ramen | delivery em geral, e o ícone "rice bowl" do Material | era o símbolo anterior; ver §4.6 |
| Cunha aberta de dois raios retos | — | é o Pac-Man, e a categoria não perdoa a piada |

O que sobrou como território livre é o que a marca usa: **forma geométrica pura,
uma cor, uma subtração**, sobre papel.

### 4.4 Os testes

| Teste | Resultado | Evidência |
| --- | --- | --- |
| **1. Legenda** — o que a pessoa vê sem explicação? | Leitura pretendida: "um círculo com uma mordida". Leituras residuais conhecidas e aceitas: lua, eclipse. É o risco assumido desta forma: a lua aparece quando o observador vê primeiro a *forma que ficou* em vez da *que saiu*. A boca larga (59,4°, corda 25,8 dp contra os 26 dp de diâmetro da mordida) é o que separa a mordida do crescente. | `docs/design/brand-size-test.png` |
| **2. Ícone de UI** | Passa. Não existe ícone de sistema que seja um disco com uma mordida; não é anel de progresso (é sólido), não é radio (não é concêntrico), não é badge. | Material Symbols e Lucide |
| **3. Tamanho real** — 24 / 29 / 40 / 48 / 60 px, sem ampliar | Passa. A mordida tem sempre metade da largura da marca, então encolhe junto: em 24 px o disco tem 24 px e a mordida 12 px. Não há detalhe fino que feche. | folha de contato em pixel 1:1, fundo cinza médio |
| **4. Intenção** | Passa. Uma única assimetria (a mordida) e um único desvio documentado (a correção óptica de 2,5 dp). Nada é aproximado. | §4.2 |
| **5. Concorrente** | Passa. Nenhum dos onze usa forma geométrica pura com subtração; nenhum usa papel como fundo. Ressalva honesta: a mordida circular num sólido é um recurso conhecido do desenho de marca — a singularidade aqui vem do conjunto (disco de tinta + osso + nenhuma cor de acento), não do recurso. | §4.3 e `docs/research/04-nome-e-marca.md` §3 |
| **6. Monocromático** | Passa por construção. É **um caminho fechado, um preenchimento**: preto sobre branco, branco sobre preto e estêncil saem do mesmo `pathData`, sem contraforma fechada e sem ilha. | `bocado-mark-mono.svg`, `drawable/ic_launcher_monochrome.xml` |

### 4.5 Usos do símbolo no app

| Uso | Como |
| --- | --- |
| Ícone do app | conforme §7–§8; o lançador mostra a marca **já mordida** |
| Abertura | a janela de lançamento desenha o disco **inteiro**; a mordida acontece na abertura (§9) |
| Assinatura de tela | 24 dp em "Fontes de dados", em tinta, sem contêiner e sem acento |
| Loader (única animação de carregamento do app) | o bocado volta ao seu lugar e sai de novo, 600 ms, ease-in-out, em loop; o disco parado. **Documentado, não implementado** |
| Favicon, avatar de loja | símbolo sobre osso, sem o nome |
| Nunca | como botão, como ícone de lista, como bullet, como decoração de vazio |

**Tamanhos mínimos.** Símbolo isolado **20 dp**; dentro da interface **24 dp**;
lockup **96 px** de largura. Abaixo disso não se usa a marca — usa-se o nome.

**Proibido com esta marca**, além do que §3 já lista: girar, espelhar,
contornar, aplicar gradiente/sombra/brilho, dar mais de uma mordida, mudar o
ângulo da mordida, preencher a mordida com cor, usar o bocado solto como
elemento gráfico fora da abertura, e desenhar a marca à mão em vez de gerá-la.

### 4.6 A marca anterior — "Tigela e bocado"

Vigorou de 2026-09-08 a 2026-09-09.

Era uma tigela vista de perfil — meio anel de raio externo 24 e interno 15,
continuado por paredes retas evasadas 10°, cortadas rentes a 10 dp acima do
centro — com um ponto índigo de Ø 13 dp assentado no fundo. Duas formas, duas
cores, nove comandos de caminho.

```
tigela  M27.866 36 L30.365 50.168 A24 24 0 0 0 77.635 50.168 L80.134 36
        H70.995 L68.772 48.605 A15 15 0 0 1 39.228 48.605 L37.005 36 Z
ponto   círculo (54, 46) r 6,5
```

**Motivo da troca.** O dono pediu uma marca mais simples, mais sofisticada e
mais premium. A folha anterior já registrava, com todas as letras, o que a nova
resolve:

- *"não tem truque… isolado em preto, é um bom pictograma, não uma marca
  inesquecível"*. A memorabilidade dependia do conjunto (tigela + ponto + osso),
  não da forma;
- a tigela é território ocupado — pictograma de tigela é vocabulário de app de
  delivery e existe como ícone "rice bowl" no próprio Material;
- as leituras residuais registradas eram *oveiro* e *pilão*: um pilão num
  contador de calorias não é a imagem que este app quer;
- exigia um corte mais pesado abaixo de 44 px para a parede não afinar, ou seja,
  duas geometrias mantidas em paralelo;
- duas formas e duas cores contradiziam "menos traços, uma ideia só".

Nada da paleta mudou na troca; o que saiu foi o índigo *do símbolo*, que voltou
a ser exclusivamente da interface.

## 5. Lockup

Símbolo à esquerda + `bocado` em **Fraunces 144 Soft Regular**, minúsculas.
Fraunces já é a voz numérica do app (o número-resposta é Fraunces); usar outra
família no logotipo criaria duas marcas. Em minúsculas porque o nome é uma coisa
pequena, uma mordida; caixa alta gritaria.

Métricas medidas na fonte (`Fraunces144Soft-Regular.ttf`, 2000 UPM): altura-x
0,444 em, ascendente do `b`/`d` 0,736 em, avanço de "bocado" 2,838 em.

O símbolo **é o `o` mordido de bocado**: um disco tem exatamente o
comportamento de uma letra redonda minúscula, então ele senta na linha como as
outras seis e a marca lê como uma palavra, não como "logo + nome".

| Relação | Valor |
| --- | --- |
| Diâmetro do símbolo | **0,464 em** = altura-x (0,444) + 2 × overshoot (0,01) |
| Base do símbolo | 0,01 em abaixo da linha de base (o overshoot do `o`) |
| Topo do símbolo | 0,01 em acima da altura-x |
| Espaço símbolo → `b` | 0,22 em |
| Tracking do nome | −0,015 em |
| Cores | nome e símbolo na tinta, um preenchimento só. Mono: tudo `currentColor` |
| Zona de proteção | 0,464 em (o diâmetro do símbolo) em todos os lados |
| Tamanho mínimo | lockup 96 px de largura (corpo ≈ 26 px); símbolo isolado 20 px de largura |

Arquivos: `assets/brand/bocado-lockup.svg` e `bocado-lockup-mono.svg`.
Os dois referenciam a fonte por `font-family` e não embutem curvas — onde o SVG for
usado sem a fonte instalada, exporte PNG a partir de `docs/design/telas.html`, que a
carrega via `@font-face`.

Não entregue: versão empilhada (símbolo sobre o nome). Se precisar, use as mesmas
relações com o símbolo a 1,2 em de largura, centrado, 0,3 em acima do nome.

Erros: nome em caixa alta; símbolo à direita; símbolo e nome em cores diferentes
da tinta; tracking positivo; nome em Inter; substituir o `o` final do nome pelo
símbolo (ele é a primeira letra, não a última); qualquer versão com "app" ou
"AI".

---

## 6. Paleta — Direção A "Papel"

Osso quente + tinta quase preta + um único índigo profundo. É o território mais
vazio da categoria (nove de onze concorrentes usam chapado saturado) combinado com
o registro mais vazio (editorial calmo). Tokens em `src/theme/colors.ts`; a única
mudança feita nesta rodada foi `inkSubtle` claro (`#8A8D94` → `#7E8188`), porque o
valor anterior caía a 2,8:1 sobre `surfaceMuted` e não servia nem como borda.

| Token | Papel | Claro | Escuro |
| --- | --- | --- | --- |
| `background` | a página (papel) | `#F7F4EE` | `#15161A` |
| `surface` | folha, bandeja, campo | `#FFFFFF` | `#1E2026` |
| `surfaceMuted` | chip, badge, campo de busca | `#EFEBE3` | `#262930` |
| `ink` | texto primário | `#1B1D21` | `#ECEAE4` |
| `inkMuted` | texto secundário (qualquer texto legível) | `#5C5F66` | `#A7A6A0` |
| `inkSubtle` | bordas de controle, desabilitado — classe 3:1 | `#7E8188` | `#767A82` |
| `accent` | ação primária, estado ativo, o "✓" | `#2F3A8C` | `#93A0F2` |
| `onAccent` | texto sobre o acento | `#FFFFFF` | `#15161A` |
| `accentSoft` | fundo de selecionado | `#E4E7F7` | `#2A2F4F` |
| `line` | filete separador (decorativo) | `#E3DFD6` | `#2C2F37` |
| `track` | trilho das barras | `#E6E2DA` | `#2A2D34` |
| `overGoal` | excedente da barra diária | `#1E2661` | `#C4CCFF` |
| `protein` / `carbs` / `fat` | só o preenchimento das barras de macro | `#3F5F7C` / `#9C5A2C` / `#6E4E76` | `#8FB6D6` / `#EDA56E` / `#C39ACB` |
| `danger` | confirmação destrutiva e falha de rede, só | `#9E2A2B` | `#E5757A` |
| `inverseSurface` / `onInverseSurface` / `inverseAccent` | snackbar | `#1B1D21` / `#F7F4EE` / `#93A0F2` | `#ECEAE4` / `#15161A` / `#2F3A8C` |

Contraste (WCAG 2.1, claro / escuro):

| Par | Sobre `background` | Sobre `surface` | Sobre `surfaceMuted` |
| --- | --- | --- | --- |
| `ink` | 15,4 / 15,0 | 16,9 / 13,5 | 14,2 / 12,1 |
| `inkMuted` | 5,8 / 7,4 | 6,4 / 6,7 | 5,4 / 6,0 |
| `inkSubtle` (não-texto) | 3,6 / 4,2 | 3,9 / 3,8 | 3,3 / 3,4 |
| `accent` | 9,1 / 7,4 | 10,0 / 6,6 | 8,4 / 5,9 |
| `danger` | 6,8 / 6,2 | 7,5 / 5,6 | 6,3 / 5,0 |
| `overGoal` | 12,7 / 11,6 | — | — |

Outros pares: `onAccent` sobre `accent` 10,0 / 7,4; `accent` sobre `accentSoft`
8,1 / 5,3; `onInverseSurface` sobre `inverseSurface` 15,4 / 15,0; `inverseAccent`
sobre `inverseSurface` 6,9 / 8,3. Todos AA; a tinta e o acento são AAA nos dois
modos. `carbs` (`#9C5A2C`) sobre `surfaceMuted` dá 4,51 — por isso macro nunca é
cor de texto, só de barra. O critério que a barra precisa cumprir é o de
não-texto (3:1 contra o `track`, 4,15), e nenhuma superfície do app imprime
macro como texto.

**Regra do acento.** Por tela, o índigo pode ocupar **um papel de ação** (o botão
primário, ou o "Adicionar", ou o "+"→"✓") e **um papel de estado** (o selecionado,
o hoje, o progresso). Nunca em ícone decorativo, título, filete, fundo de seção ou
ilustração. Se uma tela pede índigo num terceiro lugar, a tela está errada.

---

## 7. Ícone adaptativo (Android)

| Camada | Arquivo | Conteúdo |
| --- | --- | --- |
| Fundo | `values/ic_launcher_background.xml` → `@color/ic_launcher_background` | `#F7F4EE` sólido, sem textura |
| Frente | `mipmap-{mdpi…xxxhdpi}/ic_launcher_foreground.png` (108/162/216/324/432 px) | símbolo na safe zone de 66 dp, fundo transparente |
| Monocromática (API 33+, tema dinâmico) | `drawable/ic_launcher_monochrome.xml` | vector drawable com **o** caminho de §4.2; o sistema tinge, e como a marca já é de uma cor só não há nada a perder (teste 6) |
| Declaração | `mipmap-anydpi-v26/ic_launcher.xml` e `ic_launcher_round.xml`; `mipmap-anydpi-v33/…` com `<monochrome>` | |
| Legado (API 24–25) | `mipmap-*/ic_launcher.png` e `ic_launcher_round.png` (48/72/96/144/192 px) | forma de 44 dp em osso (quadrado raio 20 % ou círculo) com filete de 1 dp em `line` para ter borda em wallpaper branco; símbolo escalado como se a forma fosse os 72 dp visíveis do adaptativo, para as duas gerações terem o mesmo tamanho na home |

Nome na launcher: `Bocado` (`android/app/src/main/res/values/strings.xml`, já
correto). O manifesto já aponta para `@mipmap/ic_launcher` e `ic_launcher_round`;
não foi alterado.

---

## 8. Ícone iOS

`ios/Bocado/Images.xcassets/AppIcon.appiconset/` no formato single-size do Xcode
15+: três PNGs de 1024 × 1024, **sem cantos arredondados** (o sistema recorta).

| Aparência | Arquivo | Conteúdo |
| --- | --- | --- |
| Claro | `AppIcon.png` | osso sólido + símbolo em tinta |
| Escuro | `AppIcon-Dark.png` | símbolo em `#ECEAE4` sobre **transparente** — o iOS pinta o próprio gradiente escuro por trás, como faz com todos os ícones do sistema |
| Tinted | `AppIcon-Tinted.png` | símbolo branco sobre transparente; o iOS mapeia a luminância para a cor escolhida pelo usuário |

Escala: 72 dp do quadro Android ↔ 1024 px, para o símbolo ter o mesmo tamanho na
home dos dois sistemas (disco de 740 px, 72 % do lado).

Ressalva honesta: no formato single-size, os tamanhos pequenos (20–60 pt) são
reduzidos pelo Xcode a partir do 1024 — é exatamente o "redimensionar o mestre" que
a regra de ícone manda evitar. Aceito o custo porque só esse formato carrega as
aparências escura e tinted, e verifiquei a geometria em 29, 40 e 60 px reduzindo
do 1024 do mesmo modo que o Xcode faz (§4.3, teste 3). Se algum dia o resultado no
aparelho decepcionar, o gerador já sabe fazer o corte pesado por tamanho — basta
voltar ao Contents.json por tamanho.

---

## 9. Abertura

A abertura **é onde a mordida acontece**. O lançador mostra a marca já mordida;
a janela de lançamento mostra o disco inteiro; o app tira o bocado. Esse é todo
o conteúdo da animação — não há coreografia, nem nome por extenso, nem tagline,
nem som, nem háptico.

- Fundo: `background` do tema — `#F7F4EE` no claro, `#15161A` no escuro, em
  toda a cadeia: `values{,-night}/splash.xml` → `@color/splash_background`, a
  barra de status, a barra de navegação e o fundo da sobreposição.
- **O `windowBackground` do tema do app (`Base.AppTheme`) é
  `@color/splash_background`.** Sem essa linha o tema cai no cinza do AppCompat.
  Pintar ali a layer-list inteira (fundo **e** disco) foi tentado e medido no
  J6: custa ~28 ms da partida fria (mediana de `TotalTime` 3240 ms contra
  3212 ms com a cor). A cor fica.
- **A activity não troca de tema.** `MainActivity.onCreate` chamava
  `setTheme(R.style.AppTheme)` antes do `super`, e era isso que apagava a
  marca: a *starting window* mostra o disco, mas ela é entregue à janela da
  própria activity assim que essa janela existe — muito antes de o React
  Native ter um primeiro quadro para pôr nela. Desse instante até a
  sobreposição montar, a janela pintava a cor lisa do `AppTheme`, e quatro
  coletas seguidas no aparelho pegaram a abertura como osso puro, sem símbolo
  nenhum. Sem a troca, a activity fica com `Theme.App.SplashScreen` (que herda
  de `AppTheme`, então barras e o resto não mudam), o `windowBackground` segue
  sendo `@drawable/splash_background` e o disco permanece na tela até o
  primeiro quadro do app desenhar por cima — onde a sobreposição o continua no
  mesmo tamanho e no mesmo lugar. É um tema inflado por activity em vez de
  dois, então também não custa a inflação extra que a medição acima pesou.
- **A janela devolve o desenho quando a abertura acaba.** Terminados os
  400 ms, a sobreposição chama `releaseLaunchBackground()`
  (`src/native/appearance.ts` → `NavigationBarModule`), que troca o
  `windowBackground` da activity pela cor lisa — a mesma cor, lida pelo
  contexto da activity, então clara ou escura conforme a configuração. Daí em
  diante não há bitmap nenhum sendo composto atrás de cada quadro: a
  layer-list existe só enquanto tem o que mostrar. Sem o módulo nativo a
  chamada é no-op e a janela apenas mantém um bitmap que ninguém vê.
- Símbolo: **disco inteiro**, 56 dp de largura. Esse número está uma vez no
  gerador (`SPLASH_MARK_DP`) e uma vez em `src/app/SplashOverlay.tsx`
  (`MARK_DP`); mudar um sem o outro é o que faz o disco saltar.
- Dois assets, porque as duas eras da plataforma medem diferente:

| Caminho | Asset | Canvas | Por quê |
| --- | --- | --- | --- |
| API 24–30 | `drawable{,-night}-*/splash_icon.png` (96/144/192/288/384 px) | 96 dp | item centrado da layer-list de `windowBackground`; respeita o tamanho intrínseco do bitmap |
| API 31+ | `drawable{,-night}-*/splash_icon_v31.png` (240/360/480/720/960 px) | 240 dp | `windowSplashScreenAnimatedIcon` é **escalado para o canvas de ícone** da SplashScreen API (240 dp com cor de fundo de ícone, círculo útil de 160 dp). Alimentar o asset de 96 dp aqui poria o disco na tela com 140 dp — duas vezes e meia o que a sobreposição desenha um quadro depois |

  Nos dois, o disco é centrado no próprio asset, e não colocado no quadro de
  108 dp: a janela centraliza o bitmap e a sobreposição centraliza a marca, e
  com o deslocamento óptico do quadro o símbolo saltaria 2,7 dp.
- A animação (`src/app/SplashOverlay.tsx`): o bocado sai pelo eixo −45°,
  10 dp, encolhendo a 0,85 e esvanecendo — `LAUNCH_BITE`, 220 ms. Em seguida o
  fundo esvanece sobre "Hoje" — `LAUNCH_OUT`, 180 ms. Só `transform` e
  `opacity`; 400 ms no total.
- **Nunca é uma espera.** A sobreposição é irmã do navegador, não um portão em
  volta dele: "Hoje" monta e desenha exatamente como antes, e o relógio da
  animação só começa num quadro que o app já desenhou. Ela tem
  `pointerEvents="none"`, então um toque em "Adicionar" durante os 400 ms chega
  em "Adicionar".
- **Reduzir movimento**: o bocado não é desenhado. A marca aparece já mordida,
  sem percurso, e o esvanecimento de 180 ms continua — é opacidade, não
  deslocamento, e cortar seco seria pior.
- **A conta tem de fechar no aparelho.** `scripts/measure-launch.sh` roda cinco
  partidas frias com `am start -W` e imprime a mediana de `TotalTime` e a de
  `Displayed`. Mede-se no J6, na mesma variante de build, dos dois lados: a
  linha de base no commit `c27ed40` (antes desta marca) e depois neste. Os dois
  números vão para o summary do teste de device; a abertura não fecha sem eles.

  Quem não puder reconstruir o commit antigo tem uma segunda porta: o próprio
  Android escreve `Displayed com.gustavoem.bocado/.MainActivity: +842ms` no
  logcat a cada partida fria, sem nenhuma instrumentação. Então

  ```
  scripts/measure-launch.sh --parse <captura-de-logcat>
  ```

  extrai a mediana de qualquer captura já guardada — inclusive a de uma
  execução anterior, que é o que permite recuperar a linha de base sem
  recompilar. É o mesmo evento que o `TotalTime` mede: o primeiro quadro da
  activity.
- iOS: `LaunchScreen.storyboard` ainda precisa trocar os rótulos do template
  por uma `UIImageView` com `bocado-splash` (96 pt, centrada) sobre
  `background`, com a variante escura pelo catálogo de assets. **Passo manual
  no Xcode**, fora do alcance deste repositório.

---

## 10. Arquivos e regeneração

```
assets/brand/
  bocado-mark.svg            símbolo, 108×108, um caminho em tinta
  bocado-mark-mono.svg       símbolo, currentColor
  bocado-icon-foreground.svg camada frente do adaptativo (108, transparente)
  bocado-icon-background.svg camada fundo do adaptativo (108, osso)
  bocado-icon-ios.svg        1024×1024, osso + símbolo, sem cantos
  bocado-lockup.svg          símbolo + "bocado" (fonte por font-family)
  bocado-lockup-mono.svg     idem, currentColor
  bocado-splash.svg          disco inteiro para a abertura, 96×96
docs/design/brand-size-test.png   folha de contato dos testes 3 e 6, pixel 1:1
scripts/measure-launch.sh         mediana de 5 partidas frias, para o §9
```

O mesmo desenho existe uma segunda vez, em `src/components/BrandMark.tsx`, para
a marca poder aparecer dentro do app (24 dp em "Fontes de dados") e na abertura.
Os números são os de §4.2 e estão comentados como espelho do gerador: se um
mudar, os dois mudam.

```
```

Todos são **gerados**: `node scripts/generate-brand-assets.mjs` reescreve os SVGs e
todos os PNG/XML/JSON de Android e iOS a partir da geometria de §4.2;
`--size-test` refaz a folha de contato. Editar um SVG à mão é perder a edição na
próxima rodada — mude o número no script.
