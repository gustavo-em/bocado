# Decisões

Onze escolhas que explicam por que o Bocado é assim, e não do jeito mais óbvio.
Cada uma traz o motivo e o custo aceito. Decisão sem custo declarado é
propaganda, não decisão.

## 1. A base brasileira é embarcada, e é ela o produto

TACO e IBGE POF entram no aplicativo como um arquivo de 2.319 alimentos
importado para o SQLite na primeira abertura. Isso responde offline, em menos
de 50 ms, e traz o que nenhum concorrente grande tem: as medidas caseiras em
gramas da POF, com colher de servir, concha e unidade de pão francês.

**Custo:** o arquivo pesa cerca de 780 KB e envelhece junto com as tabelas, que
são de 2011.

## 2. O Open Food Facts nunca é embarcado

A licença deles é ODbL, com cláusula de contaminação. Consultar e guardar cache
privado do usuário é obra produzida e pede só atribuição; distribuir um extrato
dentro do aplicativo faria o banco embarcado virar obra derivada, obrigando a
publicá-lo sob a mesma licença.

**Custo:** produto de marca precisa de rede na primeira vez. Depois fica em
cache para sempre.

## 3. A TBCA ficou de fora, apesar de ser maior

Cinco mil e novecentos alimentos contra os 597 da TACO, e mesmo assim fora: a
licença é CC BY-NC-ND, que proíbe uso comercial. O aplicativo é para ser
vendido.

**Custo:** menos alimentos. Preferimos poder vender.

## 4. Um contrato entre o aplicativo e qualquer fonte de dados

Tudo vira `NormalizedFood` antes de tocar a interface, e cada fonte implementa
`FoodProvider`. Trocar, acrescentar ou remover uma fonte mexe em um arquivo.

**Custo:** uma camada de tradução por fonte, com testes contra respostas reais.

## 5. Grava no toque, com desfazer, em vez de confirmar antes

O "+" escreve a entrada imediatamente e mostra desfazer por quatro segundos.
Diálogo de confirmação vira hábito e deixa de ser lido; desfazer não.

**Custo:** a escrita acontece antes de o usuário ter certeza, então o caminho
de remoção precisa ser sólido — e por isso ele também é transacional.

## 6. Sem conta, sem anúncio, sem paywall

O primeiro uso são três telas puláveis e nunca pede e-mail. A meta é calculada
no aparelho.

**Custo:** sem backup e sem trocar de aparelho até existir exportação.

## 7. O aplicativo nunca culpa quem usa

Passar da meta é informação em tinta neutra. Vermelho e verde estão reservados
e proibidos no painel do dia. Não há sequência de dias nem lembrete.

**Custo:** abre mão da alavanca de engajamento que a concorrência usa. É
proposital: a pesquisa associa esse tipo de pressão a abandono e a obsessão.

## 8. Um aparelho fraco é o juiz — o juiz trocou em 2026-09-10

**Era:** tudo era medido num Galaxy J6 de 2 GB, Android 10, 360 dp,
armeabi-v7a. Foi ele que provou as tarefas 01 a 17.

**É:** um Galaxy M53, Android 14, 384 dp, arm64. A troca é do dono; o que
segue vale para não perder o que o J6 tinha ensinado.

O que **não** muda por causa da troca, e por quê:

- **As proibições continuam.** Nada de animação de layout, desfoque, sombra em
  lista ou imagem de alimento; lista reciclada continua obrigatória. Elas
  foram justificadas por medição num aparelho de 2 GB, e o M53 é rápido demais
  para reprovar qualquer uma delas. Sem juiz que as cobre, a regra é que as
  segura — remover uma exige medir num aparelho fraco de novo, não achar que
  ficou fluido aqui.
- **As contas de largura continuam em 360 dp.** A coluna de 46 dp para kcal, os
  87% de nomes inteiros, a célula de 48 dp do calendário e o corte do rótulo de
  medida caseira foram medidos em 360 dp. O M53 tem 384 dp e sobra espaço, o
  que torna essas medidas o caso apertado, não o caso comum. Projete para 360.

O que a troca **ganha**, e que o J6 não conseguia mostrar:

- O caminho de abertura da SplashScreen API do Android 12+ (`values-v31`) passa
  a ser exercitável de verdade; no J6 ele existia só no arquivo.
- O modo noturno do sistema não é mais travado, então "Tema · Sistema" pode
  enfim ser visto seguindo o aparelho nos dois sentidos.

