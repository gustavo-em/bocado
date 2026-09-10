# 16 · A confirmação de registro, provada em vídeo

O laço do orquestrador gastou cinco ciclos sem conseguir provar esta tarefa em
tela, e a razão não é o aplicativo. O testador tira quadros com `screencap`, e
cada quadro custa mais tempo do que a animação inteira dura: o ✓ vive ~200 ms
e a chegada da linha ~260 ms. Nenhuma sequência de capturas pega isso de forma
confiável.

Além disso, a build de debug põe o toast "Open debugger to view warnings."
por cima do botão de confirmar (`[20,1239][700,1334]` contra
`[32,1256][688,1352]`) e come o toque. Ele não existe em release.

Gravado com `adb shell screenrecord` numa build **release** no J6, quadros
extraídos a 30 fps.

## O botão

| quadro | o que mostra |
| --- | --- |
| `docs/img/confirmar-transicao.png` | o rótulo "Adicionar · 31 kcal" saindo e o ✓ entrando, botão na caixa comprimida do toque |
| `docs/img/confirmar-check.png` | o ✓ sozinho, em força total, na caixa de 48 dp intacta |

Sem verde e sem Lottie, pelas razões registradas em `docs/DECISIONS.md`: a
paleta tem um acento só, e outra biblioteca de animação está proibida num
aparelho de 2 GB quando o Reanimated que já está no projeto entrega o mesmo.

## A linha chegando

| quadro | o que mostra |
| --- | --- |
| `docs/img/chegada-linha.png` | a entrada "Banana, prata, crua 98" aparecendo enquanto a folha de busca sai |
| `docs/img/chegada-assentada.png` | o dia assentado, com as duas entradas e a linha de sugestões |

## Dois defeitos reais que a tarefa corrigiu, e que nenhuma captura mostraria

1. **A chegada nunca disparava.** A lista re-renderiza atrás da folha, então a
   linha montava com `arrivalIndex` indefinido e o efeito, preso a `entry.id`,
   não rodava quando o índice enfim aparecia. Agora a chegada dispara na
   transição de indefinido para número, com uma ref por entrada para não
   repetir em re-render, swipe ou troca de tema.
2. **O ✓ era invisível na prática.** Ele e a saída da folha dividiam os mesmos
   quadros, e as duas opacidades se multiplicavam: o pico ficava perto de 0,15
   e ia a zero em 120 ms. Agora a folha só começa a sair depois de o ✓ existir
   sozinho na tela.

## O custo, dito com clareza

A folha leva cerca de 400 ms a mais para sair. Isso **não** cai no caminho de
três toques ("Adicionar" na refeição, "+" na linha, "Concluir"), que não abre
folha nenhuma. Cai em quem abre a folha de propósito para ajustar a porção,
que é exatamente quem está esperando uma confirmação.

## Uma observação para o dono

Com a refeição já longa, a entrada nova assenta abaixo da dobra e a animação
não entrega confirmação nenhuma — ela acontece fora da vista. Resolver isso
pede rolar a lista até a entrada nova, o que ficou fora do escopo desta tarefa.
