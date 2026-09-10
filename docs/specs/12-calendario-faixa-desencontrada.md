# 12 · Dois defeitos do calendário, e a raiz que os dois tinham

**Estado: corrigido e verificado no aparelho em 2026-09-09 11:07.** Este
documento fica como o registro da causa, porque ela já reapareceu duas vezes
por portas diferentes.

Reproduzido no aparelho (Galaxy J6, `52000796031fc56d`) em 2026-09-09 10:32,
sobre o diff do ciclo 3, com adb, sem passar pela coleta. Não foi encontrado
pelos gates porque a coleta só escolheu o dia **8 de setembro**, que já estava
na faixa visível: escolher um dia da mesma semana não exerce o caminho.

## O que acontece

Passos: "Hoje" (9 de setembro selecionado) → tocar no título → seta "Mês
anterior" três vezes até junho → tocar no dia 15 → a folha fecha.

Resultado:

- O título passa a "15 de jun", com `content-desc` "segunda-feira, 15 de
  junho". Correto: 15/06/2026 é segunda.
- O hero, os macros e as quatro refeições passam a mostrar o dia 15 de junho.
  Correto.
- **A faixa de dias mostra 16, 17, 18, 19, 20, 21, 22 de setembro**, e nenhum
  chip aparece selecionado. A semana de 15 de junho não está na tela.

Evidência: `docs/img/defeito-faixa-desencontrada.png` e a árvore de UI.

## Onde a faixa realmente parou

Na árvore de UI os chips se descrevem assim:

```
content-desc="segunda-feira, 16 de setembro"
content-desc="terça-feira, 17 de setembro"
content-desc="quarta-feira, 18 de setembro"
```

Parece rótulo trocado — 16/09/**2026** é quarta-feira, não segunda. Não é:
`formatDayLong` não imprime o ano, e 16/09/**2024** é segunda. A faixa está
mostrando a semana de 16 a 22 de setembro de **2024**, com os nomes todos
corretos.

Essa semana é o **índice 103** de `stripWeeks`, o último item: a semana mais
velha que a faixa alcança, dois anos atrás. O índice pedido foi 12.

## Causa, e por que ela é conhecida

`selectDay(next, true)` chama `strip.current?.scrollToWeek(startOfWeek(next))`
(`TodayScreen.tsx:135`), e o handle faz `weeks.indexOf(weekStart)` seguido de
`list.current?.scrollToIndex({ index })` (`DayStrip.tsx:184-187`).

Para 15 de junho o índice é **12** — doze páginas horizontais que o FlashList
nunca mediu. Invertida e sem medida, a lista não erra por pouco: ela vai parar
no fim, no índice 103. É a mesma classe da spec 09 §1, a que deixou a faixa
vazia — pedir a uma lista horizontal que se posicione num índice cuja página
ela ainda não mediu. Ali a solução foi eliminar a classe (inverter para que a
página desejada fosse o índice 0), e não ajustar o sintoma. O gatilho do
calendário reintroduziu o mesmo pedido por outra porta.

Antes desta tarefa `scrollToWeek` só era chamado com a semana corrente
(`goToToday`) ou com a vizinha (o gesto de arrastar) — índice 0 ou 1, perto o
bastante para a lista já ter medido. O calendário é o primeiro caminho que
salta doze páginas.

## O segundo defeito, da mesma raiz

Perseguindo o primeiro, a folha de mês mostrou o mesmo problema por conta
própria. Tocando a seta "Mês anterior" repetidamente:

- os meses **pulavam**: setembro de 2025 → junho de 2025 → setembro de 2024,
  três toques que deviam andar três meses;
- e ao chegar perto da ponta do intervalo o aplicativo **fechava com erro**:
  `IllegalStateException: addViewAt: failed to insert view [2042] into parent
  [2104] at index 27` em `SurfaceMountingManager.kt:377`.

Reproduzido também com o código exatamente como commitado em `e476013`, antes
de qualquer mudança minha, então é defeito da tarefa e não do conserto. Os
gates não o viram porque a coleta tocou a seta uma vez, e uma vez funciona.

A folha usava `scrollToIndex` no mesmo tipo de lista, por 105 páginas de mês.

## O que foi feito

**A faixa.** A lista que o `DayStrip` recebe passa a **começar na semana do dia
selecionado**: `TodayScreen` fatia `newestFirst` a partir da âncora, e a semana
que precisa aparecer é o índice 0. O único deslocamento que a faixa pede é
`scrollToOffset({ offset: 0 })`, que não depende de página medida nenhuma.
`scrollToWeek`, o `DayStripHandle` e o `ref` saíram.

Foi preciso também desligar o `maintainVisibleContentPosition` do FlashList: o
padrão é manter na tela a página que já estava visível quando os dados mudam, o
que segurava a semana antiga e desfazia a ancoragem — "Voltar para hoje"
deixava a faixa em 22–28 de junho.

Duas tentativas anteriores falharam no aparelho e estão registradas em
comentário no código para ninguém repeti-las: remontar a lista com `key`
quebra a montagem (`addViewAt`), e `initialScrollIndex` é aplicado pelo
FlashList como um deslocamento adiado, ou seja, o mesmo caminho que falha.

**A folha de mês.** O pager horizontal saiu inteiro. A folha desenha **um mês
por vez**, com o mês em estado e as setas mexendo nesse estado, presas ao
intervalo por `clampMonth`. Nada no brief pedia arrastar entre meses, e a
grade de um mês só não tem como pular nem como quebrar a montagem.

## Verificado no aparelho (J6, 2026-09-09 11:07)

1. Escolher 15 de junho pela folha: título "15 de jun" e faixa em
   **seg 15 … dom 21 de junho** com o 15 marcado, sem tocar na tela depois.
2. "Voltar para hoje": faixa de volta em 7–13 de setembro com o 9 marcado.
3. Arrastar a faixa: 31 de agosto–6 de setembro e de volta, nos dois sentidos.
4. Tocar num chip de uma semana passada: seleciona sem a faixa saltar.
5. Arrastar o conteúdo três dias para trás cruzando a semana: título
   "30 de ago" e a faixa reancorada em 24–30 de agosto.
6. Setas do calendário: três toques andam exatamente três meses, e paginar até
   setembro de 2024 chega à ponta com a seta desabilitada, **sem fechar**.

`npm run validate` verde, 296 testes.

## O que a faixa deixou de fazer

Arrastar a faixa só anda para o passado a partir da semana selecionada, porque
essa semana é o começo dos dados. É o mesmo alcance de antes da tarefa 12,
quando a âncora era sempre a semana de hoje. Para voltar, o atalho "Hoje" no
cabeçalho aparece sempre que o dia não é hoje.
