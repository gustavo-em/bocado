# 02 — Fontes de dados nutricionais para o app de contagem de calorias

Pesquisa realizada em 2026-09-08. Todas as respostas JSON abaixo foram obtidas **ao vivo** (curl) e estão salvas em `research/raw/`. Números de limite de taxa e nomes de licença foram copiados das páginas oficiais consultadas (lista completa na seção F).

Contexto: app React Native, Brasil-first (pt-BR + en-US), dev solo, sem backend próprio, precisa funcionar offline para alimentos comuns, será vendido comercialmente.

---

## A. Tabela comparativa

| Fonte | Auth / custo | Limite de taxa | Cobertura: genéricos BR · industrializados BR · código de barras · EN | Campos por 100 g vs por porção | Medidas caseiras? | Licença / atribuição | Pode cachear / embarcar offline? | Qualidade |
|---|---|---|---|---|---|---|---|---|
| **Open Food Facts (OFF)** | Sem auth para leitura; só `User-Agent: AppName/Version (email)` obrigatório. Grátis. | **15 req/min/IP** leitura de produto (`GET /api/v*/product`); **10 req/min/IP** busca (`/api/v*/search`, `/cgi/search.pl`). "If your requests come from your users directly (ex: mobile app), the rate limits apply per user." Limite global anti-crawl → HTTP 503. | Genéricos: não (só embalados) · Industrializados BR: **36.016 produtos** com `countries_tags=en:brazil` (contagem via `br.openfoodfacts.org/cgi/search.pl`, 08/09/2026); "arroz" → 514 hits (search-a-licious, BR) / 608 (search.pl BR); Sadia 359; Bauducco 287 global / 177 BR · Barcode: **sim (chave primária)** · EN: sim (global, 3+ M produtos) | Ambos: `nutriments.<nutriente>_100g` e `_serving` (+`_unit`, `_value`), `serving_size` (texto) e `serving_quantity` (número) | Só a porção do rótulo (`serving_size`); nada de "colher de sopa" | **ODbL 1.0** (banco) + **DbCL** (conteúdo) + **CC BY-SA 3.0** (imagens). Atribuir "Open Food Facts" com link ao site/produto e mencionar a licença. Share-alike só para *banco derivado publicamente usado* (ver seção E) | **Cache privado: sim** (uso privado não dispara share-alike). **Embarcar o dump no app**: possível, mas o banco embarcado vira "Derivative Database" publicamente distribuída → precisa ser ODbL. Dumps: JSONL gz, CSV (~0,9 GB gz / ~9 GB), MongoDB nightly, Parquet (Hugging Face) | Colaborativa: "no assurances that the data is accurate, complete, or reliable". Campos faltantes frequentes (ex.: Nescafé 7891000315507 sem `nutriments`, só `nutriments_estimated`), sódio em **g**, valores às vezes string, `~` (aproximado). |
| **USDA FoodData Central (FDC)** | API key grátis via api.data.gov (`DEMO_KEY` para testes). Grátis. | **1.000 req/hora/IP** por chave (padrão api.data.gov). `DEMO_KEY`: **30 req/hora/IP** e **50 req/dia/IP**. Cabeçalhos `X-RateLimit-Limit` / `X-RateLimit-Remaining` (observado `x-ratelimit-limit: 10` na busca com DEMO_KEY). | Genéricos BR: só via tradução (EN) · Industrializados BR: quase nada (Branded é rótulo dos EUA; "Bauducco" → 61 itens importados) · Barcode: `gtinUpc` só em Branded (EUA) · EN: **referência mundial** (SR Legacy 7.793 alimentos, Foundation, FNDDS, Branded > 400 k) | **Sempre por 100 g** (`foodNutrients[].value`). Porções: `foodPortions[]` (`gramWeight`, `amount`, `modifier`, `measureUnit`) em SR Legacy/FNDDS/Foundation; Branded: `servingSize`, `servingSizeUnit`, `householdServingFullText` | Sim, em inglês (cup, tbsp, piece…) via `foodPortions`; FNDDS é o mais rico | **Domínio público / CC0 1.0** ("in the public domain and they are not copyrighted"). Pedem "list FoodData Central as the source of the data" | **Sim, tudo** (embarcar, redistribuir, vender). Downloads: CSV completo 458 MB zip / 3,1 GB; SR Legacy JSON 12,3 MB zip / 205 MB, CSV 6,7 MB / 54 MB; Foundation JSON 467 KB / 6,5 MB | Alta (analítica) para Foundation/SR Legacy; Branded é declaração de rótulo. Nomes só em inglês. |
| **TACO 4ª ed. (NEPA/UNICAMP, 2011)** | Nenhuma. Grátis (PDF 744 KB e XLSX 322 KB no site do NEPA; JSON/CSV em repositórios GitHub) | Não se aplica (arquivo estático). brolesi.github.io: "sem servidor, sem chave e sem limite" | Genéricos BR: **597 alimentos**, o padrão brasileiro (arroz tipo 1 cozido, feijão carioca, pão francês, tapioca…) · Industrializados: 5 ("Outros alimentos industrializados") · Barcode: não · EN: não (só pt) | **Por 100 g de parte comestível**; sem porções | Não (precisa cruzar com IBGE) | Sem licença explícita na página do NEPA; publicação pública de universidade estadual, redistribuída amplamente (GitHub MIT, Zenodo DOI). Prática: citar "TACO, 4ª ed., NEPA/UNICAMP, 2011" | **Sim** (embarcar; é a base offline natural) | Alta (analítica, laboratórios brasileiros), mas de 2011 e sem porções; valores "Tr"/"NA" a tratar |
| **TBCA 7.3 (USP/FoRC, 2025)** | Site web; **sem API, sem download** do banco | — | Genéricos BR: ~5.700 alimentos (> 4.000 preparações), o maior BR · Industrializados: poucos · Barcode: não · EN: interface em inglês | Por 100 g; algumas preparações com medida | Parcial | **CC BY-NC-ND 4.0**: "Não é permitida a reprodução total ou parcial do material… é obrigatório citar a fonte. Não é permitida a comercialização." Uso comercial só negociando com os coordenadores | **Não** para app comercial (scrapers no GitHub e datasets no Kaggle existem, mas violam a licença) | Alta, atual (rotulagem ANVISA), mas juridicamente fechada para nós |
| **IBGE POF 2008-2009** (Tabelas de Composição Nutricional ~1.970 itens + Tabela de Medidas Referidas) | Nenhuma. Grátis (FTP do IBGE, `.xls` em `.zip`) | Não se aplica | Genéricos BR: ~1.970 alimentos/preparações como consumidos no Brasil · Industrializados: genéricos ("biscoito recheado") · Barcode: não · EN: não | Por 100 g (5 tabelas: energia/macros/fibra, gorduras/açúcar, minerais, vitaminas, fontes); **medidas em gramas** na Tabela de Medidas (`tabelamedidas_bd.xls`, 11.801 linhas na conversão brolesi) | **Sim — o grande valor**: colher de sopa, concha, xícara, unidade, fatia, prato, copo… com gramas por alimento+preparação | Dados abertos do governo federal (Decreto 8.777/2016; Plano de Dados Abertos do IBGE): uso, reuso e redistribuição livres, sujeitos "no máximo, à exigência de creditar a sua autoria". Citar IBGE | **Sim** (embarcar) | Composição compilada (TACO + USDA SR + literatura), 2011; medidas caseiras são referência nacional |
| **FatSecret Platform API** | OAuth2 *client credentials* (`https://oauth.fatsecret.com/connect/token`, token 86.400 s). Basic: grátis; Premier Free: grátis com verificação (startup < US$ 1 M/ano, ONG, estudante); Premier: sob consulta | Basic: **5.000 chamadas/dia**; Premier Free e Premier: "Unlimited"; `max_results` ≤ 50 | Genéricos BR/pt: **só Premier** ("Localization is a premium feature only made available to select accounts"; região `BR`, idioma `pt`). Basic/Premier Free = **US Only**, inglês · Industrializados BR: Premier · Barcode: Premier (escopo `barcode`, GTIN-13) · EN: excelente | **Por porção** (`servings.serving[]` com `metric_serving_amount` + `metric_serving_unit` g/ml/oz, `calories`, `protein`… `sodium` em mg); 100 g é uma das porções | Sim (`serving_description` "1 cup", `measurement_description`) | Termos: atribuição obrigatória (Basic/Premier Free) em todo lugar onde o conteúdo aparece; **cláusula 1.5: remover conteúdo em 24 h** salvo o marcado "storable indefinitely"; sem cópia/sublicença (1.7) | **Não** (cache máx. 24 h; nada de banco offline) | Alta e verificada, mas fechada; BR só pagando |
| **Edamam Food Database** | `app_id` + `app_key`. **Sem plano grátis hoje**: Enterprise Basic US$ 14/mês (100.000 chamadas/mês, 50 req/min), Core US$ 69, Plus US$ 299 | 50/100/300 req/min conforme plano | Genéricos BR: não (EN) · Industrializados BR: não · Barcode: 790.000 UPCs (EUA) · EN: ~900.000 itens, NLP ("1 cup rice") | Por 100 g (`nutrients` ENERC_KCAL, PROCNT, FAT, CHOCDF, FIBTG) + `measures[]` com `weight` | Sim (EN) | Atribuição com imagem + link obrigatória em todos os planos; cache só de 4 macros + foodId/label/imagem e só em planos que o declarem; "only human, end user driven requests" | **Praticamente não** | Boa (EUA) |
| **Nutritionix** | `x-app-id`/`x-app-key`. **Free tier descontinuado** ("we are no longer able to maintain a public free-access tier"); trial limitado via vendas; enterprise | — | Genéricos BR: não · Industrializados BR: não · Barcode: `/v2/search/item?upc=` (EUA) · EN: NLP maduro (`/v2/natural/nutrients`), restaurantes EUA | Por porção (`serving_weight_grams`, `nf_*`) + `alt_measures` | Sim (EN) | Atribuição; termos enterprise | Não (enterprise) | Alta (EUA) |
| **Spoonacular** | API key. Free: **50 pontos/dia**, 1 req/s; Cook US$ 29 (1.500 pts/dia)… | Pontos por endpoint | Foco em receitas/ingredientes EN; BR não | Por porção e por 100 g em ingredientes | Sim (EN) | "may cache user-requested data… for a maximum of 1 hour" e "may not… copy or store" (só id/título/imagem de receita) | **Não** | Média |
| **CalorieNinjas → API Ninjas `/v1/nutrition`** | `X-Api-Key`. Free: **3.000 chamadas/mês, 100/hora, sem uso comercial, sem cache, atribuição**; Developer US$ 39 (100 k) | 100/h no free | NLP em inglês ("1 cup rice"); BR não | Por porção (`serving_size_g`, `*_g`, `sodium_mg`) | Implícito no texto | **`calories` e `protein_g` são premium-only** no free | Não (free proíbe cache e comercial) | Média |
| **OpenNutrition (opennutrition.app)** | Download TSV (`opennutrition-dataset-2025.1.zip`). Grátis | — | 5.287 comuns + 3.836 genéricos de restaurante + 4.182 itens de menu (EUA) + 313.442 marcas EUA. BR não | Por 100 g + porções | Sim (EN) | **ODbL** + DbCL modificada; atribuição "OpenNutrition" + link "in every interface where data is displayed, application store listings, your website, legal/about"; dados de OFF mantêm "(c) Open Food Facts contributors" | Sim (ODbL), mas share-alike se redistribuir banco derivado | **Gerado por LLM** (o3-mini/o1, auditado por o1-pro); críticas públicas de erros grosseiros. Evitar |
| **MyFoodData** | Site/app; planilha xlsx (6,8 MB; 9,5 MB com gorduras detalhadas) de SR Legacy + FNDDS "for public use"/"personal use"; página "My Food Data API" existe, sem docs públicas | — | EN, dados do USDA | Por 100 g (padrão da planilha) | Sim (USDA) | Dados subjacentes CC0; termos da compilação MyFoodData não publicados claramente | Preferir o USDA direto | Igual ao USDA |

