# 04 — Nome e Marca

Pesquisa de naming e mapa de identidade visual dos concorrentes.
App premium de contagem de calorias / registro alimentar. Brasil primeiro (pt-BR + en-US), venda internacional depois.
Diferencial: bonito, calmo, simples, registro RÁPIDO.

Data da pesquisa: 2026-09-08.

**Método**: busca web + consulta direta à iTunes Search API (`itunes.apple.com/search`) nas lojas BR e US, filtrando por categorias Health & Fitness / Food & Drink / Medical / Lifestyle; checagem de delegação DNS (`dig NS`/`dig A`) para inferir se o domínio está registrado; extração programática das cores dominantes dos ícones dos concorrentes a partir dos artworks 512px da App Store.

---

## 1. Tabela de candidatos com veredito

### 1.1 Candidatos originais

| Nome | Apps com mesmo nome em Health & Fitness / Food | Outras colisões notáveis | Domínio | Risco de pronúncia | Significado PT / EN / ES | Veredito |
|---|---|---|---|---|---|---|
| **Prato** | **Prato AI** (Prato AI Inc., H&F, iOS BR + Google Play — *literalmente um contador de calorias*), **Prato Seguro** (H&F), **Meu Prato IA** (H&F), **Olho no Prato: Conte Calorias** (H&F), Prato Digital (Food & Drink), Prato Feito (Lifestyle), Prato do Dia (Food & Drink), Do Pasto ao Prato, Caça ao Prato (Games) | Prato = cidade e província da Toscana (polui 100% da busca internacional); Padel Prato, Taxi Prato, Teatro Metastasio di Prato, Prato Capital, Ouro e Prata / Rede Prata / Gulê Pratas (BR, "prata"≠"prato" mas confunde busca) | `prato.app` estacionado na Afternic (à venda); `prato.com` ocupado por empresa italiana | Baixo em PT/ES; médio em EN ("PRAH-toh") | PT: prato (louça/refeição) — substantivo genérico e descritivo. ES: "prato" não existe ("plato"). EN: sem significado | **OCUPADO** |
| **Bocado** | **Bocado** (LABERIT SISTEMAS, Food & Drink) — **único no mundo**, e Health & Fitness está totalmente livre | Restaurantes Bocado (EUA/Espanha) — classe 43, não classe 9/42 | `bocado.app` **sem DNS → provavelmente livre**; `bocado.com` ocupado | Baixo em PT/ES; baixo em EN (padrão "avocado/aficionado") | PT: um bocado = uma mordida/porção pequena. ES: idêntico e positivo. EN: exótico-premium, sem significado ruim. Atenção: em PT "um bocado" também = "bastante" | **LIVRE** |
| **Saldo** | Nenhum em H&F/Food | Saturado em Finance/Business: Saldo Bank UAB (banco licenciado UE), Saldo Apps Inc., Saldo.mx, Saldo Positivo, Saldo 365, Mi Saldo, ~14 apps | `saldo.app` registrado e ativo | Baixo | PT/ES: saldo bancário — campo semântico errado, frio e burocrático | **ARRISCADO** (livre na categoria, péssimo posicionamento) |
| **Kalo** | **13+ contadores de calorias**: Kalo – AI Calorie Tracking (Kalo Health Ltd), Kalo: Macro & Calorie Counter, KALO – Calorie Counter, Kalo – AI Calorie Tracker, Kalo (Speakz Media), Kalo: Calorie & Macros Tracker, Hey Kalo, AI Calorie Tracker – Kalo, Kalo: AI Macro Tracker, KaloCam, Kalo: Tell kalorier enkelt, KALO Fitness, Kalos Health | Kalo Hospitality (Food & Drink) | `kalo.app` registrado (GoDaddy, sem A); `kalo.com` ocupado | Baixo | Abreviação óbvia de "caloria/kalorie" — genérico, indefensável | **OCUPADO** (o pior caso da lista) |
| **Sated** | Sated: meal timer (H&F) | **sated.com é loja Shopify ativa de produtos keto/nutrição** → conflito de marca na MESMA classe de produtos | `sated.com` ocupado por marca concorrente | Alto em PT/ES (leitura "sá-ted"/"sa-tê-de") | EN: saciado (ótimo). PT/ES: nenhum significado, palavra opaca | **ARRISCADO** |
| **Morsel** | **10 apps**: Morsel – Meal Tracking (H&F), Morsel: Calorie Journal (H&F), Morsel: Food & Feeling (H&F), MorselMemo – Easy food log (H&F), Morsel Mate (H&F), MorselNote (H&F), Morsel: cook share eat, Morsel Guide, Morsel: Recipe Manager, Morseled | morsel.menu, getmorsel.com, morselapp no GitHub | `morsel.app` ativo | Alto em PT (dígrafo "rs" + "-el" átono) | EN: bocado (ótimo). PT/ES: nada | **OCUPADO** |
| **Tally** | Nenhum em H&F | **30+ apps** em Utilities/Productivity (Tally • Quick Counter da Agile Tortoise, Tally Counter, Tally: The Anything Tracker, Tally – Form New Habits…). Além disso é **palavra de UI** ("contagem") | `tally.app` ativo (CSC — cliente corporativo) | Médio-alto em PT ("tálli"/"táli") | EN: contagem. PT/ES: nada. Registro de "planilha", não de "comida" | **OCUPADO** |
| **Porção** | Nenhum idêntico; adjacentes: Ajustar Receitas por Porção (Food & Drink), Calmorie: Calorias por Foto | **Porcão** — rede de churrascarias brasileira com marca forte (+ Clube Porcão) | `porcao.app` sem DNS, mas o nome exige cedilha/til | Cedilha e til quebram URL, e-mail, ASO e teclado internacional | PT: porção (bom significado, mas descritivo). ES: "porción". EN: ilegível | **OCUPADO / inviável tecnicamente** |
| **Garfo** | Nenhum em H&F; **Garfinho: Alimentação infantil** (BR, adjacente) | **`garfo.app` é um SaaS brasileiro ativo de gestão para restaurantes (R$39,90/mês)** — mesma TLD, mesmo país, campo alimentar | `garfo.app` **ocupado e em operação** | Médio em EN ("GAR-foh") | PT: garfo. ES: "tenedor" (sem significado). EN: nada. Além disso é o clichê nº 1 de ícone da categoria | **OCUPADO** |
| **Plena** | **Plena Saúde** (Plena Saude SA, H&F) — operadora de plano de saúde grande no Brasil; Plena Biofeedback (H&F); + Vida Plena / Família Plena / PlenaMente (Lifestyle) | Marca consolidada em saúde no Brasil → risco real de oposição no INPI | `plena.app` estacionado na Afternic (à venda) | Baixo em PT/ES; médio em EN | PT/ES: plena/pleno = completo (bom). EN: nada | **OCUPADO no Brasil** |
| **Sacia** | **Nenhum app encontrado** em BR nem US | Nenhuma colisão notável | `sacia.app` registrado (Squarespace) | Médio-alto em EN ("SAY-sha"? "sa-SEE-a"?) | PT/ES: "sacia" = 3ª pessoa de saciar (significado perfeito, mas é verbo conjugado → soa como comando). EN: nada | **LIVRE** (mas com atrito internacional) |
| **Quota** | Quota Salud (Medical), OP Quota (Food & Drink) | Palavra genérica do vocabulário de negócios em EN/PT/ES → marca fraca e difícil de registrar | `quota.app` estacionado (lander) | Baixo | PT/ES/EN: cota/quota — registro burocrático, de "meta imposta". Contradiz "calmo" | **ARRISCADO** |

