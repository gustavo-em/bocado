# 17 · Compartilhar, provado ponta a ponta

O laço do orquestrador chegou ao limite de ciclos com o código aprovado em
revisão e as três linhas verificadas na árvore, mas sem nunca capturar o
seletor do Android. A causa foi encontrada no ciclo 4 e **não era o
aplicativo**: o watchdog do coletor religa o aplicativo depois de qualquer
passo em que ele não esteja em primeiro plano — inclusive o toque que abre o
seletor, apagando a prova antes da captura. O driver ganhou a marca opt-in
`keepForeign` por causa disso.

Fechado aqui, à mão, numa build release no J6.

## O caminho inteiro

| evidência | o que prova |
| --- | --- |
| `docs/img/compartilhar-seletor.png` | o seletor do Android de pé, com "1 item" e a miniatura da imagem — `android:id/chooser_header`, `resolver_list` e `sem_chooser_preview_icon` na árvore |
| `docs/img/compartilhar-dia.png` | a peça do dia como ela sai: 1080 × 1350, marca, data por extenso, kcal do dia, os três macros com barra e as refeições com seus itens |
| `docs/img/compartilhar-mes.png` | a peça do mês: grade do mês, kcal por dia com a barra de proporção de macros, e o resumo embaixo |

Os dois PNG foram puxados do `cacheDir/share` do próprio aplicativo, não
recriados: são exatamente os bytes que o seletor entrega.

## Um defeito de texto, corrigido aqui

A peça do mês dizia **"99 kcal em 1 dias registrados"**. Isto sai do telefone e
é lido por outra pessoa, então a concordância importa: `share.monthTotalOne`
entrou nas duas tabelas de idioma e `ShareMonthCard` escolhe a forma pelo
número. Coberto por teste contra as duas tabelas, para não voltar.

## O que fica como observação para o dono

Num dia com pouca coisa registrada, a metade de baixo da peça do dia fica
vazia — a imagem tem altura fixa e o conteúdo é o que o dia tem. Não é
defeito; é uma escolha a rever se a peça passar a ser usada com dias magros.