---

## B. Exemplos REAIS de resposta (abreviados)

### B.1 Open Food Facts — busca "arroz" (search-a-licious, `langs=pt`, filtro Brasil)

`GET https://search.openfoodfacts.org/search?q=arroz&langs=pt&page_size=3&countries_tags=en:brazil&fields=code,product_name,product_name_pt,brands,nutriments,serving_size,countries_tags`

```json
{
  "count": 514, "is_count_exact": true, "page": 1, "page_size": 3, "page_count": 172, "took": 2,
  "hits": [
    {
      "code": "7896800777715",
      "product_name": "Arroz Integral",
      "product_name_pt": "Arroz Integral",
      "brands": ["Arroz Brilhante"],
      "countries_tags": ["en:bolivia", "en:brazil"],
      "nutriments": {
        "energy-kcal_100g": 350, "energy-kj_100g": 1480,
        "proteins_100g": 7.6, "carbohydrates_100g": 78, "fat_100g": 2,
        "saturated-fat_100g": 0.4, "fiber_100g": 2.8,
        "salt_100g": 0.018, "sodium_100g": 0.0072
      }
    },
    {
      "code": "0756869176379",
      "product_name": "Parboiled Rice",
      "brands": ["Arroz"],
      "countries_tags": ["en:united-states"],
      "nutriments": { "energy-kcal_100g": 356, "proteins_100g": 8.89, "carbohydrates_100g": 77.78,
                      "fat_100g": 0, "fiber_100g": 0, "sugars_100g": 0, "sodium_100g": 0 }
    }
  ],
  "debug": { "query": { "query": { "bool": { "should": [
    { "match_phrase": { "product_name.pt": { "query": "arroz", "boost": 2.0 } } },
    { "match_phrase": { "generic_name.pt": { "query": "arroz", "boost": 2.0 } } },
    { "match_phrase": { "brands": { "query": "arroz", "boost": 2.0 } } },
    { "multi_match": { "query": "arroz", "fields": ["product_name.pt", "generic_name.pt", "brands"] } }
  ] } } } }
}
```

Observações: o filtro `countries_tags=en:brazil` como parâmetro não é exato (o 2º hit é dos EUA); use a sintaxe Lucene no `q`: `q=arroz AND countries_tags:"en:brazil"`. O endpoint legado `https://br.openfoodfacts.org/cgi/search.pl?search_terms=arroz&search_simple=1&action=process&json=1&page_size=3&fields=...` devolveu `count: 608` e produtos como "Mini Biscoitos de Arroz Integral Camil Natural" (`7896006779674`, `serving_size: "30 g"`, `sodium_100g: 0.2133` **em g**, `salt_100g: 0.5333`, `energy-kj_modifier: "~"`).

### B.2 Open Food Facts — código de barras brasileiro (Leite Moça, Nestlé)

`GET https://world.openfoodfacts.org/api/v2/product/7891000100103?fields=code,product_name,product_name_pt,brands,quantity,serving_size,serving_quantity,nutriscore_grade,nova_group,categories_tags,countries_tags,nutriments,completeness,last_modified_t,nutrition_data_per`

```json
{
  "code": "7891000100103",
  "status": 1,
  "status_verbose": "product found",
  "product": {
    "code": "7891000100103",
    "product_name": "Leite Condensado Integral moça",
    "product_name_pt": "Leite Condensado Integral moça",
    "brands": "Nestlé, Moça",
    "quantity": "395 g", "product_quantity": 395, "product_quantity_unit": "g",
    "serving_size": "20 g", "serving_quantity": 20,
    "nutrition_data_per": "100g",
    "nutriscore_grade": "e", "nova_group": 4,
    "categories_tags": ["en:dairies", "en:condensed-milks"],
    "countries_tags": ["en:brazil"],
    "completeness": 1.1, "last_modified_t": 1772570022,
    "nutriments": {
      "energy-kcal_100g": 325, "energy-kcal_serving": 65, "energy-kcal_unit": "kcal",
      "energy-kj_100g": 1365, "energy_100g": 1365, "energy_unit": "kJ",
      "proteins_100g": 7, "proteins_serving": 1.4, "proteins_unit": "g",
      "carbohydrates_100g": 55, "carbohydrates_serving": 11,
      "sugars_100g": 55, "added-sugars_100g": 5.5, "added-sugars_modifier": "~",
      "fat_100g": 8, "fat_serving": 1.6, "saturated-fat_100g": 5,
      "fiber_100g": 0,
      "sodium_100g": 0, "sodium_unit": "g", "salt_100g": 0
    }
  }
}
```

