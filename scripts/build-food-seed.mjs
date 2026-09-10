#!/usr/bin/env node
/**
 * Builds the bundled food dataset from the official Brazilian tables.
 *
 * Inputs (data/raw/, immutable):
 *   TACO.json            TACO 4th edition as JSON (github.com/marcelosanto/tabela_taco)
 *   tabelacompleta.xls   IBGE POF 2008-2009, nutritional composition (~1,970 foods)
 *   tabelamedidas_bd.xls IBGE POF 2008-2009, household measures in grams (11,801 rows)
 *
 * Output: assets/data/foods.seed.json — every food normalised to per-100 g
 * macros with household measures attached, ready to be imported into SQLite on
 * first launch. Also writes data/seed-report.txt so the TACO ↔ IBGE crosswalk
 * can be reviewed by a human.
 *
 * Run: node scripts/build-food-seed.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

import {
  loadGlossary,
  translateLabel,
  translateName,
} from './lib/glossary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data', 'raw');
const OUT = path.join(ROOT, 'assets', 'data', 'foods.seed.json');
const REPORT = path.join(ROOT, 'data', 'seed-report.txt');
const GLOSSARY = path.join(ROOT, 'data', 'glossary', 'pt-en.json');

/**
 * English names come from the reviewed glossary, term by term, and only when
 * every term of the name is known (docs/research/08-nomes-em-ingles.md). Half
 * a name never ships: the app then shows the whole Portuguese name.
 */
const glossary = loadGlossary(JSON.parse(readFileSync(GLOSSARY, 'utf8')));

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

/** Lowercase, no diacritics, single spaces. Used for matching only. */
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'e',
  'ou',
  'em',
  'com',
  'a',
  'o',
  'etc',
  'nao',
  'especificado',
  'especificada',
  'qualquer',
  'sabor',
  'tipo',
  'in',
  'natura',
  'para',
  'ao',
  'no',
  'na',
]);

function tokens(text) {
  return normalize(text)
    .split(' ')
    .filter(t => t && !STOP_WORDS.has(t));
}

/**
 * The IBGE tables are typed in upper case without diacritics ("PAO DE SAL",
 * "ACAI", "FEIJAO"). This dictionary restores the spelling a Brazilian expects to
 * read. Words not listed are kept as typed, in lower case.
 */
const ACCENTS = {
  pao: 'pão',
  paes: 'pães',
  acai: 'açaí',
  cafe: 'café',
  feijao: 'feijão',
  macarrao: 'macarrão',
  mamao: 'mamão',
  limao: 'limão',
  acucar: 'açúcar',
  maca: 'maçã',
  macas: 'maçãs',
  cha: 'chá',
  camarao: 'camarão',
  linguica: 'linguiça',
  abobora: 'abóbora',
  po: 'pó',
  requeijao: 'requeijão',
  pessego: 'pêssego',
  melao: 'melão',
  agua: 'água',
  pate: 'patê',
  mucarela: 'muçarela',
  mussarela: 'muçarela',
  muzarella: 'muçarela',
  muzzarela: 'muçarela',
  sanduiche: 'sanduíche',
  hamburguer: 'hambúrguer',
  acaraje: 'acarajé',
  vatapa: 'vatapá',
  pirao: 'pirão',
  baiao: 'baião',
  cara: 'cará',
  rucula: 'rúcula',
  agriao: 'agrião',
  brocolis: 'brócolis',
  grao: 'grão',
  graos: 'grãos',
  avela: 'avelã',
  amendoa: 'amêndoa',
  amendoas: 'amêndoas',
  oleo: 'óleo',
  oleos: 'óleos',
  picole: 'picolé',
  guarana: 'guaraná',
  hortela: 'hortelã',
  oregano: 'orégano',
  acafrao: 'açafrão',
  file: 'filé',
  files: 'filés',
  coxao: 'coxão',
  musculo: 'músculo',
  acem: 'acém',
  figado: 'fígado',
  coracao: 'coração',
  mocoto: 'mocotó',
  lingua: 'língua',
  salmao: 'salmão',
  tilapia: 'tilápia',
  tucunare: 'tucunaré',
  traira: 'traíra',
  mexilhao: 'mexilhão',
  organico: 'orgânico',
  organica: 'orgânica',
  maracuja: 'maracujá',
  cupuacu: 'cupuaçu',
  tamara: 'tâmara',
  roma: 'romã',
  caja: 'cajá',
  macadamia: 'macadâmia',
  linhaca: 'linhaça',
  bobo: 'bobó',
  tacaca: 'tacacá',
  cuxa: 'cuxá',
  pacoca: 'paçoca',
  pe: 'pé',
  cachaca: 'cachaça',
  pimentao: 'pimentão',
  jilo: 'jiló',
  chicoria: 'chicória',
  almeirao: 'almeirão',
  ravioli: 'ravióli',
  nectar: 'néctar',
  uisque: 'uísque',
  para: 'pará',
  pinhao: 'pinhão',
  salsao: 'salsão',
  empadao: 'empadão',
  rizole: 'risole',
  adocante: 'adoçante',
  dende: 'dendê',
  shoyo: 'shoyu',
  contrafile: 'contrafilé',
  jaba: 'jabá',
  sertao: 'sertão',
  suina: 'suína',
  suino: 'suíno',
  capuccino: 'cappuccino',
  soluvel: 'solúvel',
  energetico: 'energético',
  isotonico: 'isotônico',
  gas: 'gás',
  tonica: 'tônica',
  chopp: 'chope',
  sake: 'saquê',
  calabreza: 'calabresa',
  bufalo: 'búfalo',
  pascoa: 'páscoa',
  cafezinho: 'cafezinho',
  medo: 'médio',
  medio: 'médio',
  xicara: 'xícara',
  porcao: 'porção',
  pedaco: 'pedaço',
  racao: 'ração',
  vo: 'vó',
  mae: 'mãe',
  mae_benta: 'mãe-benta',
  bolacha: 'bolacha',
  proteina: 'proteína',
  vitaminado: 'vitaminado',
  tremoco: 'tremoço',
  cuscuz: 'cuscuz',
  virado: 'virado',
  pinhoada: 'pinhoada',
  ambrosia: 'ambrosia',
  cuca: 'cuca',
  rocambole: 'rocambole',
  quibebe: 'quibebe',
  paçoquinha: 'paçoquinha',
  pacoquinha: 'paçoquinha',
  creme: 'creme',
  geleia: 'geleia',
  jile: 'jiló',
};

