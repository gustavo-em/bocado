# 05 · Produtos online (Open Food Facts, USDA), registro rápido e fontes de dados

Leia junto: `docs/FOOD_DATA_CONTRACT.md` (inteiro), `docs/research/02-apis-alimentos.md`
(seções B, C, D, E), `docs/specs/02-busca-e-adicao-rapida.md`.

## Trabalho do usuário

Comi algo industrializado (Nutella, iogurte de marca, barrinha) que não está na
tabela brasileira; quero achar o rótulo. E quando não achar nada, quero anotar
só as calorias e seguir em frente.

## Decisões fechadas

### Provedores

- `OpenFoodFactsProvider` e `UsdaProvider` implementam `FoodProvider` em
  `src/data/providers/`, com os mapeamentos exatos do contrato (energia em kJ →
  kcal, sódio em g → mg, Atwater quando faltar energia, `nutriments_estimated`
  ignorado, códigos UPC-A com zero à esquerda). Teste unitário de cada
  mapeamento com os JSONs reais de `docs/research/raw/` (copie os fixtures para
  `__tests__/fixtures/`).
- `User-Agent` obrigatório no Open Food Facts: `<NomeDoApp>/<versão> (<e-mail
  do dono>)` — leia o e-mail de `src/app/config.ts`, nunca hardcode em vários
  lugares.
- Chave USDA: variável de build `USDA_API_KEY` lida de `.env` (gitignored) com
  `DEMO_KEY` como padrão de desenvolvimento; documentar em `.env.example`. Sem
  chave real, o provedor USDA continua funcionando dentro dos limites do
  DEMO_KEY.
- `FoodSearchService` orquestra: local primeiro (sempre), online só com ≥ 3
  caracteres, após 400 ms de debounce, em paralelo, timeout 2,5 s, `AbortSignal`
  amarrado ao campo. Resultados online normalizados, deduplicados contra o local
  (código de barras > nome+marca), gravados em `foods` com `fetched_at`, e
  exibidos no grupo **"Produtos"** abaixo de "Base" sem mover o que já está na
  tela. Locale pt-BR: OFF filtra Brasil e `langs=pt`; USDA só entra quando a
  busca local + OFF devolve menos de 5 itens ou o locale é en-US.
- Cache: TTL 30 dias por produto; busca 24 h por `(source, locale, query)`;
  alimentos referenciados no diário nunca são removidos; LRU acima de 20 MB.

### UI

- Grupo **"Produtos"** com a mesma anatomia de linha; badge `Rótulo`; marca na
  linha 2 antes da porção ("Nestlé · 1 porção (20 g) · 108 kcal"). Cada produto
  do OFF tem, na folha de porção, um link discreto "Ver no Open Food Facts".
- Enquanto busca online: skeleton só depois de 300 ms, com o texto "Procurando
  produtos…" no rodapé do grupo; nunca bloqueia a lista local.
- Offline (`NetInfo` ou falha imediata): banner discreto no topo da lista
  "Sem conexão — mostrando sua base local"; sem retry automático agressivo.
- Sem resultado (local + online): "Nada para 'xyz'." + ações:
  **"Registrar só as calorias"** e "Tentar outra grafia".

### Registro rápido de calorias

- Ação **"Registrar só as calorias"** na linha de utilidades (antes de digitar)
  e no estado sem resultado. Abre a mesma folha de porção em modo rápido: campo
  kcal (obrigatório, teclado numérico), campos opcionais P/C/G em gramas,
  campo "nome" opcional (padrão "Registro rápido"), botão "Adicionar · N kcal".
- Grava como alimento `user:quick-<uuid>` (fonte `user`, `verified=false`) com
  snapshot normal; aparece em "Hoje" como "Registro rápido · 300 kcal" e conta
  nos totais.

### Tela "Fontes de dados"

- Acessível de "Metas" (item **"Fontes de dados e licenças"**). Lista TACO, IBGE,
  Open Food Facts e USDA com os textos exatos de `docs/FOOD_DATA_CONTRACT.md`,
  links tocáveis, e o aviso geral. Sem esta tela a tarefa não passa: é
  obrigação de licença.