Contraexemplo de qualidade (mesma chamada para `7891000315507`, Nescafé Matinal): `nutriments` só tem `nova-group` e `added-sugars`; os macros aparecem apenas em `nutriments_estimated` (estimativa por ingredientes) — nunca use `nutriments_estimated` como se fosse rótulo. Produto inexistente devolve `{"code":"…","status":0,"status_verbose":"product not found"}`.

### B.3 USDA FoodData Central — `/v1/foods/search` com `DEMO_KEY`

`GET https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=rice%20white%20cooked&dataType=SR%20Legacy&pageSize=1`

```json
{
  "totalHits": 2073, "currentPage": 1, "totalPages": 2073,
  "foodSearchCriteria": { "query": "rice white cooked", "dataType": ["SR Legacy"], "pageSize": 1, "pageNumber": 1, "requireAllWords": false },
  "foods": [
    {
      "fdcId": 169711,
      "description": "Rice, white, glutinous, unenriched, cooked",
      "dataType": "SR Legacy",
      "ndbNumber": 20055,
      "publishedDate": "2019-04-01",
      "foodCategory": "Cereal Grains and Pasta",
      "score": 643.23517,
      "foodNutrients": [
        { "nutrientId": 1008, "nutrientName": "Energy", "nutrientNumber": "208", "unitName": "KCAL", "value": 97.0, "derivationCode": "NC" },
        { "nutrientId": 1062, "nutrientName": "Energy", "nutrientNumber": "268", "unitName": "kJ", "value": 406 },
        { "nutrientId": 1003, "nutrientName": "Protein", "nutrientNumber": "203", "unitName": "G", "value": 2.02 },
        { "nutrientId": 1005, "nutrientName": "Carbohydrate, by difference", "nutrientNumber": "205", "unitName": "G", "value": 21.1 },
        { "nutrientId": 1004, "nutrientName": "Total lipid (fat)", "nutrientNumber": "204", "unitName": "G", "value": 0.19 },
        { "nutrientId": 1079, "nutrientName": "Fiber, total dietary", "nutrientNumber": "291", "unitName": "G", "value": 1.0 },
        { "nutrientId": 2000, "nutrientName": "Total Sugars", "nutrientNumber": "269", "unitName": "G", "value": 0.05 },
        { "nutrientId": 1093, "nutrientName": "Sodium, Na", "nutrientNumber": "307", "unitName": "MG", "value": 5.0 },
        { "nutrientId": 1258, "nutrientName": "Fatty acids, total saturated", "nutrientNumber": "606", "unitName": "G", "value": 0.039 }
      ],
      "foodMeasures": []
    }
  ]
}
```

Item Branded (mesma busca com `query=Bauducco&dataType=Branded`): `{"fdcId":1879164,"description":"BAUDUCCO, WAFER, CHOCOLATE, CHOCOLATE","gtinUpc":"875754003399","brandOwner":"Trusouth Oil LLC","brandName":"BAUDUCCO","servingSize":28.0,"servingSizeUnit":"g","householdServingFullText":"4 PIECES","packageWeight":"6.99 oz/198 g","marketCountry":"United States", "foodNutrients":[{"nutrientId":1008,"value":536,"derivationDescription":"Calculated from value per serving size measure"}, …]}` — valores **sempre por 100 g**, mesmo em Branded.

Detalhe `/v1/food/169756` (SR Legacy, arroz branco cru): `"foodPortions":[{"id":85461,"gramWeight":185.0,"amount":1.0,"modifier":"cup","measureUnit":{"name":"undetermined"}}]` → "1 cup = 185 g". Foundation `1104812`: `"foodPortions":[{"gramWeight":30.0,"amount":1.0,"measureUnit":{"name":"RACC"}}]`.

Pegadinha confirmada ao vivo: o parâmetro `nutrients=` de `/v1/food/{id}?format=abridged` recebe **nutrient numbers** (`208,203,205,204,291,269,307`), não os `nutrientId` (`1008,…`). Com IDs a resposta veio com `"foodNutrients": []`.

### B.4 TACO — item cru do JSON (GitHub `marcelosanto/tabela_taco`)

URL raw exata: `https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/TACO.json` (array com 597 objetos; `tabela_alimentos.json` é idêntico). Licença do repositório: MIT.

```json
{
  "id": 1,
  "description": "Arroz, integral, cozido",
  "category": "Cereais e derivados",
  "humidity_percents": 70.1386666666667,
  "energy_kcal": 123.5348925,
  "energy_kj": 516.86999022,
  "protein_g": 2.58825,
  "lipid_g": 1.00033333333333,
  "cholesterol_mg": "NA",
  "carbohydrate_g": 25.80975,
  "fiber_g": 2.74933333333333,
  "ashes_g": 0.463,
  "calcium_mg": 5.204,
  "magnesium_mg": 58.702,
  "manganese_mg": 0.627333333333333,
  "phosphorus_mg": 105.853,
  "iron_mg": 0.262,
  "sodium_mg": 1.24466666666667,
  "potassium_mg": 75.1516666666667,
  "copper_mg": 0.020333333333333,
  "zinc_mg": 0.682666666666667,
  "retinol_mcg": "NA",
  "re_mcg": "",
  "rae_mcg": "",
  "thiamine_mg": 0.08,
  "riboflavin_mg": "Tr",
  "pyridoxine_mg": 0.08,
  "niacin_mg": "Tr",
  "vitaminC_mg": "",
  "saturated_g": 0.3,
  "monounsaturated_g": 0.4,
  "polyunsaturated_g": 0.3,
  "18:2 n-6_g": 0.31
}
```

Unidades: tudo **por 100 g de parte comestível**; energia em `energy_kcal` (kcal) **e** `energy_kj` (kJ); sódio em mg; valores especiais como **string**: `"NA"` (não analisado), `"Tr"` (traço, abaixo do limite de quantificação), `""` (vazio). Há ainda ácidos graxos (`"12:0_g"` … `"18:2t_g"`) e aminoácidos (`tryptophan_g` …), quase sempre vazios.

Alternativa mais limpa (mesmos 597 alimentos, MIT, DOI 10.5281/zenodo.22145839), JSON estático por CDN: `https://brolesi.github.io/taco/foods/561.json`

```json
{"id": 561, "description": "Feijão, carioca, cozido", "moisture_pct": 80.35063,
 "energy_kcal": 76.42409, "energy_kj": 319.75837, "protein_g": 4.775, "lipids_g": 0.54233,
 "cholesterol_mg": null, "carbohydrate_g": 13.59103, "dietary_fiber_g": 8.51033,
 "sodium_mg": 1.759, "potassium_mg": 254.61667, "thiamine_mg": 0.04, "riboflavin_mg": 1e-05,
 "base_name": "Feijão", "preparation": "cozido", "qualifiers": "carioca",
 "category": "Leguminosas e derivados",
 "fatty_acids": {"saturated_g": 0.1, "monounsaturated_g": 0.1, "polyunsaturated_g": 0.3, "c18_2_n6_g": 0.16}}
```

Aqui `Tr` virou `1e-05`, `NA` virou `null`, e a descrição foi facetada em `base_name` / `preparation` / `qualifiers` (ótimo para busca). CSVs em `data/processed/taco/taco_composicao.csv` (cabeçalho: `numero_alimento,descricao,umidade_pct,energia_kcal,energia_kj,proteina_g,lipideos_g,colesterol_mg,carboidrato_g,fibra_g,cinzas_g,calcio_mg,…,sodio_mg,…,base,preparo,qualificadores,categoria`) e `data/processed/pof/pof_medidas_caseiras.csv`:

```
codigo_alimento,descricao_alimento,codigo_preparacao,descricao_preparacao,codigo_medida,descricao_medida,codigo_medida_referencia,descricao_medida_referencia,quantidade_g,codigo_fonte,descricao_fonte
6300101,"ARROZ (POLIDO, PARBOILIZADO)",99,NAO SE APLICA,12,COLHER DE ARROZ/SERVIR,12.0,COLHER DE ARROZ/SERVIR,45.0,1.0,Arroz cozido - colher de arroz cheia
```

### B.5 Referência rápida de endpoints

