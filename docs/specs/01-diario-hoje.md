# 01 · Tela "Hoje" (diário do dia)

Leia junto: `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`, `docs/BRAND.md`,
`docs/research/03-ux-adicionar-alimento.md` (seção 4, dashboard).

## Trabalho do usuário

Abrir o app e, em um olhar, saber quanto ainda pode comer hoje, o que já comeu
em cada refeição, e onde tocar para adicionar. Voltar a qualquer dia anterior e
ver a mesma coisa.

## Decisões fechadas

### Estrutura (um scroll, três níveis)

1. **Faixa de dias** no topo: sete dias da semana corrente em chips horizontais
   (`seg 7 · ter 8 · [qua 9] · …`), o dia selecionado em destaque, hoje marcado
   com um ponto. Deslizar a faixa muda de semana; tocar num dia seleciona.
   Deslizar horizontalmente o conteúdo abaixo também muda o dia (gesto
   secundário; a faixa é o caminho principal). Um botão "Hoje" aparece quando o
   dia selecionado não é o atual e volta para hoje.
2. **Título**: "Hoje" quando o dia é o atual; caso contrário a data por extenso
   curta ("terça, 8 de setembro").
3. **Número-resposta**: kcal restantes em tipografia display (48–56 sp,
   `tabular-nums`), com a linha "restantes · 760 de 2.000 kcal" abaixo. Quando
   o dia está vazio: "2.000" e "disponíveis hoje". Quando passa da meta: "120" e
   "acima da meta · 2.120 de 2.000 kcal" na mesma tinta neutra — **nunca
   vermelho, nunca verde**.
4. **Barra de progresso fina** (não anel) com `accessibilityRole="progressbar"`
   e `accessibilityValue` em texto. Acima da meta, o excedente é desenhado num
   tom mais escuro do mesmo acento, não em cor de erro.
5. **Três barras finas de macro**: Proteína, Carboidratos, Gorduras, cada uma
   com "42 / 120 g". Cores de macro dessaturadas do design system. Fibra não
   aparece aqui.
6. **Quatro seções de refeição**, nesta ordem e com estes nomes: Café da manhã,
   Almoço, Café da tarde, Jantar. Cabeçalho da seção = nome + subtotal em kcal
   à direita + botão **"Adicionar"** (texto, alvo ≥ 48 dp, sempre visível).
   Refeição vazia mostra uma linha discreta de convite (nesta tarefa: texto
   "Nada registrado ainda"; a tarefa 04 troca por chips de sugestão).
7. Itens dentro da refeição (esta tarefa só precisa renderizá-los quando
   existirem no banco — o fluxo de adicionar chega na tarefa 02): nome do
   alimento, porção com os macros na mesma linha ("1 colher de servir · 45 g ·
   P 2 · C 12 · G 0") e kcal à direita em `tabular-nums`. Sem card por item:
   linhas separadas por espaço; a seção se delimita por título e um filete
   fino.
8. **Ação "Metas"** no cabeçalho (ícone + texto "Metas") abre uma tela simples
   com a meta diária de kcal e as metas de macro em gramas, editáveis com
   teclado numérico e salvas ao confirmar. Padrão inicial: 2.000 kcal, proteína
   120 g, carboidratos 250 g, gorduras 65 g. A calculadora de meta vem na tarefa
   06; aqui só a edição manual.
9. Sem tab bar nesta fase: uma tela raiz e navegação por push/modal.

### Dados

- Tabelas `foods`, `foods_fts`, `diary_entries`, `food_usage` conforme
  `docs/ARCHITECTURE.md`, criadas por migração versionada no primeiro `open`.
- Importação do seed (`assets/data/foods.seed.json`) no primeiro lançamento,
  numa transação única, em background, com `seed.version` gravado no MMKV; a
  tela "Hoje" nunca espera o seed (o diário do dia não depende dele).
- Repositório `DiaryRepository` com `entriesForDay(day)`, `totalsForDay(day)`
  (soma dos snapshots de kcal/proteína/carboidrato/gordura) e observação de
  mudanças (evento simples ou reactive query do op-sqlite) para a tela
  atualizar sozinha.
- `day` é o dia civil local em `YYYY-MM-DD`; virada de dia à meia-noite local.
- Metas no MMKV (`goal.kcal`, `goal.protein_g`, `goal.carbs_g`, `goal.fat_g`).

### Estados

- Dia vazio (todas as refeições vazias): número mostra a meta cheia; sem
  ilustração ocupando a tela.
- Dia passado vazio: idem, com a data no título.
- Carregando (primeiro frame antes do banco responder): mantenha o layout com
  os números anteriores ou "—"; nunca spinner de tela cheia.
- Tema claro e escuro.

### Acessibilidade

- Chips de dia com `accessibilityLabel` completo ("terça-feira, 8 de setembro,
  selecionado"); botões "Adicionar" com label "Adicionar em Almoço".
- Contraste AA em todos os textos nos dois temas; alvos ≥ 48 dp.

### Motion (mínimo nesta tarefa; polish na 07)

- Troca de dia: crossfade curto do conteúdo (FADE do vocabulário).
- Número-resposta: atualiza com count-up de 300 ms quando o total muda.

## Fora de escopo

Busca de alimentos, sheet de porção, sugestões, calculadora de meta, gráficos
semanais, exportação, onboarding.

## Evidência esperada no device

- Screenshot de "Hoje" vazio (claro e escuro) mostrando faixa de dias, número
  "2.000", barra, três barras de macro e as quatro refeições com "Adicionar".
- Screenshot após tocar em um dia anterior na faixa: título com a data e botão
  "Hoje" visível.
- Screenshot da tela "Metas" com os quatro campos.
- Árvore de UI confirmando os textos fixos: "Hoje", "Adicionar" (4×), "Metas",
  "Café da manhã", "Almoço", "Café da tarde", "Jantar".