### 1.2 Seis candidatos propostos

Critérios aplicados: 2–3 sílabas, pronunciável em PT **e** EN, ligado a comida/porção/equilíbrio ou abstrato-premium, não é palavra de UI, sem sentido negativo em PT/EN/ES.

| Nome | Apps com mesmo nome em H&F / Food | Outras colisões | Domínio | Risco de pronúncia | Significado PT / EN / ES | Veredito |
|---|---|---|---|---|---|---|
| **Satia** | SATIA: Nature Relax & Sleep (H&F, mas nicho sono); Satiated Life (H&F nutrição, PLLC minúscula) | Confusão fonética com "Satya" (nomes indianos) | `satia.app` registrado (GoDaddy, parking); `satia.com` em Vercel | **Médio-alto em pt-BR**: brasileiro palataliza /ti/ → "sa-TCHÍ-a"; também aproxima de "sátira" | Raiz latina *satiare* → saciar (PT), saciar (ES), satiate/satiety (EN). Significado atravessa os três idiomas | **LIVRE, com atrito fonético** |
| **Fatia** | **Nenhum** em H&F/Food (só jogos casuais com "fatias") | Bendita Fatia (Shopping, BR) | `fatia.app` registrado (Namecheap) | Baixo em PT; baixo-médio em EN | PT: fatia (ótimo, porção). ES: "rebanada" (opaco). **EN: o olho lê "FAT-ia"** — leitura ótica desastrosa num app de calorias | **ARRISCADO para venda internacional** |
| **Ceia** | Nenhum em H&F/Food (só igrejas: Ceia Zona Sul, Igreja Ceia; e Palma Ceia nos EUA) | **CEIA S.p.A.** (Itália) — detectores de metal, marca registrada em classe 9; apps CEIA FMD+ e CEIA OPENGATE | `ceia.app` registrado (Google Domains, sem A) | Médio em EN ("SEE-ah"? "CHAY-ah"?) | PT: ceia = última refeição do dia — **semanticamente estreito** para um app de dia inteiro. ES: não existe. EN: nada | **ARRISCADO** |
| **Almo** | **Nenhum** em H&F/Food/Medical em BR nem US. Só Almo Market (Shopping), Almo eSIM (Travel), ALMO AI Assistant (Productivity) | **Colisão severa com "Alma: Nutrition Companion"** — app de nutrição por IA com aporte da Menlo Ventures, alma.food, H&F. Uma letra de diferença | `almo.app` ativo (Cloudflare) | Baixo nos três idiomas | Latim *almus* = nutridor; PT/ES: "almo" arcaico-poético = nutritivo. EN: neutro | **ARRISCADO** (colisão com Alma) |
| **Nivo** | **Nenhum** em H&F/Food. Só NivoApp (Lifestyle) | **nivo** = biblioteca JS de dataviz muito conhecida (nivo.rocks) → polui SEO de dev; Nivo Solutions (fintech UK) | `nivo.app` estacionado na Afternic (à venda, custo previsível) | Baixo nos três idiomas | Abstrato-premium; evoca "nível/nivel" (equilíbrio). Sem sentido negativo em nenhum dos três | **LIVRE** |
| **Orla** | **Orla: Nutrition Coach** (Oak & Vine Media, H&F, iOS **e** Google Play, US$119,99/ano) — concorrente direto e ativo. Orla: Fridge Recipe Generator (Food & Drink), Orla Movimento (H&F, BR), Orla Conectada (Food & Drink, BR), Orla Mais | Orla Kiely (marca de design) | `orla.app` ativo (Cloudflare); `orla.com` ocupado | Baixo | PT/ES: orla = beira-mar/borda. EN: nome próprio irlandês | **OCUPADO** |