| Fonte | Endpoint | Notas |
|---|---|---|
| OFF produto | `GET https://world.openfoodfacts.org/api/v2/product/{barcode}?fields=…` (v2 "Deprecated — still supported"); atual: `GET /api/v3.6/product/{barcode}` | `fields` reduz payload; `lc=pt` / `cc=br` para localização |
| OFF busca estruturada | `GET /api/v2/search?categories_tags=…&countries_tags=en:brazil&brands_tags=sadia&page_size=…&fields=…` | 10 req/min; hoje devolve "Page temporarily unavailable" com frequência (throttle global) |
| OFF busca texto | `GET https://search.openfoodfacts.org/search?q=<Lucene>&langs=pt&page=1&page_size=20&fields=…&sort_by=…&facets=…` e `GET /autocomplete`, `GET /document/{code}` | Search-a-licious (Elasticsearch); limite próprio não documentado — trate como parte do orçamento de 10 req/min; `is_count_exact:false` acima de 10.000 |
| OFF legado | `GET https://br.openfoodfacts.org/cgi/search.pl?search_terms=…&search_simple=1&action=process&json=1&page_size=…&fields=…` | subdomínio `br.` filtra país; "don't use it for a search-as-you-type feature" |
| OFF staging | `https://world.openfoodfacts.net` com Basic auth `off:off` | usar em desenvolvimento |
| OFF bulk | `https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz`, `…/en.openfoodfacts.org.products.csv.gz`, `…/openfoodfacts-mongodbdump.gz` (nightly, deltas de 14 dias), Parquet: `https://huggingface.co/datasets/openfoodfacts/product-database/resolve/main/food.parquet?download=true` | "If you need to fetch more than a few hundred products… download the data as a CSV or JSONL file directly" |
| USDA | `GET /v1/foods/search?query=&dataType=Foundation,SR%20Legacy,Branded,Survey%20(FNDDS)&pageSize=&pageNumber=&sortBy=&brandOwner=` · `GET /v1/food/{fdcId}?format=full|abridged&nutrients=208,203,…` · `GET/POST /v1/foods?fdcIds=` · `GET /v1/foods/list` | base `https://api.nal.usda.gov/fdc` |
| FatSecret | `POST https://oauth.fatsecret.com/connect/token` (`grant_type=client_credentials&scope=basic premier barcode localization`) → `Authorization: Bearer` · `foods.search` v3 (`search_expression`, `region`, `language`, `max_results≤50`, `flag_default_serving`*) · `food.get.v4` (`food_id`, `region`, `language`, `include_food_attributes`*) · `food.find_id_for_barcode` v1 = `GET https://platform.fatsecret.com/rest/food/barcode/find-by-id/v1?barcode=<GTIN-13>` (Premier, escopo `barcode`) | * = Premier |

---

## C. Contrato normalizado e interfaces

### C.1 `NormalizedFood`

```ts
// src/domain/food/NormalizedFood.ts
export type FoodSource =
  | 'taco'        // TACO 4ª ed. (embarcado)
  | 'ibge_pof'    // IBGE POF 2008-2009 composição (embarcado)
  | 'usda'        // FoodData Central (online; subconjunto curado embarcado)
  | 'off'         // Open Food Facts (online, cache por usuário)
  | 'fatsecret'   // opcional, fase 2 (cache ≤ 24 h)
  | 'user';       // alimento/receita criado pelo usuário

export interface LocalizedText { pt?: string; en?: string }

/** Sempre por 100 g de parte comestível (ou 100 ml se isLiquid && densidade desconhecida). */
export interface Per100g {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  saturated_fat_g?: number;
  energy_kj?: number;
  /** de onde veio a energia: declarada, convertida de kJ ou calculada por Atwater */
  energySource: 'declared' | 'kj_converted' | 'atwater';
}

export type ServingKind = 'package' | 'household' | 'reference';

export interface Serving {
  id: string;                 // estável dentro do alimento, ex. "off:serving", "ibge:12"
  label: LocalizedText;       // { pt: "colher de sopa cheia", en: "heaping tablespoon" }
  grams: number;
  isDefault: boolean;
  kind: ServingKind;
  source: FoodSource;
}

export interface HouseholdMeasure {
  measure: LocalizedText;     // "colher de sopa", "concha", "xícara", "unidade", "fatia"
  qualifier?: string;         // "cheia", "rasa", "média", "grande"
  grams: number;
  source: 'ibge_pof' | 'usda' | 'fatsecret' | 'off' | 'user';
  sourceCode?: string;        // ex. IBGE codigo_medida "12"
}

export interface Attribution {
  license: 'ODbL-1.0+DbCL' | 'CC0-1.0' | 'TACO' | 'IBGE-open-data' | 'fatsecret-terms' | 'user';
  text: string;               // frase pronta para exibir
  url?: string;               // link à fonte / página do produto (ODbL 4.3)
}

export interface NormalizedFood {
  /** `${source}:${sourceId}` — chave primária global, ex. "off:7891000100103", "taco:1", "usda:169756" */
  id: string;
  source: FoodSource;
  sourceId: string;
  name: LocalizedText;
  brand?: string;
  barcode?: string;           // GTIN-13 normalizado (com zero à esquerda se veio UPC-A)
  category?: LocalizedText;
  /** true = tabela oficial/analítica (TACO, IBGE, USDA Foundation/SR Legacy, FatSecret Generic); false = rótulo/colaborativo */
  verified: boolean;
  per100g: Per100g;
  servings: Serving[];        // ordenadas: default primeiro
  householdMeasures: HouseholdMeasure[];
  isLiquid?: boolean;
  density_g_per_ml?: number;  // para converter ml → g quando conhecido
  /** 0..1 — quão completo está o registro (OFF `completeness`, ou heurística própria) */
  completeness: number;
  /** contador local de uso (para ranking); nunca vem da fonte */
  popularity: number;
  lastFetchedAt: string;      // ISO-8601; para offline bundle = data do build
  attribution: Attribution;
  raw?: unknown;              // payload original (opcional, só em cache online)
}
```

### C.2 `FoodProvider`

```ts
// src/domain/food/FoodProvider.ts
export type Locale = 'pt-BR' | 'en-US';

export interface SearchOptions {
  locale: Locale;
  limit?: number;        // padrão 20
  page?: number;         // 1-based
  signal?: AbortSignal;  // cancelar busca anterior ao digitar
  onlineAllowed?: boolean;
}

export interface FoodProvider {
  readonly source: FoodSource;
  /** true = responde sem rede (bundle SQLite) */
  readonly offline: boolean;
  /** peso base no ranking (ver C.4) */
  readonly rankWeight: number;
  search(query: string, opts: SearchOptions): Promise<NormalizedFood[]>;
  getById(sourceId: string, opts?: { signal?: AbortSignal }): Promise<NormalizedFood | null>;
  /** só provedores com código de barras (OFF, USDA Branded, FatSecret Premier) */
  getByBarcode?(barcode: string, opts?: { signal?: AbortSignal }): Promise<NormalizedFood | null>;
}
```

### C.3 Notas de mapeamento por fonte

Conversões comuns (em `src/domain/food/units.ts`):

```ts
export const kjToKcal = (kj: number) => kj / 4.184;
export const saltToSodiumMg = (salt_g: number) => (salt_g / 2.5) * 1000;   // NaCl: 39,3 % Na ≈ /2,5
export const sodiumGToMg = (sodium_g: number) => sodium_g * 1000;
export const atwaterKcal = (p: number, c: number, f: number, alcohol = 0) => 4 * p + 4 * c + 9 * f + 7 * alcohol;
export const num = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '' || v === 'NA') return undefined;
  if (v === 'Tr' || v === 'tr') return 0;           // traço → 0, marque flag se quiser
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : undefined;
};
```