/** "PAO DE SAL" → "Pão de sal"; "BANANA (OURO, PRATA, D´ÁGUA, DA TERRA, ETC)" → "Banana (ouro, prata, d'água, da terra)". */
export function prettifyIbgeName(raw) {
  const text = String(raw)
    .replace(/´/g, "'")
    .replace(/\s*,?\s*ETC\.?\)/g, ')')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text
    .toLowerCase()
    .split(' ')
    .map(word => {
      const match = word.match(/^([("']*)([^()"',]+)([)"',]*)$/);
      if (!match) return word;
      const [, open, core, close] = match;
      const key = core.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return `${open}${ACCENTS[key] ?? core}${close}`;
    });
  const joined = words.join(' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

const PREP_LABEL = {
  'NAO SE APLICA': '',
  'COZIDO(A)': 'cozido',
  'FRITO(A)': 'frito',
  'ASSADO(A)': 'assado',
  'REFOGADO(A)': 'refogado',
  'CRU(A)': 'cru',
  ENSOPADO: 'ensopado',
  'GRELHADO(A)/BRASA/CHURRASCO': 'grelhado',
  'MOLHO VERMELHO': 'ao molho vermelho',
  'EMPANADO(A)/A MILANESA': 'à milanesa',
  'MOLHO BRANCO': 'ao molho branco',
  SOPA: 'em sopa',
  'AO VINAGRETE': 'ao vinagrete',
  'AO ALHO E OLEO': 'ao alho e óleo',
  'COM MANTEIGA/OLEO': 'com manteiga ou óleo',
  MINGAU: 'em mingau',
};

/** Preparation keys used for crosswalk compatibility. */
const PREP_KEY = {
  'NAO SE APLICA': '',
  'COZIDO(A)': 'cozido',
  'FRITO(A)': 'frito',
  'ASSADO(A)': 'assado',
  'REFOGADO(A)': 'refogado',
  'CRU(A)': 'cru',
  ENSOPADO: 'ensopado',
  'GRELHADO(A)/BRASA/CHURRASCO': 'grelhado',
};

const IBGE_CATEGORY = {
  63: 'Cereais, grãos e leguminosas',
  64: 'Raízes e tubérculos',
  65: 'Farinhas, massas e cereais matinais',
  66: 'Cocos, castanhas e sementes',
  67: 'Verduras e legumes',
  68: 'Frutas',
  69: 'Açúcares e doces',
  70: 'Molhos, condimentos e temperos',
  71: 'Carne bovina e suína',
  72: 'Peixes e frutos do mar',
  73: 'Peixes e frutos do mar',
  74: 'Peixes e frutos do mar',
  75: 'Peixes e frutos do mar',
  76: 'Peixes e frutos do mar',
  77: 'Conservas',
  78: 'Aves e ovos',
  79: 'Leite e derivados',
  80: 'Pães e bolos',
  81: 'Carnes processadas e embutidos',
  82: 'Bebidas não alcoólicas',
  83: 'Bebidas alcoólicas',
  84: 'Óleos e gorduras',
  85: 'Salgados e preparações',
  86: 'Salgados e preparações',
  87: 'Salgados e preparações',
  88: 'Outros',
};

/** Fruits and vegetables: "cru" is how they are eaten, so the label is noise. */
const EATEN_RAW_PREFIXES = new Set([67, 68]);

// ---------------------------------------------------------------------------
// Household measures
// ---------------------------------------------------------------------------

/** Measures the app never shows as chips: they are units, not portions. */
const UNIT_MEASURES = new Set(['grama', 'quilo', 'mililitro', 'litro']);

/** Ordering of measure families as chips: the ones people say first come first. */
const LABEL_ORDER = [
  /^unidade/,
  /^colher de sopa/,
  /^colher de (arroz|servir)/,
  /^concha/,
  /^fatia/,
  /^peda[cç]o/,
  /^copo/,
  /^x[ií]cara/,
  /^escumadeira/,
  /^pegador/,
  /^prato/,
  /^por[cç][aã]o/,
  /^colher de sobremesa/,
  /^colher de ch[aá]/,
  /^colher de caf[eé]/,
];
const labelRank = label => {
  const index = LABEL_ORDER.findIndex(pattern => pattern.test(label));
  return index === -1 ? LABEL_ORDER.length : index;
};

/**
 * Turns "Arroz cozido - colher de sopa cheia" into "colher de sopa cheia".
 * Falls back to the reported measure when the source has no dash.
 */
function measureLabel(sourceDescription, reportedMeasure) {
  const text = String(sourceDescription ?? '').trim();
  const dash = text.lastIndexOf(' - ');
  let label = dash >= 0 ? text.slice(dash + 3) : String(reportedMeasure ?? '');
  label = label.replace(/\s+/g, ' ').trim().toLowerCase();
  label = label.replace(/^(\d+\s*)?por[cç][aã]o guia alimentar$/, 'porção');
  label = label
    .replace(/\bmedo\b/g, 'médio')
    .replace(/\bmedio\b/g, 'médio')
    .replace(/\bmedia\b/g, 'média');
  label = label
    .replace(/\bxicara\b/g, 'xícara')
    .replace(/\bpedaco\b/g, 'pedaço')
    .replace(/\bcha\b/g, 'chá');
  label = label
    .replace(/\bcafe\b/g, 'café')
    .replace(/\bcolher de arroz\b/g, 'colher de servir')
    .replace(/\brequeijao\b/g, 'requeijão');
  return label;
}

/** Fractions ("1/2 unidade", "75% da unidade") are expressed with the stepper, not as chips. */
function isFraction(label) {
  return (
    /(^|\s)\d+\/\d+(\s|$)/.test(label) ||
    /%/.test(label) ||
    /\bpara o preparo\b/.test(label)
  );
}

/**
 * Groups the 11,801 measure rows by (food code, preparation) and reduces each
 * group to at most six distinct portions with a readable label.
 */
function loadMeasures() {
  const workbook = XLSX.readFile(path.join(RAW, 'tabelamedidas_bd.xls'));
  const rows = XLSX.utils
    .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
      defval: '',
    })
    .slice(4)
    .filter(row => row[0] !== '');
  const byFood = new Map();
  for (const row of rows) {
    const [code, , , prepDesc, , reported, , , grams, , source] = row;
    const key = `${code}|${prepDesc}`;
    const label = measureLabel(source, reported);
    const weight = Number(grams);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    if (
      UNIT_MEASURES.has(normalize(reported)) ||
      UNIT_MEASURES.has(normalize(label))
    )
      continue;
    if (!label || isFraction(label)) continue;
    const list = byFood.get(key) ?? [];
    list.push({
      label,
      grams: Math.round(weight * 10) / 10,
      source: String(source),
    });
    byFood.set(key, list);
  }
  const reduced = new Map();
  for (const [key, list] of byFood) {
    const byLabel = new Map();
    for (const item of list)
      if (!byLabel.has(item.label)) byLabel.set(item.label, item);
    reduced.set(
      key,
      [...byLabel.values()]
        .sort(
          (a, b) =>
            labelRank(a.label) - labelRank(b.label) || a.grams - b.grams,
        )
        .slice(0, 6),
    );
  }
  return reduced;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

function number(value) {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    value === 'NA' ||
    value === '-' ||
    value === '*'
  )
    return undefined;
  if (value === 'Tr' || value === 'tr') return 0;
  const parsed =
    typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function round(value, digits = 2) {
  if (value === undefined) return undefined;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const PREP_WORDS = new Set([
  'cru',
  'crua',
  'cozido',
  'cozida',
  'frito',
  'frita',
  'grelhado',
  'grelhada',
  'assado',
  'assada',
  'refogado',
  'refogada',
  'torrado',
  'torrada',
]);

function loadTaco() {
  const items = JSON.parse(readFileSync(path.join(RAW, 'TACO.json'), 'utf8'));
  return items.map(item => {
    const facets = String(item.description)
      .replace(/\s+/g, ' ')
      .split(',')
      .map(part => part.trim());
    const prep = facets
      .slice(1)
      .find(facet => PREP_WORDS.has(normalize(facet)));
    return {
      id: `taco:${item.id}`,
      source: 'taco',
      sourceId: String(item.id),
      name: facets.join(', '),
      category: item.category,
      base: tokens(facets[0])[0] ?? normalize(facets[0]),
      prep: prep ? normalize(prep).replace(/a$/, 'o') : '',
      kcal: number(item.energy_kcal),
      protein: number(item.protein_g),
      carbs: number(item.carbohydrate_g),
      fat: number(item.lipid_g),
      fiber: number(item.fiber_g),
      sodium: number(item.sodium_mg),
      saturated: number(item.saturated_g),
      micro: [
        number(item.iron_mg),
        number(item.calcium_mg),
        number(item.magnesium_mg),
        number(item.potassium_mg),
        number(item.zinc_mg),
      ],
      measures: [],
      aliases: [],
    };
  });
}

function loadIbge(measures) {
  const workbook = XLSX.readFile(path.join(RAW, 'tabelacompleta.xls'));
  const rows = XLSX.utils
    .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {
      header: 1,
      defval: '',
    })
    .slice(4)
    .filter(row => row[0] !== '' && String(row[0]).length >= 7);
  return rows.map(row => {
    const [
      code,
      description,
      ,
      prepDesc,
      ,
      reference,
      kcal,
      protein,
      fat,
      carbs,
      fiber,
      calcium,
      magnesium,
      ,
      ,
      iron,
      sodium,
      ,
      potassium,
      ,
      zinc,
    ] = row;
    const prefix = Number(String(code).slice(0, 2));
    const prepKey = PREP_KEY[prepDesc] ?? 'outro';
    const hideRaw = prepKey === 'cru' && EATEN_RAW_PREFIXES.has(prefix);
    const prepLabel = hideRaw
      ? ''
      : PREP_LABEL[prepDesc] ?? String(prepDesc).toLowerCase();
    const pretty = prettifyIbgeName(description);
    const suffix =
      prepDesc === 'NAO SE APLICA'
        ? ''
        : `-${normalize(prepDesc).replace(/ /g, '_')}`;
    return {
      id: `ibge:${code}${suffix}`,
      source: 'ibge',
      sourceId: `${code}${suffix}`,
      code: String(code),
      name: prepLabel ? `${pretty}, ${prepLabel}` : pretty,
      category: IBGE_CATEGORY[prefix] ?? 'Outros',
      base: tokens(description)[0] ?? normalize(description),
      prep: prepKey,
      reference: String(reference),
      kcal: number(kcal),
      protein: number(protein),
      carbs: number(carbs),
      fat: number(fat),
      fiber: number(fiber),
      sodium: number(sodium),
      micro: [
        number(iron),
        number(calcium),
        number(magnesium),
        number(potassium),
        number(zinc),
      ],
      measures: measures.get(`${code}|${prepDesc}`) ?? [],
      aliases: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Crosswalk TACO → IBGE (household measures) and IBGE → TACO (dedupe)
// ---------------------------------------------------------------------------

/**
 * Hand-checked pairs for the foods people log most: TACO id → IBGE seed id.
 * They win over the heuristic below. Review data/seed-report.txt after a change.
 */
const MANUAL_CROSSWALK = {
  3: 'ibge:6300101', // Arroz, tipo 1, cozido → Arroz (polido, parboilizado…)
  5: 'ibge:6300101',
  561: 'ibge:6303102', // Feijão, carioca, cozido → Feijão (preto, mulatinho…)
  565: 'ibge:6303102',
  567: 'ibge:6303102',
  569: 'ibge:6303102',
  571: 'ibge:6303102',
  573: 'ibge:6303102',
  53: 'ibge:8000105', // Pão, trigo, francês → Pão de sal
  63: 'ibge:8000105',
  488: 'ibge:7803301-cru_a', // Ovo cozido: the raw row carries the "unidade" measure
  489: 'ibge:7803301-cru_a',
  490: 'ibge:7803301-frito_a',
  471: 'ibge:8501302', // Café, infusão 10% → Café
  408: 'ibge:7800401-grelhado_a_brasa_churrasco', // Frango, peito, sem pele, cozido
  409: 'ibge:7800401-cru_a',
  478: 'ibge:8202101', // Coco, água de → Água de coco
  475: 'ibge:8206301', // chás
  476: 'ibge:8206301',
  477: 'ibge:8206301',
  551: 'ibge:6501516', // Tapioca, com manteiga → Tapioca de goma
  386: 'ibge:8500205', // Coxinha de frango, frita → Coxinha
  167: 'ibge:6601706', // Açaí, polpa, com xarope → Açaí
  168: 'ibge:6601706',
  215: 'ibge:8500407', // Laranja, pêra, suco → Suco de laranja
  540: 'ibge:7701901', // Feijoada
  533: 'ibge:6902901', // Cuscuz, de milho
  131: 'ibge:8502201', // Mandioca, farofa, temperada → Farofa
  484: 'ibge:7803301-frito_a', // Omelete de queijo: egg portions
  52: 'ibge:8001401', // Pão, trigo, forma, integral → Pão integral
  39: 'ibge:6503401', // Macarrão, instantâneo → Macarrão
  542: 'ibge:6503401-molho_vermelho', // Macarrão, molho bolognesa
  415: 'ibge:8100502-frito_a', // Hambúrguer bovino
  416: 'ibge:8100502-frito_a',
  417: 'ibge:8100502-grelhado_a_brasa_churrasco',
  461: 'ibge:7901901', // Queijo minas frescal → queijo (fatia)
  462: 'ibge:7901901',
  463: 'ibge:7901801', // Queijo mozarela → Queijo muçarela
  467: 'ibge:7901701', // Queijo prato
  438: 'ibge:8102901', // Presunto
  439: 'ibge:8102901',
  424: 'ibge:8102601', // Mortadela
  453: 'ibge:7900901', // Leite condensado (if present)
};

/** TACO foods that are ingredients or powders: portions of the dish do not apply. */
const INGREDIENT_PATTERN =
  /mistura para|\bpo\b|desidratad|liofilizad|concentrad|farinha|fermento|polvilho|amido|gelatina|extrato/;
const FORM_WORDS =
  /\b(pure|suco|polpa|farinha|po|oleo|extrato|molho|creme|doce|geleia|sopa|caldo|agua|pasta|torrada|chips)\b/;
const RAW_OK_WORDS =
  /flocos|farinha|farelo|granola|torrad|biscoito|castanha|amendoim|noz|semente|gergelim|linhaca|chia|aveia/;
const RAW_ONLY_CATEGORIES = new Set([
  'Cereais e derivados',
  'Leguminosas e derivados',
  'Carnes e derivados',
  'Pescados e frutos do mar',
  'Ovos e derivados',
  'Alimentos preparados',
]);

function compatiblePrep(food, candidate) {
  if (!food.prep) return candidate.prep === '' || candidate.prep === 'cru';
  if (food.prep === 'cru') {
    if (candidate.prep === 'cru') return true;
    if (candidate.prep !== '') return false;
    // Raw rice, beans or meat are ingredients: their portions are not the cooked dish's.
    if (
      RAW_ONLY_CATEGORIES.has(food.category) &&
      !RAW_OK_WORDS.test(normalize(food.name))
    )
      return false;
    return true;
  }
  return candidate.prep === '' || candidate.prep === food.prep;
}

/** Tokens outside parentheses: the ones that make an IBGE name more specific. */
function outerTokens(name) {
  return tokens(String(name).replace(/\([^)]*\)/g, ' '));
}

function crosswalk(taco, ibge, report) {
  const ibgeById = new Map(ibge.map(food => [food.id, food]));
  const tacoByBase = new Map();
  for (const food of taco) {
    const list = tacoByBase.get(food.base) ?? [];
    list.push(food);
    tacoByBase.set(food.base, list);
  }
  let matched = 0;
  for (const food of taco) {
    const manual = MANUAL_CROSSWALK[Number(food.sourceId)];
    let winner = manual ? ibgeById.get(manual) : null;
    let score = winner ? 999 : 0;
    if (manual && !winner)
      report.push(
        `${food.id}\t${food.name}\t→ MANUAL TARGET MISSING ${manual}`,
      );
    if (!winner) {
      const normalizedName = normalize(food.name);
      if (INGREDIENT_PATTERN.test(normalizedName)) {
        report.push(`${food.id}\t${food.name}\t→ (ingredient, no measures)`);
        continue;
      }
      if (food.prep === 'cru') {
        const siblings = tacoByBase.get(food.base) ?? [];
        const qualifiers = tokens(food.name)
          .filter(t => !PREP_WORDS.has(t))
          .join(' ');
        const cookedSibling = siblings.some(
          sibling =>
            sibling !== food &&
            sibling.prep &&
            sibling.prep !== 'cru' &&
            tokens(sibling.name)
              .filter(t => !PREP_WORDS.has(t))
              .join(' ') === qualifiers,
        );
        if (cookedSibling) {
          report.push(
            `${food.id}\t${food.name}\t→ (raw ingredient with cooked sibling)`,
          );
          continue;
        }
      }
      const tacoTokens = [
        ...new Set(
          tokens(food.name).filter(t => !PREP_WORDS.has(t) && !/^\d+$/.test(t)),
        ),
      ];
      const candidates = ibge.filter(
        candidate =>
          candidate.measures.length &&
          tokens(candidate.name).includes(food.base) &&
          compatiblePrep(food, candidate),
      );
      for (const candidate of candidates) {
        const nameTokens = new Set(tokens(candidate.name));
        const sourceTokens = new Set(
          candidate.measures.flatMap(m => tokens(m.source)),
        );
        let s = 0;
        for (const t of tacoTokens) {
          const inName = nameTokens.has(t);
          const inSource = sourceTokens.has(t);
          if (inName) s += 2;
          if (inSource) s += 1;
          if (!inName && !inSource) s -= 0.5;
        }
        for (const t of outerTokens(candidate.name))
          if (!tacoTokens.includes(t) && !PREP_WORDS.has(t)) s -= 1;
        if (candidate.prep === food.prep) s += 1;
        const tacoForm = normalizedName.match(FORM_WORDS)?.[1];
        const candidateForm = normalize(candidate.name).match(FORM_WORDS)?.[1];
        if (tacoForm !== candidateForm) s -= 2;
        if (
          /industrializad|enlatad|conserva/.test(normalizedName) !==
          /industrializad|enlatad|conserva/.test(normalize(candidate.name))
        )
          s -= 2;
        if (s > score) {
          score = s;
          winner = candidate;
        }
      }
    }
    if (winner && score >= 2.5) {
      food.measures = winner.measures.map(m => ({ ...m }));
      food.crosswalk = winner.id;
      matched += 1;
      report.push(
        `${food.id}\t${food.name}\t→ ${winner.id}\t${
          winner.name
        }\tscore ${score}\t${winner.measures
          .map(m => `${m.label} ${m.grams}g`)
          .join(', ')}`,
      );
    } else {
      report.push(`${food.id}\t${food.name}\t→ (no measures)`);
    }
  }
  return matched;
}

/**
 * The survey lists "Macarrão, grelhado" and "Macarrão, assado" with exactly the
 * same numbers as plain "Macarrão": the preparation carried no data. Keep one
 * row and merge the measures, so the list does not show five identical pastas.
 */
function dropIdenticalPreparations(ibge) {
  const baseByCode = new Map();
  for (const food of ibge)
    if (food.prep === '') baseByCode.set(food.code, food);
  const kept = [];
  for (const food of ibge) {
    if (food.prep === '') {
      kept.push(food);
      continue;
    }
    const base = baseByCode.get(food.code);
    const same =
      base &&
      Math.abs(base.kcal - food.kcal) < 0.5 &&
      Math.abs(base.protein - food.protein) < 0.05 &&
      Math.abs(base.carbs - food.carbs) < 0.05 &&
      Math.abs(base.fat - food.fat) < 0.05;
    if (same) {
      for (const m of food.measures)
        if (!base.measures.some(b => b.label === m.label))
          base.measures.push(m);
      base.measures = base.measures
        .sort((a, b) => labelRank(a.label) - labelRank(b.label))
        .slice(0, 6);
      continue;
    }
    kept.push(food);
  }
  return kept;
}

/** IBGE rows whose reference is exactly one TACO food duplicate that food. */
function dropIbgeDuplicates(taco, ibge) {
  const tacoByName = new Map(taco.map(food => [normalize(food.name), food]));
  const kept = [];
  let dropped = 0;
  for (const food of ibge) {
    const parts = food.reference
      .split(' + ')
      .map(part => part.replace(/\s*\([^)]*\)\s*$/, '').trim());
    const twin =
      parts.length === 1 ? tacoByName.get(normalize(parts[0])) : null;
    if (twin && sane(twin)) {
      twin.aliases.push(food.name.replace(/, cru$/, ''));
      if (!twin.measures.length && food.measures.length)
        twin.measures = food.measures.map(m => ({ ...m }));
      dropped += 1;
      continue;
    }
    kept.push(food);
  }
  return { kept, dropped };
}

// ---------------------------------------------------------------------------
// Ranking hints and starter lists
// ---------------------------------------------------------------------------

/**
 * Foods Brazilians log most, by seed id. The app's ranking adds this on top of
 * text relevance so "arroz" shows the everyday rice before "arroz carreteiro".
 * 3 = staple of most days, 2 = very common, 1 = common.
 */
const BOOST = {
  'taco:3': 3,
  'taco:561': 3,
  'taco:567': 3,
  'taco:53': 3,
  'taco:488': 3,
  'taco:490': 3,
  'ibge:7900101': 3,
  'ibge:7903601': 2,
  'taco:471': 3,
  'ibge:8501303': 3,
  'taco:182': 3,
  'taco:179': 2,
  'taco:408': 3,
  'ibge:7800401-grelhado_a_brasa_churrasco': 3,
  'ibge:6503401': 3,
  'ibge:8508401': 2,
  'taco:1': 2,
  'taco:91': 2,
  'taco:93': 2,
  'taco:448': 2,
  'taco:461': 2,
  'taco:463': 2,
  'taco:467': 2,
  'taco:214': 2,
  'ibge:8500407': 2,
  'taco:222': 2,
  'taco:225': 2,
  'taco:226': 1,
  'ibge:6705101': 2,
  'taco:78': 2,
  'taco:13': 2,
  'taco:7': 2,
  'taco:551': 2,
  'taco:167': 2,
  'taco:386': 2,
  'taco:140': 2,
  'taco:478': 2,
  'ibge:8200101': 2,
  'ibge:7902901': 2,
  'taco:439': 2,
  'taco:131': 2,
  'taco:540': 2,
  'ibge:8500903': 2,
  'ibge:8500313': 2,
  'taco:129': 2,
  'taco:88': 2,
  'taco:52': 2,
  'ibge:8000501': 2,
  'taco:377': 2,
  'taco:328': 2,
  'taco:342': 2,
  'taco:351': 2,
  'taco:261': 1,
  'taco:262': 1,
  'taco:263': 1,
  'taco:260': 1,
  'taco:110': 1,
  'taco:109': 1,
  'taco:8': 1,
  'taco:449': 1,
  'taco:451': 1,
  'ibge:7901201': 1,
  'ibge:8200302': 1,
  'ibge:8300101': 1,
  'taco:424': 1,
  'taco:419': 1,
  'taco:420': 1,
  'taco:277': 1,
  'taco:318': 1,
  'taco:317': 1,
  'taco:284': 1,
  'taco:533': 1,
  'taco:37': 1,
  'taco:416': 1,
  'taco:417': 1,
  'ibge:8500302': 1,
  'taco:63': 1,
  'taco:507': 1,
  'ibge:6903601': 1,
  'ibge:6900501': 1,
  'taco:16': 1,
  'taco:501': 1,
  'taco:163': 1,
  'taco:235': 1,
  'taco:239': 1,
  'taco:164': 1,
  'taco:228': 1,
  'taco:220': 1,
  'taco:115': 1,
  'taco:116': 1,
  'taco:100': 1,
  'taco:70': 1,
  'taco:112': 1,
  'taco:97': 1,
  'taco:45': 1,
  'taco:577': 1,
  'taco:558': 1,
  'taco:589': 1,
  'taco:453': 1,
  'taco:447': 1,
  'ibge:8001401': 1,
  'taco:484': 1,
  'ibge:6900821': 1,
  'ibge:8500503': 1,
  'ibge:8002225': 1,
  'ibge:8002334': 1,
  'ibge:8500801': 1,
  'taco:545': 1,
  'taco:526': 1,
  'ibge:8500317': 1,
  'taco:39': 1,
  'taco:542': 1,
  'ibge:6501516': 1,
  'ibge:8102101-frito_a': 1,
  'taco:537': 1,
  'taco:538': 1,
  'ibge:8501302': 2,
};

/**
 * What the search shows for each meal before the user has any history.
 * Ordered; the app takes the first six that exist.
 */
const STARTERS = {
  breakfast: [
    'taco:53',
    'ibge:8501303',
    'taco:471',
    'ibge:7900101',
    'taco:490',
    'taco:488',
    'taco:182',
    'taco:226',
    'taco:461',
    'ibge:7902901',
    'taco:439',
    'taco:262',
    'taco:448',
    'taco:7',
    'taco:551',
    'taco:140',
    'ibge:8000501',
    'taco:52',
    'ibge:8500407',
    'ibge:8500503',
  ],
  lunch: [
    'taco:3',
    'taco:561',
    'taco:408',
    'ibge:7800401-grelhado_a_brasa_churrasco',
    'taco:377',
    'ibge:8508401',
    'taco:78',
    'ibge:6705101',
    'taco:93',
    'taco:91',
    'ibge:6503401',
    'taco:131',
    'taco:490',
    'taco:1',
    'taco:129',
    'taco:328',
    'taco:540',
    'ibge:8500407',
    'taco:214',
  ],
  afternoon_snack: [
    'taco:182',
    'taco:222',
    'taco:448',
    'taco:13',
    'taco:8',
    'ibge:8500313',
    'taco:140',
    'taco:386',
    'taco:471',
    'ibge:8501303',
    'taco:167',
    'ibge:8002334',
    'ibge:6900821',
    'taco:558',
    'taco:63',
    'ibge:8500503',
    'taco:551',
  ],
  dinner: [
    'ibge:8500313',
    'taco:3',
    'taco:561',
    'taco:408',
    'ibge:6503401',
    'ibge:8500903',
    'ibge:8500302',
    'taco:484',
    'ibge:8508401',
    'ibge:8500801',
    'taco:37',
    'ibge:8500317',
    'ibge:7900101',
    'taco:53',
    'taco:490',
    'ibge:8200101',
    'taco:542',
  ],
};

// ---------------------------------------------------------------------------
// Sanity and output
// ---------------------------------------------------------------------------

function sane(food) {
  // Oils and sugars list "NA" for the macros they do not have: that is a zero.
  if (food.kcal !== undefined) {
    for (const key of ['protein', 'carbs', 'fat'])
      if (food[key] === undefined) food[key] = 0;
  } else if (
    [food.protein, food.carbs, food.fat].every(value => value !== undefined)
  ) {
    food.kcal = 4 * food.protein + 4 * food.carbs + 9 * food.fat;
  }
  if (
    [food.kcal, food.protein, food.carbs, food.fat].some(
      value => value === undefined,
    )
  )
    return false;
  if (food.kcal < 0 || food.kcal > 950) return false;
  if (food.protein + food.carbs + food.fat > 105) return false;
  return true;
}

/** Decimals kept per `micro` position: iron, calcium, magnesium, potassium, zinc. */
const MICRO_DIGITS = [2, 0, 0, 0, 2];

function compact(food) {
  const out = {
    id: food.id,
    source: food.source,
    sourceId: food.sourceId,
    name: food.name,
    category: food.category,
    kcal: round(food.kcal, 1),
    protein: round(food.protein),
    carbs: round(food.carbs),
    fat: round(food.fat),
  };
  if (food.fiber !== undefined) out.fiber = round(food.fiber);
  if (food.sodium !== undefined) out.sodiumMg = round(food.sodium, 1);
  if (food.saturated !== undefined) out.saturatedFat = round(food.saturated);
  /*
    Five minerals, positional: [iron, calcium, magnesium, potassium, zinc] in
    mg per 100 g. `null` is "the table never measured it", which the app must
    keep apart from zero — hence a fixed-length array instead of five keys.
    Iron and zinc keep two decimals because their values live under 1 mg.
  */
  const micro = (food.micro ?? []).map((value, index) =>
    value === undefined ? null : round(value, MICRO_DIGITS[index]),
  );
  if (micro.some(value => value !== null)) out.micro = micro;
  if (food.aliases.length) out.aliases = [...new Set(food.aliases)];
  const english = translateName(food.name, glossary);
  if (english.missing.length === 0 && english.text) out.nameEn = english.text;
  out.measures = food.measures.map(m => ({ label: m.label, grams: m.grams }));
  if (BOOST[food.id]) out.boost = BOOST[food.id];
  out.verified = true;
  return out;
}

function main() {
  const report = [];
  const measures = loadMeasures();
  const taco = loadTaco();
  const ibgeAll = dropIdenticalPreparations(loadIbge(measures));
  const { kept: ibge, dropped } = dropIbgeDuplicates(taco, ibgeAll);
  const matched = crosswalk(taco, ibgeAll, report);
  const foods = [...taco, ...ibge].filter(sane).map(compact);
  const ids = new Set(foods.map(food => food.id));
  const withMeasures = foods.filter(food => food.measures.length).length;

  const withEnglishName = foods.filter(food => food.nameEn).length;
  /*
    Household measure labels repeat across thousands of rows ("colher de sopa
    cheia" alone appears 384 times), so their English form is written once, as
    a dictionary the importer reads, instead of on every measure. A label
    missing from the dictionary keeps its Portuguese text.
  */
  const measureLabelsEn = {};
  for (const food of foods) {
    for (const measure of food.measures) {
      if (measureLabelsEn[measure.label] !== undefined) continue;
      const label = translateLabel(measure.label, glossary);
      if (label.missing.length === 0 && label.text)
        measureLabelsEn[measure.label] = label.text;
    }
  }
  const missingStarters = Object.values(STARTERS)
    .flat()
    .filter(id => !ids.has(id));
  const missingBoosts = Object.keys(BOOST).filter(id => !ids.has(id));
  const starters = Object.fromEntries(
    Object.entries(STARTERS).map(([meal, list]) => [
      meal,
      list.filter(id => ids.has(id)),
    ]),
  );

  const seed = {
    version: 3,
    generatedAt: new Date().toISOString().slice(0, 10),
    sources: {
      taco: {
        name: 'TACO – Tabela Brasileira de Composição de Alimentos, 4ª edição revisada e ampliada',
        publisher: 'NEPA/UNICAMP, Campinas, 2011',
        url: 'https://nepa.unicamp.br/',
        license: 'Citation required',
      },
      ibge: {
        name: 'Pesquisa de Orçamentos Familiares 2008-2009: Tabelas de Composição Nutricional dos Alimentos Consumidos no Brasil; Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil',
        publisher: 'IBGE, Rio de Janeiro, 2011',
        url: 'https://www.ibge.gov.br/estatisticas/sociais/populacao/9050-pesquisa-de-orcamentos-familiares.html',
        license: 'Open data (Decreto 8.777/2016), credit required',
      },
    },
    starters,
    measureLabelsEn,
    foods,
  };

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(seed));
  writeFileSync(
    REPORT,
    [
      `foods: ${foods.length} (taco ${taco.filter(sane).length}, ibge ${
        ibge.filter(sane).length
      }, ibge duplicates folded into taco ${dropped})`,
      `taco items with household measures via crosswalk: ${matched}`,
      `foods with at least one household measure: ${withMeasures}`,
      `foods with an English name from the glossary: ${withEnglishName} (${(
        (100 * withEnglishName) /
        foods.length
      ).toFixed(1)}%)`,
      `household measure labels with an English form: ${
        Object.keys(measureLabelsEn).length
      }`,
      `starter ids missing from seed: ${missingStarters.join(', ') || 'none'}`,
      `boost ids missing from seed: ${missingBoosts.join(', ') || 'none'}`,
      '',
      ...report,
    ].join('\n'),
  );
  console.log(
    `wrote ${path.relative(ROOT, OUT)} (${(
      JSON.stringify(seed).length / 1024
    ).toFixed(0)} KB): ${
      foods.length
    } foods, ${withMeasures} with measures, ${withEnglishName} with an English name, ${matched} TACO crosswalks, ${dropped} IBGE duplicates folded; missing starters: ${
      missingStarters.length
    }, missing boosts: ${missingBoosts.length}`,
  );
}

main();