### 1.3 Análise especial — "Prato"

Todos os apps chamados Prato que localizei:

| App | Desenvolvedor | Loja / categoria | URL |
|---|---|---|---|
| **Prato AI** | Prato AI Inc. | App Store BR — **Health & Fitness**. Descrição: rastrear refeições, contar calorias, metas de fitness. Lançado 11/11/2025, 0 avaliações | https://apps.apple.com/br/app/prato-ai/id6746783246 |
| **Prato** | Prato AI Inc. | **Google Play — mesmo produto** (`com.prato.prato_app`) | https://play.google.com/store/apps/details?id=com.prato.prato_app |
| Prato Seguro | Divo Dal Gobbo Abi | App Store BR — Health & Fitness | https://apps.apple.com/br/app/prato-seguro/id6758619819 |
| Prato Seguro: Empresas | Divo Dal Gobbo Abi | App Store BR — Lifestyle | https://apps.apple.com/br/app/prato-seguro-empresas/id6758728753 |
| Meu Prato IA | Rodolfo Teixeira | App Store BR — Health & Fitness | https://apps.apple.com/br/app/meu-prato-ia/id6753898199 |
| Olho no Prato: Conte Calorias | FVM | App Store BR — Health & Fitness (contador de calorias por foto) | https://apps.apple.com/br/app/olho-no-prato-conte-calorias/id6757802677 |
| Prato Digital | Rafael Nonino / Sagres | App Store + Play — Food & Drink (marmitex) | https://apps.apple.com/us/app/prato-digital/id1476417358 |
| Prato Feito | WEDIGITEK B.V. | App Store BR — Lifestyle | https://apps.apple.com/br/app/prato-feito/id1602260516 |
| Prato do Dia – Receitas Fáceis | Mario Vieira | App Store BR — Food & Drink | https://apps.apple.com/br/app/prato-do-dia-receitas-f%C3%A1ceis/id6676268737 |
| Do Pasto ao Prato | br.mapping.app | App Store + Play — rastreabilidade de carne | https://apps.apple.com/us/app/do-pasto-ao-prato/id6443904139 |
| Caça ao Prato | 嘉杰 孙 | App Store — Games | — |
| Padel Prato | — | App Store — clube esportivo (Itália) | https://apps.apple.com/us/app/padel-prato/id1587875228 |
| Taxi Prato | Microtek | App Store — Itália | https://apps.apple.com/us/app/taxi-prato/id1625073919 |
| PRATO CAPITAL BLACK BOX | Prato Capital | App Store — Finance | https://apps.apple.com/us/app/prato-capital-black-box/id1589136655 |
| Teatro Metastasio di Prato | Fondazione Teatro Metastasio | App Store — Entertainment (Itália) | https://apps.apple.com/us/app/teatro-metastasio-di-prato/id1483741627 |

**Um app de calorias chamado Prato seria confundível? Sim, gravemente.** Quatro razões:

1. **Colisão frontal**: já existe "Prato AI" — um contador de calorias, em Health & Fitness, na loja brasileira, no iOS **e** no Android, com a mesma proposta. Um usuário buscando "Prato" no ASO cairia nele. Nenhum juiz de marca ou revisor de App Store trataria isso como coexistência confortável.
2. **Categoria já povoada de "prato"**: mais três apps de nutrição em H&F usam a palavra (Olho no Prato, Meu Prato IA, Prato Seguro). "Prato" virou termo de categoria em pt-BR, não nome de marca.
3. **Marca descritiva → registro fraco**: "prato" é o substantivo comum do objeto onde a comida está. No INPI e no USPTO isso tende a ser considerado descritivo/sugestivo fraco na classe 9/42 para software de alimentação — protege pouco e você não consegue impedir imitadores.
4. **Venda internacional bloqueada**: Prato é uma cidade italiana de ~200 mil habitantes com província própria. Toda busca global por "Prato" retorna turismo, têxtil e futebol italiano. O SEO/ASO fora do Brasil é inviável.

**Veredito: OCUPADO. Descartar.**

---

## 2. Recomendação final + 2 reservas

### Top 5

| # | Nome | Por quê | Ressalva |
|---|---|---|---|
| **1** | **Bocado** | Health & Fitness completamente livre no mundo inteiro; único homônimo é um app espanhol de Food & Drink. Significado idêntico e positivo em PT **e** ES ("uma mordida / porção pequena"). Padrão fonético já naturalizado em inglês (avocado, aficionado, desperado). `bocado.app` aparentemente não registrado | Substantivo comum → registrar como marca figurativa+nominativa e reforçar com identidade visual forte |
| **2** | **Sacia** | Zero colisões em qualquer loja. Significado exato do benefício (saciedade) em PT e ES | Verbo conjugado (soa imperativo); anglófono hesita na pronúncia; `.app` já registrado |
| **3** | **Nivo** | Abstrato-premium, 2 sílabas, idêntico em PT/EN/ES, zero colisão em H&F. Escala internacionalmente sem tradução | Sem calor alimentar; SEO poluído pela lib de dataviz; `.app` à venda (custo) |
| **4** | **Satia** | Raiz *satiare* legível nos três idiomas; colisões mínimas e em nichos distantes | Brasileiro pronuncia "sa-TCHÍ-a"; proximidade de "sátira" |
| **5** | **Ceia** | Curtíssimo, pt-BR nativo, calmo, som suave | Semanticamente estreito (só o jantar); marca CEIA S.p.A. em classe 9 na Europa |