**Open Food Facts (`off`)**
- `name.pt = product_name_pt ?? product_name`; `name.en = product_name_en ?? product_name`; `brand = brands.split(',')[0].trim()`; `barcode = code`; `category` = primeiro de `categories_tags` sem prefixo `en:`.
- `per100g`: `kcal = num(nutriments['energy-kcal_100g']) ?? kjToKcal(num(nutriments['energy-kj_100g']) ?? num(nutriments['energy_100g']))` (o campo `energy` é sempre kJ) `?? atwaterKcal(...)`, com `energySource` correspondente; `protein_g = proteins_100g`; `carbs_g = carbohydrates_100g`; `fat_g = fat_100g`; `fiber_g = fiber_100g`; `sugar_g = sugars_100g`; `saturated_fat_g = saturated-fat_100g`.
- **Sódio**: `sodium_100g` vem em **g** (`sodium_unit: "g"`) → `sodium_mg = sodium_100g * 1000`; se ausente e houver `salt_100g` → `saltToSodiumMg`.
- Valores podem chegar como **string** (`"2.33333333333333"`) e com `_modifier: "~"` / `"<"`; use `num()` e ignore modificadores.
- `nutrition_data_per` pode ser `"serving"`: os `_100g` continuam sendo calculados pelo OFF a partir de `serving_quantity`; se `serving_quantity` faltar, os `_100g` podem estar ausentes → descarte o item ou marque `completeness` baixa.
- **Nunca** use `nutriments_estimated` para registrar consumo (é estimativa por ingredientes).
- `servings`: se `serving_quantity` (número, unidade `serving_quantity_unit` g/ml) → `{ label: { pt: serving_size }, grams: serving_quantity, kind: 'package', isDefault: true }`; acrescente sempre `{ label: {pt:'100 g', en:'100 g'}, grams: 100, kind:'reference' }`.
- `verified = false`; `completeness = product.completeness ?? 0`; `attribution = { license:'ODbL-1.0+DbCL', text:'Dados de produto: © Open Food Facts contributors (ODbL)', url:`https://br.openfoodfacts.org/produto/${code}` }`.
- Código de barras: OFF armazena UPC-A com zero à esquerda (`0875754001562`); tente o código como veio e, se 12 dígitos, a versão com `0` prefixado. Códigos brasileiros começam com `789`/`790`.

**USDA FoodData Central (`usda`)**
- Sempre por 100 g. `kcal`: `nutrientId 1008` (number 208) → senão `2048` (Energy, Atwater Specific Factors) → senão `2047` (Atwater General) → senão `1062` (kJ, number 268) `/4.184` → senão Atwater. Foundation Foods recentes podem trazer só 2047/2048.
- `protein_g = 1003 (203)`, `carbs_g = 1005 (205, "by difference")`, `fat_g = 1004 (204)`, `fiber_g = 1079 (291)`, `sugar_g = 2000 (269)`, `sodium_mg = 1093 (307)` (**já em mg**), `saturated_fat_g = 1258 (606)`.
- Na busca (`/foods/search`) os nutrientes vêm como `foodNutrients[].{nutrientId, nutrientNumber, unitName, value}`; no detalhe (`/food/{id}`) como `foodNutrients[].{nutrient:{id,number,name,unitName}, amount}` — dois formatos.
- `servings`/`householdMeasures`: `foodPortions[]` → `grams = gramWeight`, label = `[amount] [modifier || measureUnit.name || portionDescription]` (ex. "1 cup"); ignorar `measureUnit.name === 'undetermined'` no rótulo, manter o `modifier`. Branded: `{ grams: servingSize (se servingSizeUnit==='g'), label: householdServingFullText }`; `barcode = gtinUpc` (zero-pad para 13); `brand = brandName ?? brandOwner`.
- `verified = dataType in ('Foundation','SR Legacy','Survey (FNDDS)')`; Branded → false.
- `name.en = description`; `name.pt` só se estiver na tabela de tradução curada (ver D).
- `attribution = { license:'CC0-1.0', text:'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, fdc.nal.usda.gov', url:`https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients` }`.

**TACO (`taco`)**
- Fonte recomendada para o build: `taco_composicao.csv` (brolesi) ou `TACO.json` (marcelosanto). `sourceId = numero_alimento | id`; `name.pt = description`; `category.pt = category`.
- `kcal = energy_kcal` (já kcal; `energy_kj` disponível), `protein_g = protein_g`, `carbs_g = carbohydrate_g`, `fat_g = lipid_g | lipids_g`, `fiber_g = fiber_g | dietary_fiber_g`, `sodium_mg = sodium_mg` (mg), `saturated_fat_g = saturated_g`. Sem açúcares totais na TACO → `sugar_g` indefinido.
- Sanitizar `"NA"`, `"Tr"`, `""`, `1e-05`, `null` com `num()`.
- `servings` = só a referência 100 g; **medidas caseiras vêm do cruzamento manual TACO ↔ IBGE** (tabela `taco_ibge_crosswalk` curada para os ~300 alimentos mais usados: `taco_id → codigo_alimento[+codigo_preparacao]`).
- `verified = true`; `completeness = 1`; `attribution = { license:'TACO', text:'TACO – Tabela Brasileira de Composição de Alimentos, 4ª ed. rev. e ampl. NEPA/UNICAMP, 2011', url:'https://nepa.unicamp.br/' }`.

**IBGE POF (`ibge_pof`)**
- Composição (`tabelacompleta.xls` → CSV no build): por 100 g; chave `codigo_alimento` (7 dígitos) + `codigo_preparacao` (99 = "NAO SE APLICA"); `kcal` = coluna Energia (kcal); macros/fibra nas colunas correspondentes (Tabela 1); açúcar na Tabela 2; sódio na Tabela 3 (mg).
- Medidas (`tabelamedidas_bd.xls` → `pof_medidas_caseiras.csv`): cada linha = `(codigo_alimento, codigo_preparacao, codigo_medida, descricao_medida, quantidade_g, descricao_fonte)`. Mapear `descricao_medida` (ex. `COLHER DE SOPA`, `CONCHA`, `XICARA`, `UNIDADE`, `FATIA`, `COPO`, `PRATO RASO`) → `HouseholdMeasure.measure.pt` normalizado + `qualifier` extraído de `descricao_fonte` ("cheia", "rasa", "média"); `grams = quantidade_g`.
- `verified = true`; `attribution = { license:'IBGE-open-data', text:'IBGE. Pesquisa de Orçamentos Familiares 2008-2009: Tabelas de Composição Nutricional dos Alimentos Consumidos no Brasil; Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil. Rio de Janeiro, 2011' }`.

**FatSecret (`fatsecret`, fase 2)**
- `food.get.v4` → `servings.serving[]`; escolher a porção com `metric_serving_unit === 'g'` e calcular `per100g = valor * 100 / metric_serving_amount`; `sodium` já em mg; `calories` em kcal. Se só `ml`, marcar `isLiquid` e usar densidade se conhecida.
- `servings` = cada `serving` (`label = serving_description`, `grams = metric_serving_amount` se g); `householdMeasures` = `measurement_description` + `number_of_units`.
- `verified = food_type === 'Generic'`; `brand = brand_name`; `lastFetchedAt` obrigatório e **TTL 24 h** (cláusula 1.5); nunca gravar em bundle.

### C.4 Merge, dedupe e ranking

```ts
// src/domain/food/merge.ts
import { NormalizedFood, FoodSource } from './NormalizedFood';

const SOURCE_WEIGHT: Record<FoodSource, number> = {
  taco: 30, ibge_pof: 25, usda: 20, fatsecret: 15, off: 10, user: 35,
};

export const slug = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
   .replace(/[^a-z0-9]+/g, ' ').trim();

/** chave de deduplicação: barcode > (nome normalizado + marca) */
export const dedupeKey = (f: NormalizedFood) =>
  f.barcode ? `bc:${f.barcode}` : `nm:${slug(f.name.pt ?? f.name.en ?? '')}|${slug(f.brand ?? '')}`;

export function mergeDuplicates(items: NormalizedFood[]): NormalizedFood[] {
  const groups = new Map<string, NormalizedFood[]>();
  for (const it of items) {
    const k = dedupeKey(it);
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  return [...groups.values()].map(group => {
    // vencedor: verificado > peso da fonte > completude
    const [winner, ...rest] = [...group].sort((a, b) =>
      Number(b.verified) - Number(a.verified) ||
      SOURCE_WEIGHT[b.source] - SOURCE_WEIGHT[a.source] ||
      b.completeness - a.completeness);
    // união de porções/medidas caseiras (sem repetir gramas iguais)
    const seen = new Set(winner.servings.map(s => Math.round(s.grams)));
    for (const other of rest) {
      for (const s of other.servings) if (!seen.has(Math.round(s.grams))) { winner.servings.push(s); seen.add(Math.round(s.grams)); }
      winner.householdMeasures.push(...other.householdMeasures.filter(h => !winner.householdMeasures.some(w => w.measure.pt === h.measure.pt && Math.abs(w.grams - h.grams) < 1)));
      if (!winner.name.en && other.name.en) winner.name.en = other.name.en;
      if (!winner.name.pt && other.name.pt) winner.name.pt = other.name.pt;
    }
    return winner;
  });
}

export function score(f: NormalizedFood, query: string, locale: 'pt-BR' | 'en-US'): number {
  const q = slug(query);
  const name = slug((locale === 'pt-BR' ? f.name.pt : f.name.en) ?? f.name.pt ?? f.name.en ?? '');
  const tokens = name.split(' ');
  let match = 0;
  if (name === q) match = 100;
  else if (name.startsWith(q)) match = 80;                    // prefixo
  else if (tokens.some(t => t.startsWith(q))) match = 65;     // prefixo de token ("arroz" em "biscoito de arroz")
  else if (q.split(' ').every(t => name.includes(t))) match = 50;
  else return -Infinity;                                       // não casa
  const generic = f.verified && !f.brand ? 15 : 0;            // genérico verificado > TACO > marca
  const localeBonus = (locale === 'pt-BR' ? !!f.name.pt : !!f.name.en) ? 10 : 0;
  const shortNameBonus = Math.max(0, 8 - tokens.length);      // "Arroz, tipo 1, cozido" antes de descrições longas
  return match + generic + SOURCE_WEIGHT[f.source] + localeBonus + shortNameBonus
       + 10 * f.completeness + 6 * Math.log1p(f.popularity);
}
```

