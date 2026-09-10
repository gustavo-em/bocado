# 06 · Metas, calculadora e primeiro uso (sem conta)

Leia junto: `docs/research/03-ux-adicionar-alimento.md` (seções 6 e 7),
`docs/research/01-concorrentes.md` (onboarding e paywall), `docs/DESIGN_SYSTEM.md`.

## Trabalho do usuário

Na primeira abertura, chegar ao diário em menos de um minuto com uma meta que
faça sentido para mim — sem criar conta, sem e-mail, sem quiz de dez telas — e
poder mudar tudo depois.

## Decisões fechadas

### Primeiro uso (três telas, todas puláveis)

1. **"O que você quer?"** — três botões grandes: **Perder peso**, **Manter**,
   **Ganhar massa**. Selecionar avança. Texto de apoio de uma linha.
2. **"Só o necessário para calcular"** — sexo (dois segmentos: Feminino /
   Masculino), idade, altura (cm), peso (kg) com valores padrão preenchidos
   (30 anos, 170 cm, 70 kg) editáveis por stepper ou teclado numérico; atividade
   em quatro chips: Sedentário (1,2) · Leve (1,375) · Moderado (1,55) ·
   Intenso (1,725). Botão **"Calcular"** e link **"Pular"**.
3. **"Sua meta: 1.850 kcal"** — número grande, editável no lugar (tocar abre
   teclado); linha expansível "Como calculamos" com a fórmula em uma frase;
   macros sugeridos (proteína 1,6 g/kg; gordura 25% das kcal; carboidratos o
   restante) em três linhas editáveis; botão **"Começar"**.

- Fórmula (`src/domain/goals/mifflin.ts`, com teste unitário): Mifflin-St Jeor
  — homens `10·kg + 6,25·cm − 5·anos + 5`; mulheres `… − 161`; × fator de
  atividade; −500 kcal para perder, +300 para ganhar; piso 1.200 (F) / 1.500 (M)
  com aviso curto quando o piso for aplicado. Arredondar para múltiplo de 10.
- **"Pular"** em qualquer tela → meta 2.000 kcal / 120 / 250 / 65 g, marca
  `goal.estimated = true` e mostra em "Metas" a nota "meta padrão — ajuste
  quando quiser".
- `onboarding.done = true` no MMKV ao terminar ou pular; nunca reaparece.
  Reset de dados do app (pm clear) volta ao primeiro uso.
- Sem conta, sem e-mail, sem permissão, sem pedido de avaliação, sem paywall.

### Tela "Metas" (a partir de "Hoje")

Reorganize a tela criada na tarefa 01:

- **Meta diária**: kcal (número grande editável) e as três metas de macro em
  gramas com a porcentagem calculada ao lado. Botão **"Recalcular"** reabre a
  tela 2 do primeiro uso com os valores atuais preenchidos.
- **Exibição**: alternância "Mostrar no diário: **restantes** / consumidas"
  (padrão restantes). Quando "consumidas", o número-resposta de "Hoje" passa a
  ser o total comido e a linha abaixo "de 2.000 kcal".
- **Preferências**: idioma (Sistema / Português / English), vibração ao
  registrar (liga/desliga), "Limpar sugestões" (tarefa 04).
- **Dados**: "Fontes de dados e licenças" (tarefa 05), versão do app.
- Tudo salva ao sair do campo; sem botão "Salvar" global.

### Copy

- Tom calmo, direto, sem culpa e sem "parabéns". Todas as strings em
  `src/i18n/pt-BR.ts` e `en-US.ts`.
- Textos fixos (o tester navega por eles): "Perder peso", "Manter", "Ganhar
  massa", "Calcular", "Pular", "Começar", "Metas", "Recalcular".

### Acessibilidade

- Segmentos e chips com `accessibilityRole` e estado; steppers com labels;
  o número da meta com `accessibilityValue`.

### Motion

- Transição entre as três telas com slide curto (SLIDE); número da meta com
  count-up ao ser calculado.

## Fora de escopo

Peso corporal ao longo do tempo, água, exercício, lembretes, conta/backup,
integrações de saúde.

## Evidência esperada no device

Esta tarefa roda com o device **limpo** (`pm clear`) para reproduzir o primeiro
uso.

1. Abertura → tela "O que você quer?" (screenshot).
2. Tocar "Perder peso" → tela de dados com padrões preenchidos (screenshot).
3. Tocar "Calcular" → "Sua meta: N kcal" com N coerente (para os padrões
   femininos: 30 anos, 170 cm, 70 kg, sedentária, perder → ≈ 1.180 → piso
   1.200 com aviso; masculino → ≈ 1.380). O tester confere o número na árvore.
4. "Começar" → "Hoje" com o número-resposta igual à meta.
5. "Metas" → screenshot com meta, macros, alternância restantes/consumidas;
   alternar → "Hoje" mostra consumidas.
6. Reabrir o app → não mostra o primeiro uso de novo.