### Recomendação: **Bocado**

**Marca e narrativa.** "Bocado" é a unidade atômica do que o produto faz: você registra *um bocado por vez*. Isso amarra o diferencial (registro rápido, sem cerimônia) direto ao nome — o oposto de "Prato" (uma refeição inteira, pesada, formal) e de "Kalo/Quota" (um número, uma meta imposta). Linhas de posicionamento que já nascem prontas: *"Registre bocado a bocado."* / *"One bite at a time."* / *"Bocado a bocado."* (a repetição funciona igual nos três idiomas).

**Registro e defensabilidade.** Health & Fitness está 100% livre em BR e US — o único homônimo é a LABERIT (Espanha) em Food & Drink, categoria diferente e produto diferente. Restaurantes chamados Bocado existem, mas serviço de alimentação é classe 43, não classe 9 (software) nem 42 (SaaS); coexistência é normal. `bocado.app` não tem delegação DNS, ou seja, muito provavelmente disponível — e o `.app` é ideal porque força HTTPS e sinaliza produto digital.

**Venda internacional.** Este é o argumento decisivo contra todas as alternativas pt-BR puras. "Bocado" é palavra viva e positiva em **português e espanhol simultaneamente** — o que entrega, de graça, os mercados México, Colômbia, Argentina, Chile e Espanha na mesma marca, sem rebranding. Para o anglófono é uma palavra romance atrativa e sem fricção (o padrão "-ado" é familiar), do mesmo tipo de exotismo premium que "Yazio", "Fitia" e "Noom" tentam construir com nomes inventados — só que Bocado carrega significado real.

**Riscos assumidos.** (a) Três sílabas, contra as duas de "Noom"/"Zoe" — mitiga-se com um logotipo curto e um ícone que não dependa do nome escrito. (b) Em PT "um bocado" também significa "bastante" ("custou um bocado"), o que num app de calorias pode gerar uma piada involuntária — irrelevante na prática, mas evite copy do tipo "um bocado de calorias". (c) Sendo substantivo comum, o registro forte é o misto (nominativo + figurativo); depositar em BR (INPI, classes 9 e 42) e US (USPTO) antes do lançamento.

### Reserva 1 — **Nivo**
Escolha se a prioridade for **venda internacional acima de tudo** e um registro de marca mais limpo. Palavra inventada, dois sílabas, idêntica em qualquer idioma latino ou anglófono, zero bagagem semântica a explicar em novo mercado. Evoca "nível" — equilíbrio, não punição. Custo: `nivo.app` está à venda na Afternic (orçar), e o nome não conta história alimentar nenhuma sozinho — exige uma identidade visual e um tagline fazendo todo o trabalho.

### Reserva 2 — **Sacia**
Escolha se a prioridade for **domínio do mercado brasileiro** e um nome que já explica o benefício em pt-BR. Nenhuma colisão em nenhuma loja — o campo está literalmente vazio, o que é raríssimo nesta categoria. Custo: internacionalização exige um segundo nome ou uma grafia adaptada, e `sacia.app` já está registrado (negociar ou usar `sacia.com.br` + outro TLD).

---

## 3. Mapa de identidade visual dos concorrentes

Cores extraídas programaticamente do artwork oficial 512px de cada app na App Store (quantização + amostragem de fundo), portanto são hex medidos, não aproximados. Onde há hex de brand guideline documentado, está indicado.