Regras de ranking (ordem de desempate): (1) exato > prefixo > prefixo de token > contém todos os termos; (2) genérico verificado (TACO/IBGE/USDA SR) > marca; (3) peso da fonte (`user` > `taco` > `ibge_pof` > `usda` > `fatsecret` > `off`); (4) idioma do usuário presente no nome; (5) completude; (6) popularidade local (`log1p(uso)`), com "recentes" do usuário mostrados em seção própria antes da lista. Para `en-US` inverta o peso de `usda` (20 → 32) e `taco` (30 → 18): o genérico do idioma vem primeiro.

Orquestração (`FoodSearchService`): `Promise.allSettled` dos provedores offline primeiro (resposta em < 50 ms via FTS5), depois os online com `AbortSignal` e debounce de 400 ms e mínimo de 3 caracteres; quando o online chega, o resultado é re-mesclado e re-ranqueado sem perder a posição dos itens já exibidos (append + "mais resultados"). Busca por barcode: `local_cache → off → usda(Branded) → fatsecret?`, parando no primeiro `not null`.

---

## D. Estratégia recomendada para o MVP

### D.1 Embarcar offline (bundle SQLite pré-construído nos assets)

| Conjunto | Itens | Tamanho aprox. | Papel |
|---|---|---|---|
| **TACO 4ª ed.** (`taco_composicao.csv` → tabela `foods`) | 597 | ~250 KB | genéricos BR verificados, base de tudo |
| **IBGE POF composição** (`tabelacompleta.xls` → `foods`) | ~1.970 | ~600 KB | cobre preparações que a TACO não tem (pão de queijo, coxinha, feijoada, refrigerante, biscoito recheado…) |
| **IBGE Tabela de Medidas Referidas** (`tabelamedidas_bd.xls` → `household_measures`) | 11.801 linhas | ~900 KB | **colher de sopa, concha, xícara, unidade, fatia, copo, prato** em gramas |
| **Crosswalk TACO ↔ IBGE** (curado à mão no build) | ~300 alimentos mais usados | ~20 KB | dá medidas caseiras aos itens TACO |
| **USDA SR Legacy — subconjunto curado e traduzido** (pt/en) | 500–800 itens (frutas, carnes, laticínios, grãos, óleos, castanhas, fast food genérico) | ~800 KB | genéricos EN para o mercado en-US e para lacunas BR (ex. "abacate" existe na TACO, "salmão defumado" não) |
| Índice FTS5 (`unicode61 remove_diacritics 2`) sobre `name_pt`, `name_en`, `base_name`, `brand` | — | ~1 MB | busca offline instantânea sem acento |

Total < 5 MB. Gerado por script Node no build (`scripts/build-food-db.ts`) a partir dos arquivos originais (NEPA XLSX, IBGE XLS, USDA SR Legacy JSON), com testes de sanidade (kcal ≈ Atwater ± 15 %, macros ≤ 100 g). Bibliotecas: `expo-sqlite` (Expo SDK 50+) ou `@op-engineering/op-sqlite`; copiar o `.db` dos assets no primeiro launch.

Por que **não** embarcar OFF: (a) o dump BR filtrado teria ~36 k produtos com muitos incompletos; (b) o banco embarcado é uma "Derivative Database" publicamente distribuída → teria de ser licenciada em ODbL e disponibilizada (ver E). Buscar sob demanda + cache por usuário resolve os dois problemas.

Por que **não** usar TBCA: CC BY-NC-ND proíbe comercialização e derivações. Só se negociar licença com FoRC/USP (contato pelo site).

### D.2 Buscar online

- **Código de barras** → `GET /api/v2/product/{code}?fields=…` (ou v3.6) direto do dispositivo com `User-Agent: SeuApp/1.0 (contato@…)`; limite de 15 req/min **por usuário** — irrelevante para uso humano. Fallback: USDA Branded (`/foods/search?query=<gtin>` — só produtos dos EUA). Produto não encontrado → tela "adicionar manualmente" (fase 2: enviar foto ao OFF via staging → produção, requer conta).
- **Busca de industrializados BR** (texto) → search-a-licious `q=<termo> AND countries_tags:"en:brazil"&langs=pt&page_size=20&fields=code,product_name,product_name_pt,brands,serving_size,serving_quantity,nutriments,completeness`, com debounce 400 ms, mínimo 3 caracteres, cancelamento por `AbortSignal`, e nunca o `cgi/search.pl` para search-as-you-type ("you would be blocked very quickly").
- **Genéricos EN** (usuário en-US ou termo não encontrado no bundle) → USDA `/foods/search?query=&dataType=SR%20Legacy,Foundation&pageSize=20` com a chave do app (1.000 req/h/IP; como cada dispositivo tem IP próprio, o limite é por usuário na prática). Mostrar aviso "sem internet" se offline; o bundle cobre o básico.
- **FatSecret**: adiar. Basic/Premier Free são "US Only"; BR/pt exige Premier (preço sob consulta) e os termos impedem cache > 24 h — incompatível com "funciona offline". Reavaliar quando houver receita.

### D.3 Política de cache (SQLite, mesmo banco do bundle, tabelas separadas)

```sql
-- somente leitura, vem do bundle (rebuild a cada release)
CREATE TABLE bundle_foods (id TEXT PRIMARY KEY, source TEXT, json TEXT NOT NULL);
CREATE VIRTUAL TABLE bundle_fts USING fts5(id UNINDEXED, name_pt, name_en, base_name, category, tokenize='unicode61 remove_diacritics 2');
CREATE TABLE household_measures (food_id TEXT, measure_pt TEXT, measure_en TEXT, qualifier TEXT, grams REAL, source TEXT);

-- cache online, gravável
CREATE TABLE food_cache (
  id TEXT PRIMARY KEY, source TEXT NOT NULL, barcode TEXT, json TEXT NOT NULL,
  fetched_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, pinned INTEGER DEFAULT 0 -- pinned=1 se está no diário
);
CREATE INDEX food_cache_barcode ON food_cache(barcode);
CREATE TABLE search_cache (key TEXT PRIMARY KEY, ids TEXT NOT NULL, fetched_at INTEGER NOT NULL); -- key = source|locale|query
CREATE TABLE food_usage (food_id TEXT PRIMARY KEY, count INTEGER NOT NULL, last_used INTEGER NOT NULL);
```

- TTL: OFF/USDA produto **30 dias** (refresh silencioso em background se > 7 dias e online); busca **24 h**; itens `pinned` (usados no diário) nunca expiram — o registro do diário guarda uma **cópia imutável** dos macros (`per100g` + gramas) para o histórico não mudar quando a fonte mudar. FatSecret (se um dia): `expires_at = fetched_at + 24h` e purga obrigatória.
- Limite de tamanho: LRU acima de 20 MB em `food_cache`.
- Cache é **uso privado por usuário** → não dispara share-alike da ODbL; não sincronizar esse cache entre usuários via serviço seu (isso já seria "publicly convey" de banco derivado).