### Privacidade

- Nada do cache sai do aparelho. Nenhum identificador do usuário vai nas
  requisições além do `User-Agent` exigido.

### Acessibilidade e temas

- Banner offline com `accessibilityLiveRegion="polite"`; skeleton com label
  "Procurando produtos".

## Fora de escopo

Leitura de código de barras pela câmera (fase 2: `react-native-vision-camera`),
criar alimento completo, enviar produto novo ao OFF, FatSecret, TBCA.

## Evidência esperada no device

O J6 tem Wi-Fi ligado.

1. Buscar "nutella" → grupo "Produtos" com itens do Open Food Facts (badge
   Rótulo, marca na linha 2). Screenshot + árvore.
2. Tocar "+" num produto → adiciona com a porção do rótulo; "Concluir" → em
   "Hoje".
3. Buscar "xyzxyz" → estado sem resultado com "Registrar só as calorias"; tocar
   → folha rápida → digitar 300 → "Adicionar" → "Hoje" mostra "Registro
   rápido · 300 kcal".
4. Abrir "Metas" → "Fontes de dados e licenças" → screenshot com as quatro
   fontes.
5. (Não verificável sem cortar a rede do device: banner offline vira
   observação, não FAIL.)

## Nota de implementação: agrupar pela origem do alimento, não por quem respondeu

Verificação manual no J6 em 2026-09-09, com o aparelho em Wi-Fi validado:
buscar "nutella" **funciona** e devolve "Nutella" (535 kcal/100 g, Ferrero),
"Nutella Ferrero" (542) e "Nutella B-ready" (552), os três com o selo "Rótulo".
A requisição em si é rápida: o endpoint `search.openfoodfacts.org` responde a
essa consulta em menos de um segundo, e o aparelho resolve o host normalmente.

O que está errado é o cabeçalho: os três saem sob **"Base"**, não sob
**"Produtos"**. A causa é que eles já haviam sido gravados em `foods` por uma
busca anterior, então quem os devolveu foi o provedor local — e o agrupamento
hoje decide pela lista de origem (`search.results` vira "Base",
`search.products` vira "Produtos") em vez de decidir pela origem do alimento.

Correção: agrupar por `food.source`. Alimento de marca (`off`, e futuramente
`usda` Branded) pertence a "Produtos" venha ele do cache ou da rede; TACO e
IBGE pertencem a "Base". Assim o mesmo alimento não troca de seção conforme o
cache, e o grupo "Produtos" aparece já na primeira busca repetida.

Implementado em `src/domain/food/grouping.ts` (`isPackagedProduct`,
`groupBySource`, `mergeProductGroups`), aplicado em `AddFoodScreen`: a
resposta local é particionada antes de virar linhas, o grupo "Produtos" recebe
os rótulos vindos do cache seguidos dos que a rede acrescentou, e "Base" só
aparece quando sobra alguma linha de tabela oficial. `usda` conta como rótulo
quando `verified` é falso, que é exatamente o que o mapeador marca para
Branded.

Consequência para a evidência: um FAIL de "grupo Produtos não aparece" só é
defeito de rede se a árvore também não trouxer nenhuma linha com selo "Rótulo".
Com linhas de rótulo presentes sob "Base", o defeito é de agrupamento.

## Nota de implementação: o índice de busca do OFF não traz a porção do rótulo

Verificado ao vivo em 2026-09-09 contra `search.openfoodfacts.org`, pedindo
`serving_size`, `serving_quantity` e `serving_quantity_unit` com os nomes
exatos: os três produtos de "nutella" voltam com os três campos **nulos**. Os
nomes dos campos estão certos; o índice é que não os carrega. Só o endpoint de
produto (`/api/v2/product/{code}`) traz a porção do rótulo.

Consequência aceita para o MVP: um produto vindo da busca abre com a referência
de 100 g. Como esse número já aparece à direita da linha como kcal/100 g,
a linha 2 não o repete — mostra a marca, que é o contexto que falta. Quando o
usuário abre a folha de porção, aí sim vale buscar o produto completo para
oferecer a porção do rótulo (fase 2, junto com o leitor de código de barras).