| App | Cor primária (hex medido) | Padrão claro/escuro | Tipografia | Estilo de ícone | Registro visual | Reclamações sobre a aparência |
|---|---|---|---|---|---|---|
| **MyFitnessPal** | **#0066EE** azul (93% do ícone). Guideline documentado: **#0372BC** | Claro por padrão | Sans-serif arredondado, amigável, sem ângulos agressivos | Silhueta branca de figura humana em salto/estrela, fundo azul chapado | **Esportivo / massificado** | O ponto mais criticado da categoria: interface "inchada", ads em banner no rodapé de quase toda tela + intersticiais em tela cheia entre ações, visual datado, hierarquia confusa |
| **Lose It!** | **#FE9402** laranja (87% somando dois tons) | Claro por padrão | Sans-serif geométrico | Mostrador/velocímetro branco com ponteiro vermelho | **Clínico-esportivo** (metáfora de balança/medidor) | Visual percebido como envelhecido; a metáfora de mostrador reforça "julgamento/medição" |
| **Cronometer** | **#FF7C54** coral-laranja (72%). Documentado: "Outrageous Orange" **#FF6733** + Kumera **#976C28** | Claro por padrão | Sans-serif limpo, denso | Alvo/bullseye em line-art branco com seta-folha (redesenho por Tiller) | **Clínico-científico** | Densidade de dados; o próprio rebrand admite que precisava passar "de dado para entendimento" e explicitamente não quer "moralizar" |
| **YAZIO** | **#3CE4FC** turquesa em gradiente sobre preto/branco | Claro | **Yazio Sans** — tipo customizado da Hottype: curvas grandes, cantos arredondados, formas fechadas, curvas "inspiradas em sorriso". Texto de apoio em Noto Sans | Mascote **Yettie** (yeti ciano com chifres, boca aberta rosa) | **Lúdico / mascote** ("Good Dopamine", rebrand pela Koto) | O novo design e o novo ícone geraram forte rejeição; usuários antigos reclamam de animações em excesso, features intrusivas e de que "o layout antigo era mais fácil de navegar" |
| **Lifesum** | **#02F537** verde neon em gradiente para amarelo. Guideline: Ocean Green **#37B97D**, Mine Shaft **#242424**, Spring Wood **#FAFAF5** | Claro por padrão | Sans-serif; tentaram serifada em 2024 e recuaram | Cluster de folhas/pétalas verde-escuras sobre gradiente neon | **Lúdico-orgânico** | Caso documentado de acessibilidade: a serifada introduzida na v12 prejudicou usuários disléxicos e teve de ser revertida no patch 12.0.1 |
| **MacroFactor** | **Preto #0C0C0C** (41%) + cinzas metálicos | **Escuro é a assinatura** (suporta System/Light/Dark) | Sans-serif pesado, monograma cromado | Monograma "MF" em relevo metálico sobre preto | **Tech / premium escuro** | Poucas queixas visuais — é o benchmark de "moderno e enxuto" da categoria; críticas são de preço, não de estética |
| **Cal AI** | **#1D1A23** quase-preto (76%) | **Escuro** | Sans-serif contemporâneo, espaçamento generoso | Maçã branca dentro de colchetes de scanner de câmera | **IA / scanner escuro** | Elogiado ("parece desenhado em 2025, não em 2015"); o problema é que o *padrão* preto+scanner virou template copiado por dezenas de clones |
| **FatSecret** | Fundo **branco #FDFDFD** com verde **#0C9C3C** | Claro | Tipografia inconsistente entre telas | Círculo verde com buraco de fechadura ("secret") | **Clínico datado** | O mais criticado esteticamente: "interface mais datada entre os apps recomendados", telas poluídas, hierarquia visual pouco clara, "interface ultrapassada" é reclamação recorrente na App Store |
| **Fitia** | **#FEB916** amarelo-âmbar (78%) | Claro por padrão | Sans-serif arredondado | Glifo abstrato de barras/lista branco sobre âmbar | **Brilhante / amigável** (Lima, Peru; forte na América Latina) | Poucas queixas de aparência — interface limpa é citada como força |
| **Noom** | **#FB513A** coral-vermelho (93%). Guideline: Sunset Orange **#FB513B**, Spring Wood **#F6F4EE**, Blue Dianne **#1D3A44** | Claro | **Gotham Rounded** | Logotipo "NOOM" em caixa alta branca — sem símbolo no ícone | **Editorial / wordmark** (rebrand pela Gretel; abandonaram o verde porque "verde já é a cor de comida saudável") | Queixas concentradas em bugs, travamentos e dados não salvos, mais do que em estética |
| **Foodnoms** | **#FC540C** laranja em gradiente sobre pêssego | Claro | Sans-serif de sistema (SwiftUI nativo) | Barras de gráfico brancas + garfo | **Utilitário / indie polido** | Reconhecido como "muito bem desenhado, sem poluição, sem ads"; o próprio autor trocou o ícone de spork por este e ganhou +10% de conversão de download |

**Leitura do mapa.** Onze concorrentes, e o espectro está distribuído assim: cinco no arco quente 8°–45° (Noom 9°, Cronometer 16°, Foodnoms 19°, Lose It 35°, Fitia 42°), dois no verde saturado 133°–140° (Lifesum, FatSecret), um no ciano 191° (Yazio), um no azul 214° (MyFitnessPal) e dois no preto (MacroFactor, Cal AI). **Nove dos onze usam um fundo chapado de cor saturada.**

---

## 4. Territórios livres e 3 direções de paleta

### 4.1 O que ninguém reivindicou

**Matizes vazios**
- **Índigo / violeta / periwinkle (240°–290°)** — completamente vazio. O azul mais próximo é o #0066EE do MyFitnessPal, a 36° de distância e num registro esportivo totalmente diferente.
- **Magenta / ameixa / rosa profundo (290°–345°)** — vazio. O único rosa da categoria é a boca do mascote do Yazio.
- **Verde dessaturado: sálvia, oliva, musgo (70°–110°)** — vazio. Os dois verdes existentes são neon/esmeralda saturados a 133°–140°; sálvia é outro planeta perceptual.