### D.4 Tela "Fontes de dados e licenças" (obrigatória) — textos prontos

- **Open Food Facts**: "Informações de produtos embalados obtidas de Open Food Facts (https://world.openfoodfacts.org), © Open Food Facts contributors, disponibilizadas sob a Open Database License (ODbL); conteúdos individuais sob a Database Contents License (DbCL); imagens sob CC BY-SA 3.0." Em cada produto, link "Ver no Open Food Facts" para `https://br.openfoodfacts.org/produto/{code}` (o termo de uso pede link "to the product page, when the information… pertain to a specific product").
- **USDA**: "U.S. Department of Agriculture, Agricultural Research Service. FoodData Central, https://fdc.nal.usda.gov (dados em domínio público, CC0 1.0)."
- **TACO**: "Tabela Brasileira de Composição de Alimentos – TACO, 4ª edição revisada e ampliada. NEPA/UNICAMP, Campinas, 2011. https://nepa.unicamp.br/"
- **IBGE**: "IBGE – Instituto Brasileiro de Geografia e Estatística. Pesquisa de Orçamentos Familiares 2008-2009: Tabelas de Composição Nutricional dos Alimentos Consumidos no Brasil e Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil. Rio de Janeiro, 2011."
- **FatSecret** (se ativado): selo "Powered by fatsecret Platform API" visível em toda tela com dados deles e em pelo menos um lugar acessível sem login.
- Aviso geral (o próprio OFF exige postura semelhante): "Os valores nutricionais são fornecidos por terceiros e podem conter erros; confira o rótulo do produto."

---

## E. Riscos legais e termos — leitura precisa

### E.1 ODbL 1.0 (Open Food Facts, OpenNutrition) — o que muda entre **usar** e **redistribuir**

Definições do texto da licença:
- **Derivative Database**: "a database based upon the Database, and includes any translation, adaptation, arrangement, modification, or any other alteration of the Database or of a Substantial part of the Contents."
- **Produced Work**: "a work (such as an image, audiovisual material, text, or sounds) resulting from using the whole or a Substantial part of the Contents (via a search or other query) from this Database."
- **Substantial**: "substantial in terms of quantity or quality… The repeated and systematic Extraction or Re-utilisation of insubstantial parts may amount to the Extraction or Re-utilisation of a Substantial part."
- **Publicly**: "to Persons other than You or under Your control…" — logo, tudo que fica no aparelho do usuário sem ser distribuído a terceiros por você é uso **privado**.

Obrigações:
- **4.2 / 4.3 (atribuição)**: ao usar publicamente o banco ou um *Produced Work* (a tela do app é um Produced Work), é preciso "a notice associated with the Produced Work reasonably calculated to make any Person… aware that Content was obtained from the Database" e manter avisos de licença. → tela de fontes + link no produto resolvem.
- **4.4 (share-alike)**: "Any Derivative Database that You Publicly Use must be only under the terms of: This License; a later version; or a compatible license." Só dispara quando **você usa/transmite publicamente um banco derivado**.
- **4.5 (exceção)**: criar Produced Works "does not create a Derivative Database for purposes of Section 4.4" — mostrar dados no app **não** obriga a abrir nada (nem o código do app, que é software, não banco).
- **4.6**: se distribuir publicamente um banco derivado, tem de dar acesso a ele (cópia legível por máquina ou diff).
- **4.7/4.8**: pode usar DRM/medidas técnicas só se também distribuir versão sem restrição.

Aplicado ao app:
1. **Chamar a API e cachear no aparelho** → uso privado + Produced Work. Obrigação: atribuição (4.3). Sem share-alike. App pode ser proprietário e pago. ✅
2. **Embarcar um dump OFF (ou OFF+TACO+USDA num único SQLite) dentro do APK/IPA** → você está *conveying publicly* um Derivative Database → esse banco (não o app) precisa ser ODbL e acessível (4.4 + 4.6). Como TACO e USDA permitem isso, seria legal, mas você abre mão da exclusividade do seu banco curado. ❌ para o MVP.
3. **Backend seu que mescla OFF com dados próprios e serve aos usuários** → a comunidade OFF entende como banco derivado publicamente usado ("If you combine data from Open Food Facts with other databases, then the ODbL requires that the resulting database must be released as open data as well" — fórum OFF). Manter as fontes em tabelas separadas com origem rastreável (Collective Database) é a defesa usual, mas a fronteira não é oficialmente definida. Evitar enquanto não houver backend.
4. Dados que **você** adicionar ao OFF (fotos/valores) são doados sob ODbL/DbCL — sem problema.
5. **DbCL** cobre o conteúdo individual (sem obrigações além de manter avisos); **imagens CC BY-SA 3.0** — se exibir fotos de produto, atribuir e não misturar com material próprio de forma que exija share-alike da sua UI (exibir a foto com crédito é seguro).
6. Terceiros: "Other rights of third parties may apply" — marcas e design de embalagem nas fotos; exibição informativa é uso legítimo, mas não use as fotos em marketing.

### E.2 FatSecret
- Cláusula 1.5: "You may not continue to use and must immediately remove or replace… any Content… not explicitly identified as being storable indefinitely within 24 hours after the time at which you obtained the Content." → sem banco offline, sem histórico com dados deles além de 24 h a menos que o campo esteja marcado como armazenável. Um diário alimentar precisaria guardar só os números digitados pelo usuário (cópia própria) — zona cinzenta.
- 1.3: atribuição "in every place that Content is provided or displayed"; badge/"Powered by fatsecret Platform API"; se há login, atribuição também sem login.
- 1.7(i): sem copiar, sublicenciar, transferir a API "without fatsecret's prior written consent". 1.1: pode encerrar "at any time for any reason".
- Basic e Premier Free = **US Only**/inglês; BR/pt = Premier (localização "only made available to select accounts"); barcode = Premier.

### E.3 TBCA
- CC BY-NC-ND 4.0: "Não é permitida a comercialização" e nada de derivações. Datasets do Kaggle e scrapers do GitHub não mudam a licença de origem. Usar num app vendido = violação. Citação isenta apenas quando o uso é para "cálculo de informação nutricional para rotulagem".

### E.4 TACO e IBGE
- **TACO**: NEPA não publica licença formal (não há "termos de uso" na página; o XLSX e o PDF são distribuídos livremente e reproduzidos em dezenas de apps e repositórios). Risco baixo; mitigação: citação completa, não alterar valores, e opcionalmente e-mail ao NEPA informando o uso comercial.
- **IBGE**: Decreto 8.777/2016 define dados abertos como de livre uso, reuso e redistribuição, "sujeitos, no máximo, à exigência de creditar a sua autoria"; o IBGE publica Plano de Dados Abertos. A página "Termos de uso" do IBGE não pôde ser lida (proteção Cloudflare) — verificar manualmente; não há indício de restrição.

### E.5 USDA
- CC0/domínio público: "FoodData Central data are in the public domain and they are not copyrighted." Pedem citar a fonte (cortesia, não exigência legal). Sem restrições de cache, tradução ou venda.

### E.6 Demais APIs
- **Edamam**: cache só dos 4 macros + id/label/imagem, e só em planos que o declarem; proíbe "automated programatic requests with the goal to collect, scrape or save data"; atribuição com imagem. Incompatível com offline.
- **Spoonacular**: cache máx. 1 h (com permissão escrita); "may not… copy or store". Incompatível.
- **API Ninjas (CalorieNinjas)**: free proíbe uso comercial e cache; `calories`/`protein_g` só no pago. Descartar.
- **Nutritionix**: sem free tier; contrato enterprise. Descartar.
- **OpenNutrition**: ODbL (mesmas regras de E.1) + exige atribuição também na **ficha da loja**; dados gerados por LLM — risco reputacional (erros de calorias relatados publicamente). Descartar.

### E.7 Riscos operacionais
- OFF pode banir IP ao estourar limite (mitigado por chamadas do próprio dispositivo com User-Agent correto e sem search-as-you-type no endpoint legado); HTTP 503 em picos globais → sempre ter fallback offline e mensagem amigável.
- Dependência de repositórios GitHub de terceiros (marcelosanto, brolesi): baixar os arquivos originais do NEPA/IBGE no build e versionar os CSVs no seu repo; não buscar em runtime.
- ANVISA/rotulagem: o app informa, não substitui rótulo; manter disclaimer.

