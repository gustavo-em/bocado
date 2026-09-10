# 15 · O que a abertura animada custa

Medido pelo dono, fora do laço do orquestrador, porque nenhum agente dele podia
fazê-lo: o implementador é proibido de rodar ADB e Gradle, e o testador de tela
não constrói dois commits.

## Como

- Aparelho: Galaxy J6 (SM-J600GT), Android 10, `52000796031fc56d`.
- `scripts/measure-launch.sh`, 5 partidas frias por rodada, `am start -W -S`
  com `force-stop` antes de cada uma.
- **Variante release nos dois lados**, `-PreactNativeArchitectures=armeabi-v7a`.
- **Instalações intercaladas**, alternando os dois APKs a cada rodada, para a
  deriva térmica e o ART não caírem de um lado só.
- Antes: `c27ed40`. Depois: esta árvore.

## Medianas de `TotalTime`

| rodada | antes (`c27ed40`) | depois |
| --- | --- | --- |
| 1 | 560 ms | 533 ms |
| 2 | 543 ms | 529 ms |
| 3 | 516 ms | 532 ms |
| **mediana** | **543 ms** | **532 ms** |

Quinze partidas frias de cada lado. O "depois" cai **dentro** da faixa do
"antes" (516–560 ms), e a mediana fica 11 ms mais baixa — ou seja, abaixo do
ruído do próprio aparelho. **A abertura animada não custa tempo de arranque.**

O teto que a tarefa fixou era 100 ms. Passa com folga.

## Duas armadilhas, para quem repetir

1. **Não meça em debug.** O debug espera o bundler e dá ~3.200 ms, seis vezes o
   número real. Ele serve para comparar duas árvores entre si, nunca para dizer
   quanto o aplicativo demora a abrir.
2. **Não meça em série.** Rodar todas as medições de um lado e depois as do
   outro produziu, nesta mesma tarefa, um falso +30 ms que era deriva térmica.
   Só a intercalação separa custo de deriva.

## O que ficou provado em tela

A mordida existe e foi capturada em release, onde a janela não espera o
bundler: o primeiro quadro traz o disco inteiro e, poucos quadros depois, o
disco mordido com o bocado saindo — `docs/img/abertura-disco.png` e
`docs/img/abertura-mordida.png`.