**Registros vazios**
- **Neutro quente como *fundo primário de marca*** — nenhum dos onze faz isso. Noom e Lifesum têm um off-white quente (#F6F4EE / #FAFAF5) na paleta, mas como fundo secundário; a cor de marca continua sendo um chapado saturado. Um app cujo território é *o papel*, não *a tinta*, seria imediatamente diferente numa fileira de screenshots da loja.
- **Editorial calmo / "quiet luxury"** — o eixo está inteiramente livre. Playful pertence a Yazio/Lifesum/Fitia/Foodnoms; sporty a MyFitnessPal/Lose It; clinical a Cronometer/FatSecret; dark-tech a MacroFactor/Cal AI. Ninguém ocupa "livro bem composto".

**Bônus estratégico**: fundo neutro de baixa croma é o único contexto em que **foto de comida fica bonita**. Fundos saturados brigam com o alimento fotografado — o que importa muito num app cujo registro é rápido e frequentemente por foto.

### 4.2 Três direções de paleta

Todas as razões de contraste abaixo foram calculadas (WCAG 2.1 relative luminance). AA para texto normal = 4.5:1; AAA = 7:1.

---

#### Direção A — **"Papel"** *(recomendada)*
Papel osso quente + tinta quase preta + um único índigo profundo. O território mais vazio da categoria combinado com o registro mais vazio.

| Token | Claro | Escuro |
|---|---|---|
| Fundo | `#F7F4EE` | `#15161A` |
| Superfície / card | `#FFFFFF` | `#1E2026` |
| Tinta (texto primário) | `#1B1D21` | `#ECEAE4` |
| Tinta secundária | `#5C5F66` | `#A7A6A0` |
| Acento (único) | `#2F3A8C` índigo | `#93A0F2` |
| Macro — proteína | `#3F5F7C` azul-ardósia | `#8FB6D6` |
| Macro — carboidrato | `#9C5A2C` cobre | `#EDA56E` |
| Macro — gordura | `#6E4E76` ameixa acinzentada | `#C39ACB` |

**Racional.** O fundo osso é o diferenciador visível a 100 metros numa grade da App Store onde nove de onze concorrentes são um chapado saturado; e é o único fundo em que a foto do prato do usuário aparece bem. O índigo fica a 36° do azul do MyFitnessPal e é ocupado por ninguém na categoria — lê como "considerado", não como "atlético". Um único acento (não uma paleta de acentos) é o que sustenta a promessa de *calmo*: a cor só aparece na ação primária e no estado ativo, nunca decorando. Alto contraste da tinta serve a promessa de *rápido* — legibilidade instantânea, sem esforço de leitura.

**Notas WCAG AA.** Tinta primária 15,4:1 no claro e 15,0:1 no escuro (AAA folgado). Tinta secundária 5,8:1 / 7,4:1 (AA em ambos, AAA no escuro). Acento 9,1:1 / 7,4:1 (AAA nos dois modos) — pode ser usado em texto de link e em botão de texto sem cuidado extra. Os três macros ficam entre 4,9:1 e 8,8:1 sobre o fundo; o cobre `#9C5A2C` é o piso da paleta a 4,89:1 sobre `#F7F4EE` (a saída `#7A5A1C` saiu junto com o ocre, e macro nunca é cor de texto de qualquer forma — o critério aplicável é o de não-texto, 3:1). **O trio varia em matiz, não em luminosidade** (proteína L\* 39,1 e gordura L\* 38,0, diferença de 1,1) e **não sobrevive à deuteranopia**: proteína × gordura dá ΔE00 3,0, a mesma cor para um dicromata. Por isso macro nunca é codificado só por cor — sempre com rótulo e posição fixa.

---

#### Direção B — **"Sálvia"**
Verde dessaturado no canto 70°–110° que os dois verdes da categoria não ocupam. Territorialmente "comida" sem ser o verde neon de saúde.

| Token | Claro | Escuro |
|---|---|---|
| Fundo | `#F3F5F0` | `#13160F` |
| Superfície / card | `#FFFFFF` | `#1D211A` |
| Tinta | `#1D211B` | `#E9EDE4` |
| Tinta secundária | `#5B6159` | `#A3A99C` |
| Acento | `#3C5A34` musgo | `#9CC08F` |
| Macro — proteína | `#3B6270` | `#8CBCC9` |
| Macro — carboidrato | `#8A6520` | `#D9AE64` |
| Macro — gordura | `#6B5580` | `#BAA3D2` |

**Racional.** Verde é a associação natural de alimentação, e por isso mesmo é onde a Noom decidiu *não* estar ("verde já é a cor de comida saudável"). A saída é a mesma cor com a croma derrubada: `#3C5A34` está a ~40° e a metade da saturação do `#37B97D` do Lifesum e do `#0C9C3C` do FatSecret, o que produz reconhecimento de categoria sem parecer nenhum dos dois. É a direção mais segura comercialmente e a menos ousada.

**Notas WCAG AA.** Tinta 14,9:1 / 15,4:1. Secundária 5,8:1 / 7,6:1. Acento 7,1:1 / 9,0:1 (AAA nos dois modos). Macros de 4,83:1 a 8,9:1 — mesmo caveat do ocre. Atenção específica: o acento musgo e o macro-gordura `#6B5580` diferem pouco em luminosidade (7,07 vs 5,91) — não os coloque adjacentes num gráfico sem separador ou rótulo.

---

#### Direção C — **"Ameixa"**
O território 100% vazio: magenta-ameixa profundo sobre osso frio. A opção mais ousada e a mais difícil de imitar.

| Token | Claro | Escuro |
|---|---|---|
| Fundo | `#FAF7F8` | `#17131B` |
| Superfície / card | `#FFFFFF` | `#211C26` |
| Tinta | `#211B26` | `#EFE9F0` |
| Tinta secundária | `#615A66` | `#A9A1AE` |
| Acento | `#7A2E5C` ameixa | `#E294C2` |
| Macro — proteína | `#33607A` | `#8CB8D4` |
| Macro — carboidrato | `#8A6520` | `#D9AE64` |
| Macro — gordura | `#4E6B45` musgo | `#A3C398` |

**Racional.** Nenhum dos onze concorrentes tem um único pixel nesta faixa de matiz. Um ameixa profundo é simultaneamente apetitoso (figo, uva, beterraba, vinho) e adulto — foge tanto do neon de wellness quanto do preto de tech. É a direção que mais rápido cria memória de marca. Risco: em wellness, magenta lê como "feminino/beleza"; se o público-alvo for misto, use o ameixa exclusivamente como acento e mantenha o osso frio dominante — nunca chapado.

**Notas WCAG AA.** Tinta 15,8:1 / 15,4:1. Secundária 6,2:1 / 7,3:1. Acento 8,3:1 / 8,1:1 (AAA). Macros de 4,98:1 a 9,4:1. O acento ameixa e o macro-gordura musgo são complementares e não se confundem em nenhum tipo de daltonismo.

---

## 5. Clichês de ícone da categoria e 3 conceitos

### 5.1 Clichês (evidenciados pela amostra dos 11 concorrentes + varredura de categoria)

| Clichê | Quem já usa |
|---|---|
| Garfo / talher | Foodnoms, garfo.app, incontáveis apps de dieta |
| Maçã ou fruta | Cal AI (maçã), Prato AI (laranja kawaii) |
| Folha / broto | Lifesum, seta-folha do Cronometer |
| Chama / "queima" de kcal | genérico da categoria fitness |
| Prato visto de cima com talheres | o clichê que o próprio nome "Prato" arrastaria junto |
| Barra/anel de progresso | Foodnoms, Fitia — **e é indistinguível de um controle de UI** |
| Colchetes de scanner de câmera | Cal AI e toda a onda de clones de IA de 2024–25 |
| Alvo / bullseye | Cronometer |
| Velocímetro / mostrador | Lose It! |
| Coração / linha de pulso | genérico saúde |
| Mascote kawaii | Yazio (Yettie), Prato AI |
| Monograma de duas letras sobre preto | MacroFactor |

### 5.2 Três conceitos

Requisitos aplicados: legível a **29 px**, **não confundível com um controle de UI**, **seguro em monocromático** (funciona em preto sólido ou branco sólido, sem gradiente e sem cor semântica), fora dos clichês acima.

**Conceito 1 — "Grão"**
Uma única massa sólida em forma de lente assimétrica (semente/grão), inclinada ~12°, ocupando cerca de 55% do quadro, deslocada do centro óptico. Um borda reta, uma borda curva.
*Por que funciona a 29 px*: é **uma forma sólida só** — a leitura sobrevive a qualquer redução, porque não há detalhe interno para perder. *Por que não é UI*: nenhum controle de interface tem essa silhueta (não é círculo, não é pílula, não é retângulo arredondado). *Monocromático*: trivial — é uma silhueta preenchida. *Fora dos clichês*: alimentar sem ser garfo, folha, fruta ou prato. A inclinação impede que seja lido como um blob genérico e dá movimento — coerente com "rápido".

**Conceito 2 — "Arco e ponto"**
Um arco espesso de canto reto (cerca de 140° de abertura, voltado para cima, como uma tigela vista de perfil) e um único ponto sólido flutuando acima do centro do arco. Dois elementos, nada mais.
*Por que funciona a 29 px*: arco + ponto é a estrutura mais legível que existe em ícone pequeno — é como o "i" e o ponto de exclamação sobrevivem em qualquer tamanho. *Por que não é UI*: um arco aberto com ponto separado não corresponde a nenhum controle (não é anel de progresso, porque não há trilho de fundo nem gap; não é toggle, porque não é estádio). *Monocromático*: dois sólidos, nenhuma dependência de cor. *Fora dos clichês*: sugere tigela e bocado sem desenhar comida; e o ponto é o único elemento que pode carregar o acento da marca enquanto o arco fica na tinta — funciona no ícone, no loader, no ponto de "salvo" e no favicon, com uma peça só.

**Conceito 3 — "Monograma estêncil"**
A inicial da marca vazada (recorte negativo) num campo de osso quente sólido, desenhada numa serifada editorial de contraste médio ou numa grotesca humanista, com **uma contraforma deliberadamente aberta** (o "b" de Bocado perde uma fração da haste onde encontra o bojo).
*Por que funciona a 29 px*: uma letra é a forma mais super-treinada do sistema visual humano; a contraforma aberta cria uma assimetria que persiste na miniatura e é o que torna o ícone reconhecível entre outros monogramas. *Por que não é UI*: letras nunca são controles. *Monocromático*: é um recorte — inverte perfeitamente. *Fora dos clichês*: monograma existe na categoria (MacroFactor), mas em cromado sobre preto e com duas letras; **uma** letra serifada vazada em papel quente lê como selo editorial, não como app de tech — é a leitura oposta. É também o conceito **mais defensável juridicamente**, porque a marca figurativa passa a ser um desenho autoral e não uma palavra comum.

*Ordem de aposta*: Conceito 2 ("Arco e ponto") como ícone principal — melhor equilíbrio entre calor alimentar e abstração, e é o único que se estende a um sistema completo (ícone, loader, marcador de estado). Conceito 3 como alternativa se a prioridade for percepção premium e força de registro. Conceito 1 como reserva se o nome final for abstrato (Nivo) e o ícone precisar carregar sozinho a associação com comida.

---

## 6. Fontes

**Lojas e dados de apps (consulta direta)**
- iTunes Search API — `https://itunes.apple.com/search?term=<nome>&entity=software&country=BR|US` (BR e US, todas as buscas de colisão de nome)
- iTunes Lookup API — `https://itunes.apple.com/lookup?id=<id>` (metadados e artwork 512px de todos os concorrentes e do Prato AI)
- https://apps.apple.com/br/app/prato-ai/id6746783246
- https://play.google.com/store/apps/details?id=com.prato.prato_app
- https://apps.apple.com/br/app/olho-no-prato-conte-calorias/id6757802677
- https://apps.apple.com/br/app/prato-seguro/id6758619819
- https://apps.apple.com/br/app/meu-prato-ia/id6753898199
- https://apps.apple.com/us/app/prato-digital/id1476417358
- https://apps.apple.com/us/app/do-pasto-ao-prato/id6443904139
- https://apps.apple.com/us/app/kalo-ai-calorie-tracking/id6746720072
- https://apps.apple.com/us/app/kalo-macro-calorie-counter/id6744622118
- https://apps.apple.com/us/app/kalo-calorie-macros-tracker/id6743162973
- https://apps.apple.com/us/app/morsel-cook-share-eat/id6756082004
- https://apps.apple.com/us/app/morsel-guide/id6496859695
- https://apps.apple.com/us/app/morsel-recipe-manager/id6738929457
- https://apps.apple.com/us/app/orla-nutrition-coach/id6760097317
- https://play.google.com/store/apps/details?id=com.macrosiq.app
- https://apps.apple.com/br/app/plena-sa%C3%BAde/id1263937244
- https://apps.apple.com/br/app/garfinho-alimenta%C3%A7%C3%A3o-infantil/id1630738243
- https://apps.apple.com/ae/app/alma-nutrition-companion/id6736372798
- https://www.alma.food/
- https://garfo.app/
- https://sated.com/
- https://www.orla.app/

**Concorrentes — identidade visual**
- https://apps.apple.com/us/app/myfitnesspal-calorie-counter/id341232718
- https://www.brandcolorcode.com/myfitnesspal
- https://logotyp.us/logo/myfitnesspal/
- https://orangeyouglad.com/work/myfitnesspal
- https://apps.apple.com/us/app/lose-it-calorie-counter/id297368629
- https://www.iosicongallery.com/icons/lose-it-2015-06-03/
- https://cronometer.com/blog/blog-cronometer-brand-evolution/
- https://cronometer.com/blog/our-new-look/
- https://brandfetch.com/cronometer.com
- https://bpando.org/2026/04/16/yazio-by-koto/
- https://www.creativebloq.com/design/branding/i-would-die-for-this-brands-adorable-yeti-mascot
- https://abduzeedo.com/index.php/design-inspiration-weekly-offf-2026-yazio-claude-design
- https://mobbin.com/colors/brand/lifesum
- https://osipycheva-varvara.medium.com/small-changes-can-make-a-big-difference-to-in-accessible-design-lifesums-recent-update-b9425434f02d
- https://apps.apple.com/us/app/macrofactor-macro-tracker/id1553503471
- https://outlift.com/macrofactor-review/
- https://apps.apple.com/cy/app/cal-ai-calorie-tracker/id6480417616
- https://nutrola.app/en/blog/cal-ai-review-2026
- https://www.behance.net/gallery/224008331/Cal-AI-Calorie-Counter-Mobile-App-UI-UX-Design
- https://apps.apple.com/br/app/contador-de-calorias-fatsecret/id347184248
- https://calorie-trackers.com/reviews/fatsecret/
- https://thetestdesk.com/reviews/fatsecret/
- https://apps.apple.com/us/app/fitia-calorie-counter-diet/id1448277011
- https://fortune.com/article/fitia-app-review/
- https://feastgood.com/fitia-app-review/
- https://mobbin.com/colors/brand/noom
- https://gretelny.com/noom
- https://1000logos.net/noom-logo/
- https://nutrola.app/en/blog/why-is-noom-so-bad-now
- https://foodnoms.com/
- https://foodnoms.com/news/new-foodnoms-app-icon
- https://www.macstories.net/reviews/foodnoms-2-refreshes-its-design-and-adds-refinements-to-nutrition-logging-and-goal-tracking-throughout/

**Reclamações e reviews de categoria**
- https://nutrola.app/en/blog/myfitnesspal-review-2026
- https://calorie-trackers.com/reviews/myfitnesspal/
- https://www.hootfitness.com/blog/why-users-are-switching-from-myfitnesspal-and-what-they-re-choosing-instead
- https://feastgood.com/myfitnesspal-alternatives/
- https://calorie-trackers.com/reviews/yazio/
- https://nutrola.app/en/blog/what-do-reddit-users-say-about-yazio-2026
- https://kimola.com/reports/unlock-insights-yazio-app-customer-feedback-report-google-play-151936
- https://www.choosingtherapy.com/noom-review/
- https://screensdesign.com/articles/calorie-tracker-app-design/
- https://elements.envato.com/learn/icon-design-trends

**Domínios**
- Checagem própria de delegação DNS (`dig NS` / `dig A`) em 24 domínios candidatos, 2026-09-08