---

## F. URLs consultadas

Open Food Facts
- https://openfoodfacts.github.io/openfoodfacts-server/api/ (introdução, rate limits, User-Agent, staging)
- https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/docs/api/index.md (texto-fonte dos limites: 15 req/min produto, 10 req/min busca)
- https://world.openfoodfacts.org/data (dumps JSONL/CSV/MongoDB/Parquet, licenças)
- https://world.openfoodfacts.org/terms-of-use (ODbL/DbCL/CC BY-SA, atribuição)
- https://search.openfoodfacts.org/openapi.json (parâmetros de `/search`, `/autocomplete`, `/document/{id}`)
- https://forum.openfoodfacts.org/t/conditions-to-use-the-open-food-facts-api/443 (interpretação comunitária do share-alike)
- Chamadas ao vivo: `https://world.openfoodfacts.org/api/v2/product/7891000100103`, `…/7891000315507`, `https://br.openfoodfacts.org/cgi/search.pl?search_terms=arroz…`, `https://search.openfoodfacts.org/search?q=arroz…`, `…q=bauducco AND countries_tags:"en:brazil"`, `…q=sadia`, `https://world.openfoodfacts.org/api/v2/search?brands_tags=sadia…`
- https://opendatacommons.org/licenses/odbl/1-0/ e https://opendatacommons.org/licenses/odbl/summary/

USDA FoodData Central
- http://fdc.nal.usda.gov/api-guide/ (1.000 req/h; DEMO_KEY 30/h e 50/dia; endpoints; CC0)
- http://fdc.nal.usda.gov/download-datasets/ (tamanhos dos downloads)
- http://fdc.nal.usda.gov/data-documentation/ (tipos de dados)
- Chamadas ao vivo: `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=DEMO_KEY&query=rice%20white%20cooked&dataType=SR%20Legacy`, `…query=rice%20cooked&dataType=Foundation`, `…query=Bauducco&dataType=Branded`, `https://api.nal.usda.gov/fdc/v1/food/169756`, `…/food/1104812`, `…/food/169756?format=abridged&nutrients=208,203,205,204,291,269,307`
- https://www.researchgate.net/figure/Data-Review-A-Out-of-7-793-foods-in-the-SR-Legacy-datatype-in-FDC-dataset_fig2_364066278 (7.793 alimentos SR Legacy)

TACO
- https://nepa.unicamp.br/tabela-brasileira-de-composicao-de-alimentos-4a-edicao/ (página oficial)
- https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf (PDF, 744 KB)
- https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/Taco-4a-Edicao.xlsx (XLSX oficial, 322 KB; via https://www.nepa.unicamp.br/arquivo/uploads/taco-4a-edicao/taco-4a-edicao-2/)
- https://github.com/marcelosanto/tabela_taco e raw https://raw.githubusercontent.com/marcelosanto/tabela_taco/main/TACO.json
- https://github.com/brolesi/taco (README, LICENSE MIT, `docs/dicionario-dados.md`, `data/processed/taco/taco_composicao.csv`, `data/processed/pof/pof_medidas_caseiras.csv`) e https://brolesi.github.io/taco/foods/561.json, https://brolesi.github.io/taco/coverage.json
- https://github.com/raulfdm/taco-api (GraphQL, https://taco-api.netlify.app/)
- https://github.com/machine-learning-mocha/taco (arquivado → brolesi/taco)

TBCA
- https://www.tbca.net.br/ (versão 7.3, ~5.700 alimentos, termos CC BY-NC-ND 4.0, citação)
- https://github.com/sparremberger/tbca-scraper, https://github.com/CauaHenrique19/webscrapping-tbca, https://github.com/resen-dev/web-scraping-tbca, https://www.kaggle.com/datasets/proflucassoares/alimentos-brasileiros-com-dados-da-tbca

IBGE POF 2008-2009
- https://ftp.ibge.gov.br/Orcamentos_Familiares/Pesquisa_de_Orcamentos_Familiares_2008_2009/Tabelas_de_Composicao_Nutricional_dos_Alimentos_Consumidos_no_Brasil/ (`tab01.zip`…`tab05.zip`, `tabelacompleta.zip` 339 KB → `tabelacompleta.xls` 1,29 MB)
- https://ftp.ibge.gov.br/Orcamentos_Familiares/Pesquisa_de_Orcamentos_Familiares_2008_2009/Tabela_de_Medidas_Referidas_para_os_Alimentos_Consumidos_no_Brasil/ (`tabelamedidas.zip` 534 KB; `tabelamedidas_bd.zip` 439 KB → `tabelamedidas_bd.xls` 2,16 MB, aba "Tab_Medidas Caseiras")
- https://www.ibge.gov.br/estatisticas/sociais/populacao/9050-pesquisa-de-orcamentos-familiares.html?edicao=9063 (bloqueado a robôs; abrir no navegador)
- https://www.ibge.gov.br/np_download/novoportal/documentos_institucionais/Plano_de_Dados_Abertos_IBGE_2024_2025.pdf e https://www.ibge.gov.br/acesso-informacao/dados-abertos.html

FatSecret
- https://platform.fatsecret.com/api-editions (Basic 5.000/dia, Premier Free, Premier 58+ países / 26 idiomas)
- https://platform.fatsecret.com/docs/guides/authentication/oauth2 (token endpoint, escopos, 86.400 s)
- https://platform.fatsecret.com/docs/guides/localization (BR/pt; "premium feature")
- https://platform.fatsecret.com/docs/v3/foods.search, https://platform.fatsecret.com/docs/v4/food.get, https://platform.fatsecret.com/docs/v1/food.find_id_for_barcode
- https://platform.fatsecret.com/terms (cláusulas 1.1, 1.2, 1.3, 1.5, 1.7) e https://platform.fatsecret.com/attribution

Outras APIs
- https://developer.edamam.com/food-database-api (planos, cache, atribuição)
- https://developer.nutritionix.com/ ("no longer able to maintain a public free-access tier")
- https://spoonacular.com/food-api/pricing e https://spoonacular.com/food-api/terms
- https://api-ninjas.com/api/nutrition e https://api-ninjas.com/pricing
- https://www.opennutrition.app/download, https://www.opennutrition.app/about, https://www.opennutrition.app/terms, https://news.ycombinator.com/item?id=43569190
- https://myfooddata.com/about.php, https://tools.myfooddata.com/nutrition-facts-database-spreadsheet.php, https://api1.myfooddata.com/

Leitores de código de barras
- https://visioncamera.margelo.com/docs/guides/code-scanning e https://margelo.com/blog/react-native-qr-barcode-scanner-visioncamera-v5
- https://scanbot.io/blog/popular-open-source-react-native-barcode-scanners/
- https://github.com/mgcrea/vision-camera-barcode-scanner, https://github.com/gev2002/react-native-vision-camera-barcodes-scanner

---

## Apêndice — Leitura de código de barras em React Native (um parágrafo)

Use **react-native-vision-camera**: na V5 (2026) o scanner é um pacote separado ("so you only pull in MLKit's native dependencies if you actually need them") com `<CodeScanner />`, `useBarcodeScannerOutput()` e `useBarcodeScanner()`, e "V5 uses MLKit on both platforms, so formats and accuracy stay aligned"; na V4 o hook é `useCodeScanner({ codeTypes: ['ean-13','ean-8','upc-a','upc-e'], onCodeScanned })`, com ML Kit no Android (modelo ~2,2 MB embarcado ou via Google Play services) e VisionKit no iOS. Liste **só** os formatos necessários (EAN-13/EAN-8/UPC-A/UPC-E; QR não) — "Detection runs faster, and you'll get fewer false positives on lookalike codes". Caveats conhecidos: EAN-13 às vezes detectado como Code-128 (por isso não habilite Code-128), UPC-A devolvido como EAN-13 com zero à esquerda no iOS, sem suporte a códigos invertidos no Android. Normalize para GTIN-13 (pad com zeros), valide o dígito verificador antes de chamar a API e faça debounce de 1,5 s por código para não repetir a consulta. Alternativa em projetos Expo managed: `expo-camera` (`<CameraView barcodeScannerSettings={{ barcodeTypes: ['ean13','ean8','upc_a','upc_e'] }} onBarcodeScanned={…} />`), que usa os mesmos motores nativos.