**Custo:** o aplicativo deixa de ter alguém medindo 2 GB. Esse é o risco real
da troca, e está escrito aqui para não virar surpresa.

## 9. Macro é dado de linha, na linha que já existia — revertida em 2026-09-09

**Era:** os macros apareciam somados no dia, somados na refeição e na folha de
porção, e nunca por item; quem pensava em macro pagava um toque.

**É:** os três macros voltam à entrada do diário, abreviados no fim da linha da
porção — `100 g · P 3 · C 28 · G 0` —, em "Hoje" e na tela da refeição. O dono
não quer tocar no item para saber quanto de proteína e carboidrato tem.

O que a medição de então proibiu continua proibido, e é por isso que a forma é
esta: nada de terceira linha (levava a entrada de 64 para 72 dp e comia uma
entrada de tela no J6), nada de macros à direita ao lado das kcal (derrubava de
87% para 44% os nomes inteiros em 360 dp) e nada de cor (ΔE00 3,0 entre
proteína e gordura sob deuteranopia). A linha 2 tinha 236,7 dp livres; os
macros ocupam 103,8 deles. Medidas em `docs/research/06-macros-na-linha.md`.

**Custo:** a linha da porção fica cheia — no caso de medida caseira a 1,3× o
rótulo da colher trunca ("1 colher de…") para o grama e os macros sobreviverem
inteiros; é o que obriga a linha a ser três `Text` e não um —, e os gramas viram
inteiros no pixel (0,2 g imprime `G 0`). A precisão fica na folha de porção e
no leitor de tela, que continua dizendo os três por extenso, com decimal.

## 10. O orquestrador constrói, mas quem aprova é o aparelho

Cada tarefa passa por planejamento, implementação, revisão de código, captura
no aparelho e auditoria de interface, e só é commitada quando a evidência da
tela concorda com o relato. Auto-relato de agente não é evidência.

**Custo:** ciclos gastos perseguindo achados que às vezes eram falha de coleta,
não do aplicativo. Ainda assim mais barato que um defeito descoberto na loja.

## 11. Uma unidade, uma forma: kcal é sempre Inter tabular

O subtotal do cabeçalho de refeição era Fraunces 24 e as kcal de uma entrada
são Inter 16 tabular. Mesma unidade, duas letras, a poucos dp de distância — o
número sob "Adicionar" era lido como título, não como caloria. O subtotal passa
a `body` Inter 16 `tabular-nums`, idêntico às kcal da entrada. A Fraunces fica
onde há **uma** resposta por tela: hero do dia, quantidade da folha, total da
tela da refeição.

**Custo:** o dia perde textura na rolagem — quatro números serifados grandes
davam ritmo — e o papel `displaySmall` ficou sem uso (removido da escala em
2026-09-10; ver decisão 12). Em troca, ninguém precisa aprender que dois
desenhos são a mesma coisa.

## 12. O acento marca fazer; a ação de cada refeição é um anel em tinta

Em 2026-09-10, no aparelho, o dono leu duas coisas: que "a fonte do número de
calorias está estranha" e que "o botão azul de adicionar é o único contraste do
app inteiro".

O primeiro não era a família tipográfica — a decisão 11 fica de pé. Era falta de
hierarquia e falta de coluna: o subtotal do cabeçalho ("301") e a kcal da
entrada ("300") tinham desenho idêntico a 90 dp de distância, e o subtotal ainda
flutuava no eixo x, porque vinha com `marginLeft` depois de um nome de largura
variável. O subtotal passa a `bodyMedium` (Inter Medium 16 tabular, `ink`, sem
unidade) numa coluna fixa de 46 dp alinhada à direita — a mesma largura da
coluna de kcal das entradas. Mesma família, mesmo corpo, um peso acima, porque é
soma. Os quatro subtotais passam a terminar na mesma x.

O segundo não era o azul: era a repetição. Quatro acentos idênticos numa tela
destroem a raridade que faz o índigo ser encontrado sem procurar. O texto
"Adicionar" em `accent` vira o **anel "+"** de §2.4 (alvo 48 × 48, anel 36 dp,
borda 1,5 dp em `inkSubtle`, `plus` 24 em `ink`), no cabeçalho e no cabeçalho da
tela da refeição. A regra do acento passa a ser: **o acento marca fazer, e uma
tela pode ter zero papéis de ação**. Em "Hoje" ele fica só no papel de estado
(barra e ponto do dia); o acento de ação continua no "+"→"✓" da busca, no
`PrimaryButton` da folha e no "Concluir" da bandeja.

