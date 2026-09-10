# 08 · Qualidade final, testes e README

Sem device. Esta tarefa roda com `--no-screen-test`.

## Objetivo

Deixar o repositório no estado em que o dono pode abrir de manhã, entender o
produto em trinta segundos, rodar `npm run validate` verde e instalar no
aparelho com um comando.

## Decisões fechadas

### Testes

- Cobertura de domínio obrigatória (jest, sem device): cálculo de porção e
  conversão de medidas; totais do dia; Mifflin-St Jeor e pisos; score de
  sugestões (com fixture de 2.000 entradas, < 30 ms); ranking de busca
  ("arroz", "pao", "cafe com leite" na primeira posição); mapeadores Open Food
  Facts e USDA com fixtures reais; importação do seed (contagem e invariantes
  do contrato: uma porção padrão, 100 g no fim, macros ≤ 105 g).
- Um teste de renderização por tela principal (Hoje, Buscar, Porção, Metas)
  com `react-test-renderer`, apenas para garantir que montam com o tema e a
  i18n sem crash.

### Código

- `npm run validate` (prettier, eslint, tsc, jest) verde; zero `any` novo;
  nenhum `console.log`; nenhuma string solta fora de `src/i18n`.
- Remover código morto, TODOs resolvidos, dependências não usadas.
- `.env.example` com `USDA_API_KEY`; `.gitignore` cobre `.env`, o bundle JS
  gerado em `android/app/src/main/assets/` e os `drawable-*` gerados pelo
  bundling.

### README (em inglês, peça de portfólio)

Estrutura:

1. Nome + uma frase do produto + três screenshots (Hoje, Buscar, Porção) em
   `docs/img/` capturados do J6 pelo tester nas tarefas anteriores (copie os
   PNGs mais recentes de `runs/*/artifacts` para `docs/img/` e referencie).
2. "Why" — a tese em um parágrafo: registrar em três toques, base brasileira
   oficial offline, sem conta, sem anúncio.
3. "How it works" — arquitetura em dez linhas + o contrato de dados (link para
   `docs/FOOD_DATA_CONTRACT.md`).
4. "Data sources & licenses" — as quatro fontes com atribuição.
5. "Run it" — pré-requisitos, `npm install`, `npm run android`, `npm run
   validate`, `node scripts/build-food-seed.mjs`.
6. "Roadmap" — barcode, receitas, en-US foods, backup.

### Docs

- `docs/ARCHITECTURE.md` atualizado com o que foi realmente construído (rotas,
  tabelas, provedores). `docs/DECISIONS.md` com dez decisões e o porquê
  (bullets curtos).

## Fora de escopo

Qualquer mudança de comportamento ou visual.

## Evidência esperada

Saída de `npm run validate` verde no summary; lista de testes adicionados;
README renderizável (sem links quebrados: verificar com `rg "\]\(" README.md`
e conferir existência dos arquivos).
