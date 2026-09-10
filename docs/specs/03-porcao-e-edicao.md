# 03 · Folha de porção, editar e remover entradas

Leia junto: `docs/specs/02-busca-e-adicao-rapida.md`,
`docs/research/03-ux-adicionar-alimento.md` (seções 2.5, 2.6, 4), `docs/DESIGN_SYSTEM.md`.

## Trabalho do usuário

Quando a porção padrão não é a minha, ajustar em segundos com medidas que eu
uso na cozinha (colher, concha, unidade) e ver as calorias mudarem enquanto
ajusto. Depois, corrigir ou apagar algo que registrei errado.

## Decisões fechadas

### Folha de porção (bottom sheet de altura média)

Abre ao tocar no **nome** de um resultado na busca, ao tocar num "✓" já
adicionado, ou ao tocar numa entrada em "Hoje". Implementação: componente de
sheet próprio com Reanimated + Gesture Handler (translateY, scrim parcial,
arrasta para fechar) ou `@gorhom/bottom-sheet` se já estiver no projeto — sem
adicionar biblioteca nova além dessas.

Conteúdo, de cima para baixo:

1. Cabeçalho: nome do alimento (primeira faceta em destaque, resto secundário),
   badge da fonte, e "para Almoço" (a refeição-alvo).
2. **Número grande** (36–44 sp, `tabular-nums`) com a unidade ao lado:
   `1,5  colher de servir`. Tocar no número abre teclado numérico decimal para
   digitar direto. Abaixo, em uma linha, kcal · P · C · G da quantidade atual,
   atualizando ao vivo (count-up de 250 ms; sem animar quando reduced motion).
3. **Chips de medida** (seleção única): as medidas caseiras do alimento, na
   ordem do seed, mais **"g"**. Sem medidas caseiras: só "g" e "porção de
   100 g".
   **Decisão do dono (2026-09-09): gramas a um toque, sempre.** Digitar em
   gramas é caminho principal, não alternativa escondida. O chip **"g"** fica
   **fixo na ponta direita da fila, fora da rolagem horizontal**, visível em
   qualquer alimento por mais medidas caseiras que ele tenha; as medidas
   rolam à esquerda dele. Tocar no número abre o teclado numérico e aceita o
   valor exato (1 g a 5.000 g). A última medida usada por este alimento vem
   selecionada (`food_usage.last_serving_label`); sem histórico, a primeira.
   Se o usuário trocou de "colher de sopa" para "g", o número se converte
   (1 colher de sopa cheia = 25 g → mostra "25" em g).
4. **Stepper − / +** com passo 0,5 para medidas caseiras e 10 para gramas; alvo
   ≥ 48 dp cada; haptic de seleção a cada passo; segurar acelera.
5. Botão primário **"Adicionar · 116 kcal"** (o kcal vive no botão) — ao
   editar uma entrada existente o texto é **"Salvar · 116 kcal"**. Não há botão
   "Cancelar": arrastar para baixo, tocar no scrim ou back fecham sem salvar.
6. Ao confirmar: grava (ou atualiza) a entrada com a porção escolhida, atualiza
   `food_usage.last_grams/last_serving_label/last_serving_count`, fecha a folha,
   e a linha na busca (ou em "Hoje") reflete a porção.

Sem slider. Sem "confiança da porção". Sem trocar a refeição de destino aqui
(fica para a edição em "Hoje", abaixo).

### Bandeja expansível (busca)

- Tocar na bandeja "2 itens · 340 kcal" expande uma lista dos itens desta
  sessão de busca (nome, porção, kcal) com ações "Editar" (abre a folha) e
  "Remover" (com desfazer). "Concluir" continua fechando a tela.

### Editar e remover em "Hoje"

- Tocar numa entrada abre a folha de porção em modo edição ("Salvar").
- Deslizar a entrada para a esquerda revela **"Remover"**; ao remover, snackbar
  "Arroz removido · Desfazer" (4 s). Nada de diálogo "Tem certeza?".
- Na folha em modo edição, uma linha secundária **"Mover para…"** com as quatro
  refeições em chips permite mudar a entrada de refeição.
- Tocar no **cabeçalho da refeição** abre a tela da refeição (nível 2):
  título, subtotal, três barras de macro só daquela refeição, lista completa
  das entradas (mesmas ações de editar/remover) e o botão "Adicionar". É a
  mesma lista, sem acordeão em "Hoje".

### Cálculo

- `gramas = quantidade × gramas_da_medida` (ou `quantidade` quando a unidade é
  g). `kcal = per100g.kcal × gramas / 100`, idem macros; arredondar só na
  exibição (kcal inteiro; macros com uma casa). Teste unitário do cálculo e da
  conversão entre medidas.
- Quantidade mínima 0,25 para medidas e 1 g para gramas; máximo 99 medidas ou
  5.000 g.

### Estados e acessibilidade

- Teclado numérico aberto sobre a folha: a folha sobe para o número continuar
  visível; "Adicionar" permanece acessível.
- Chips com `accessibilityRole="radio"` e estado selecionado; stepper com
  labels "Diminuir quantidade" / "Aumentar quantidade"; número com
  `accessibilityValue`.
- Tema claro e escuro.

### Motion

- Folha entra em 300 ms (emphasized-decelerate) e sai em 200 ms; scrim
  acompanha; reduced motion → crossfade de 120 ms.
- Chip selecionado: 120 ms.

## Fora de escopo

Favoritos, sugestões por histórico, provedores online, criar alimento, receitas,
"salvar refeição".

## Evidência esperada no device

1. Busca "arroz" → tocar no nome do primeiro resultado → screenshot da folha:
   número grande, chips de medida (colher de sopa cheia, colher de servir…, g),
   stepper, botão "Adicionar · N kcal".
2. Tocar "+" do stepper duas vezes → kcal do botão aumenta (árvore de UI com o
   novo texto).
3. Tocar chip "g" → número converte para gramas.
4. "Adicionar" → linha com "✓" e porção nova; "Concluir" → "Hoje" com a entrada.
5. Em "Hoje", tocar na entrada → folha em modo "Salvar"; mover para "Jantar";
   salvar → entrada aparece em Jantar.
6. Deslizar a entrada → "Remover" → snackbar com "Desfazer" → tocar "Desfazer"
   → entrada volta.
7. Tocar no cabeçalho "Jantar" → tela da refeição com subtotal e lista.

## Nota de implementação: o teclado não pode ser descontado duas vezes

Sintoma observado no J6 (ciclo 5): com a folha aberta **sobre a busca** — onde o
teclado está aberto — o botão primário desaparece da árvore de acessibilidade,
embora o toque por coordenada ainda funcione. Sobre "Hoje", sem teclado, o botão
aparece normalmente.

Causa verificada em `src/components/Sheet.tsx`: a altura do teclado entra na
conta duas vezes. O teto usa `window.height − keyboard − insets.top` **e** a
própria folha aplica `paddingBottom: Math.max(insets.bottom, keyboard)`. Com
~300 dp de teclado numa tela de 740 dp, sobram ~116 dp para alça, corpo e
rodapé; o rodapé é espremido para fora dos limites do pai e some do dump do
uiautomator, ainda que continue desenhado.

Correção: descontar o teclado **uma vez só**. Levante a folha pelo contêiner
(preenchimento inferior na raiz que já ocupa a tela inteira) e mantenha na folha
apenas o respiro da área segura quando não há teclado. O teto continua sendo o
espaço acima do teclado.