O anel do cabeçalho **nunca preenche em `accent` e nunca vira "✓"**: na busca o
anel é por alimento e confirma uma gravação; no cabeçalho é por refeição e abre
a busca.

**Recusado:** pílula contornada (nasceria igual aos chips de sugestão, 8 dp
abaixo, no mesmo bloco); texto "Adicionar" em `ink` (§2.2 reserva tinta de texto
para navegação, e a ação sumiria dentro do cabeçalho); quatro botões preenchidos
em `ink`/`inverseSurface` (gritam mais que o hero). O papel `displaySmall`
(Fraunces 24) foi removido da escala em vez de ficar reservado: sem uso desde a
decisão 11, só convidava a voltar.

**Linha vazia:** com o anel, o convite de uma refeição sem registros fica no
glifo. "Nada registrado ainda" continua **texto, não alvo** — duas maneiras de
abrir a mesma busca na mesma seção não pagam a ambiguidade, e o anel já tem
48 dp a 36 dp dali. Se uma captura de um dia vazio mostrar convite fraco, a
linha inteira vira alvo **nas quatro refeições**, nunca em uma só.

**Custo:** o rótulo "Adicionar" sai da tela e vive no `accessibilityLabel`
("Adicionar em Café da manhã"); quem não conhece o "+" perde a palavra. Em
troca, o cabeçalho devolve ~97 dp ao nome da refeição e a margem direita da
tela vira uma coluna só.

## 13. O macro só compara em coluna, e a coluna vem da margem direita

Decidido em 2026-09-10, com o dono olhando o diário: "está ali P C G, só que só
a letra e o número não está muito bom… quero comparar quantos gramas de
proteína eu comi em cada alimento… uma tabela, ou pelo menos de uma forma mais
bonita, ao lado das calorias."

A decisão 9 (e o estudo 06) puseram os macros na linha 2 e resolveram o custo de
altura, mas o bloco começava **depois** da porção, que mede de 36,8 a 146,7 dp.
O `P` nascia num x diferente a cada entrada, então a comparação entre linhas não
existia. Nenhum tamanho de célula conserta isso: **a coluna só existe se o bloco
for ancorado na margem direita**, que é a regra que §1.2 já impunha aos números.

A linha 2 deixa de morar na caixa de 270 dp do nome e passa a ocupar os 328 dp
da entrada: `[porção][12][bloco 152]`. O bloco são três células iguais de 40 dp
(rótulo 10 + 4 + valor 26 alinhado à direita, `tabular-nums`), **16 dp** entre
elas — o dobro do vão interno, senão um número de um dígito, alinhado à direita,
gruda no rótulo da coluna seguinte e `P 3 C 28` se lê "3 C" (captura
`refeicao-colunas`, 2026-09-10) —, crescendo com o texto até 1,3× (197,6 dp). A
borda direita do bloco cai no mesmo
x da coluna de kcal: a lista termina numa borda só, nas duas linhas. A linha 1
não muda, então os 87,0% de nomes inteiros do estudo 06 §3 continuam de pé.

O `·` sai de dentro do bloco — a coluna é que junta — e fica só entre medida
caseira e gramas. Macro que a fonte nunca declarou imprime **célula vazia**,
nunca um zero, mantendo os 40 dp para a coluna das linhas vizinhas não andar;
registro rápido segue sem bloco. A fala não muda: a entrada continua sendo um
nó só, com os três macros por extenso e com decimal, depois das calorias.

**Efeito colateral bom:** a porção ganha 164 dp a 1,0× e `1 colher de servir ·
45 g` (146,7 dp) **para de truncar**. A 1,3× sobram 118,4 dp e a colher trunca,
como já truncava.

**Recusado:** tabela com cabeçalho e filete (24 dp por refeição de 1 a 6 itens,
para repetir três letras, contra §2.5 que separa entradas só por espaço); cor
por macro (ΔE00 3,0 entre `protein` e `fat`); terceira linha (72 dp); macros na
linha 1 (nomes inteiros caem para 44%); ordenar ou realçar por macro na
`MealScreen` (controle + estado persistido + rótulo novo); rodapé de total na
`MealScreen` (as barras de §2.9 já são o total); célula elástica (a largura
mudaria por linha e as colunas voltariam a andar).

