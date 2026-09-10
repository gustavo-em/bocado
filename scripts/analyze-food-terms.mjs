#!/usr/bin/env node
/**
 * Discovery step for the English food names (docs/research/08-nomes-em-ingles.md).
 *
 * Reads the built seed and answers three questions with numbers:
 *   1. how many distinct terms the bundled names, categories and household
 *      measure labels use;
 *   2. how much of the base the glossary covers, where a food counts as
 *      covered only when every one of its terms is translated;
 *   3. which unknown terms block the most foods, so the next glossary entries
 *      are the ones that pay.
 *
 * Writes data/glossary-report.txt. Run: node scripts/analyze-food-terms.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  loadGlossary,
  normalizeKey,
  translateCategory,
  translateLabel,
  translateName,
} from './lib/glossary.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SEED = path.join(ROOT, 'assets', 'data', 'foods.seed.json');
const GLOSSARY = path.join(ROOT, 'data', 'glossary', 'pt-en.json');
const REPORT = path.join(ROOT, 'data', 'glossary-report.txt');

const TOKEN = /[a-z0-9%][a-z0-9%'-]*/g;

function words(text) {
  return normalizeKey(text).match(TOKEN) ?? [];
}

function readGlossary() {
  try {
    return JSON.parse(readFileSync(GLOSSARY, 'utf8'));
  } catch {
    return {};
  }
}

function countInto(map, list) {
  for (const item of list) map.set(item, (map.get(item) ?? 0) + 1);
}

function byCountDesc(map) {
  return [...map].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function main() {
  const seed = JSON.parse(readFileSync(SEED, 'utf8'));
  const raw = readGlossary();
  const glossary = loadGlossary(raw);

  const nameTerms = new Map();
  const labelTerms = new Map();
  const categoryTerms = new Map();
  const labels = new Map();
  const categories = new Map();
  for (const food of seed.foods) {
    countInto(nameTerms, words(food.name));
    if (food.category) {
      countInto(categoryTerms, words(food.category));
      countInto(categories, [normalizeKey(food.category)]);
    }
    for (const measure of food.measures) {
      countInto(labelTerms, words(measure.label));
      countInto(labels, [normalizeKey(measure.label)]);
    }
  }

  const blocking = new Map();
  const translated = [];
  let covered = 0;
  for (const food of seed.foods) {
    const { text, missing } = translateName(food.name, glossary);
    if (missing.length === 0 && text) {
      covered += 1;
      translated.push([food.name, text]);
      continue;
    }
    countInto(blocking, [...new Set(missing)]);
  }

  const labelsCovered = [...labels.keys()].filter(
    label => translateLabel(label, glossary).missing.length === 0,
  ).length;
  const categoriesCovered = [...categories.keys()].filter(
    category => translateCategory(category, glossary).missing.length === 0,
  ).length;

  const entries =
    Object.keys(raw.phrases ?? {}).length +
    Object.keys(raw.terms ?? {}).length +
    Object.keys(raw.keep ?? {}).length;
  const percent = value => `${((100 * value) / seed.foods.length).toFixed(1)}%`;

  const lines = [
    `foods: ${seed.foods.length}`,
    `distinct terms in names: ${nameTerms.size}`,
    `distinct terms in categories: ${categoryTerms.size} (in ${categories.size} category strings)`,
    `distinct terms in measure labels: ${labelTerms.size} (in ${labels.size} labels)`,
    `glossary entries for names: ${entries} (phrases ${
      Object.keys(raw.phrases ?? {}).length
    }, terms ${Object.keys(raw.terms ?? {}).length}, keep ${
      Object.keys(raw.keep ?? {}).length
    }, pending ${Object.keys(raw.pending ?? {}).length})`,
    `foods with the whole name translated: ${covered} (${percent(covered)})`,
    `labels translated: ${labelsCovered}/${labels.size}`,
    `categories translated: ${categoriesCovered}/${categories.size}`,
    '',
    '# unknown terms, by number of foods they block',
    ...byCountDesc(blocking).map(([term, count]) => `${count}\t${term}`),
    '',
    '# name terms by frequency',
    ...byCountDesc(nameTerms).map(([term, count]) => `${count}\t${term}`),
    '',
    '# measure labels by frequency',
    ...byCountDesc(labels).map(([label, count]) => `${count}\t${label}`),
  ];

  mkdirSync(path.dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, lines.join('\n'));
  console.log(lines.slice(0, 8).join('\n'));
  console.log(
    `blocking terms: ${blocking.size}; report at ${path.relative(
      ROOT,
      REPORT,
    )}`,
  );
}

main();