**Custo aceito:** o vão entre a porção e o bloco varia de ~12 a ~155 dp dentro
da mesma refeição — porção curta abre buraco. É o preço da comparação, e o
julgamento é da captura no J6. **Plano B**, só se a captura mostrar o `G 0`
sendo lido como uma segunda caloria sob o kcal: o bloco recua 58 dp e termina na
borda do nome, com a captura citada aqui e no estudo 07.

## 14. O micro é do dia, não do item — e vitamina nenhuma

O dono pediu, em 2026-09-10, uma de duas coisas: (a) um campo que abre com uma
setinha na hora de adicionar um alimento, com as vitaminas; ou (b) uma seção
embaixo das refeições, do mesmo jeito que as barras de carboidratos, proteínas
e gorduras. O ponto de partida do pedido não valia: o aplicativo **não buscava
vitamina nenhuma**. `Per100g` tinha kcal, macros, fibra, açúcar, sódio e gordura
saturada, e nada mais.

**(a) recusado.** A folha de porção é o caminho mais rápido do aplicativo e tem
de continuar sendo uma decisão só: quantos gramas, em qual refeição. Micro por
item não responde pergunta nenhuma — ninguém tem meta de magnésio por colherada,
e o número por 100 g de um item isolado não se compara com nada. A alternativa,
se o dado por alimento voltar a ser pedido: **uma tela de detalhe do alimento,
aberta da busca** (não da folha), depois de um mês de uso mostrando que a
pergunta existe. A folha não ganha controle novo.

**(b) aceito, com adaptação.** O bloco entra no lugar que o dono pediu — depois
da última refeição —, mas como **grade de 2 × 3** (fibra, cálcio, ferro,
magnésio, potássio, zinco) mais uma linha de sódio sob o rótulo "Limites", e não
como sete linhas de 72 dp, que empurrariam o fim do dia para longe demais. Todas
as barras em `ink`: seis barras índigo matariam o acento único da tela, e as
cores de macro dariam a três minerais um significado que elas já têm no hero.
Sódio é separado pela **palavra**, porque cor não pode carregar esse sentido
sozinha. Nenhum percentual, em lugar nenhum: "8,4 de 14 mg" diz o que %VD
esconde. Chave em Metas → Exibição, **desligada** por padrão.

**Vitaminas ficam fora.** A pesquisa 05 §6 mediu direto em `data/raw/TACO.json`:
os cinco minerais têm 97,3–97,8% de cobertura na TACO e 98,9% entre os 113
alimentos que o aplicativo empurra; vitamina A tem **28,4%** nesses mesmos 113 e
21,6% nos 54 starters. Um painel com vitamina A mostraria "sem dado" em quatro
de cada cinco itens do dia. Isso não é dado parcial honesto, é tela quebrada com
pedido de desculpas.

**Total do dia por junção, não por snapshot.** As duas opções eram gravar os
valores na entrada (colunas novas em `diary_entries`, como kcal e macros já
fazem) ou somar por junção com `foods` pela quantidade da entrada. Escolhida a
**junção**: `ENTRIES_FOR_DAY` já fazia `JOIN foods` para o nome, então as sete
colunas custam zero consulta nova, zero caminho de escrita novo e zero migração
em `diary_entries` — e fibra e sódio, que nunca foram snapshot, passam a ser
lidos do mesmo jeito que os minerais, em vez de por dois caminhos diferentes.
**Custo aceito:** um dia passado passa a refletir a tabela de hoje; se uma
correção da TACO mudar o ferro do feijão, o ferro de terça-feira muda junto. Para
kcal e macros isso seria inaceitável (a meta do dia é um contrato com o usuário);
para um número informativo, sem meta editável, é o preço certo pela simplicidade.
Se algum dia o micro ganhar meta própria, a decisão se reabre e vira snapshot.

**NULL nunca é zero.** As cinco colunas entram anuláveis e **sem `DEFAULT 0`**.
Produto do Open Food Facts não traz mineral (a RDC 429/2020 só obriga energia,
carboidratos, açúcares, proteínas, gorduras, fibra e sódio), e `user:quick-*` não
traz nutriente nenhum: os dois contam no **denominador** da linha de cobertura e
ficam fora da soma. Célula sem nenhum contribuinte mostra "sem dado", com trilho
vazio, e desce para o fim da grade.

**A tela empurrada "Nutrientes" da pesquisa 05 §6 não entra**, nem a `ActionRow`
que levaria a ela: a grade em linha a substitui, e duas superfícies para o mesmo
dado seria uma a mais.
