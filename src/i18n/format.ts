import { currentLanguage, t, type AppLanguage } from './index';

// Intl formatters are expensive to build (tens of milliseconds on a Galaxy
// J6), so each one is created once per language and reused.
const numberFormats = new Map<string, Intl.NumberFormat>();
const dateFormats = new Map<string, Intl.DateTimeFormat>();

function numberFormat(maximumFractionDigits: number): Intl.NumberFormat {
  const language: AppLanguage = currentLanguage();
  const key = `${language}:${maximumFractionDigits}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(language, { maximumFractionDigits });
    numberFormats.set(key, format);
  }
  return format;
}

function dateFormat(
  name: string,
  options: Intl.DateTimeFormatOptions,
  requested?: AppLanguage,
): Intl.DateTimeFormat {
  const language: AppLanguage = requested ?? currentLanguage();
  const key = `${language}:${name}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(language, options);
    dateFormats.set(key, format);
  }
  return format;
}

/** "1.240" in pt-BR, "1,240" in en-US. Always an integer for kcal. */
export function formatKcal(value: number): string {
  return numberFormat(0).format(Math.round(value));
}

/** Grams with at most one decimal: "42", "12,5". */
export function formatGrams(value: number): string {
  return numberFormat(1).format(value);
}

/** Whole grams for the macros printed in a diary row: "3", "28", "0". */
export function formatMacroGrams(value: number): string {
  return numberFormat(0).format(value);
}

/**
 * What one cell of the minerals block prints: "8,4 de 14 mg", "12 de 25 g".
 * One decimal while the number is under 10, whole numbers from there up, and
 * the unit once, at the end. Never a percentage.
 * `unit` is the short symbol on screen and the spelled-out word for a screen
 * reader, so the caller decides which one it wants.
 */
export function formatMicroAmount(
  consumed: number,
  reference: number,
  unit: string,
): string {
  return t('today.minerals.amount', {
    consumed: numberFormat(consumed < 10 ? 1 : 0).format(consumed),
    reference: numberFormat(0).format(reference),
    unit,
  });
}

/** Quantities of a household measure: "1", "1,5", "0,25". */
export function formatQuantity(value: number): string {
  return numberFormat(2).format(value);
}

/**
 * A portion as a screen reader should hear it: "3 colher de sopa cheia, 75 g"
 * or plain "75 g" when it was typed in grams (task 04's chips and rows).
 */
export function formatPortionSpeech(portion: {
  grams: number;
  servingLabel?: string;
  servingCount?: number;
}): string {
  const grams = formatGrams(portion.grams);
  if (portion.servingLabel === undefined) {
    return `${grams} ${t('common.grams')}`;
  }
  return t('search.portionA11y', {
    count: formatQuantity(portion.servingCount ?? 1),
    label: portion.servingLabel,
    grams,
  });
}

/** Local calendar day as YYYY-MM-DD. Never use toISOString here: it is UTC. */
export function toDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function fromDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** "terça-feira, 8 de setembro" / "Tuesday, September 8". Full weekday, for screen readers. */
export function formatDayLong(date: Date, language?: AppLanguage): string {
  return dateFormat(
    'dayLong',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    },
    language,
  ).format(date);
}

/**
 * "8 de set" / "Sep 8": the title of a day that is not today. No weekday: the
 * title is also the button that opens the month sheet, and the weekday pushed
 * it past the header's width at large font sizes. The strip right below shows
 * "ter" anyway, and `formatDayLong` still says it to screen readers.
 */
export function formatDayTitle(date: Date): string {
  return dateFormat('dayTitle', {
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace(/\./g, '');
}

/** "setembro de 2026" / "September 2026": the month line of the day picker. */
export function formatMonthTitle(date: Date): string {
  return dateFormat('monthTitle', { month: 'long', year: 'numeric' }).format(
    date,
  );
}

/**
 * "terça-feira, 8 de setembro de 2026" / "Tuesday, September 8, 2026": what a
 * screen reader hears on a calendar cell, where the year is not on screen.
 */
export function formatDayFull(date: Date): string {
  return dateFormat('dayFull', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** "ter" / "Tue" for the week strip. */
export function formatWeekdayShort(date: Date, language?: AppLanguage): string {
  return dateFormat('weekdayShort', { weekday: 'short' }, language)
    .format(date)
    .replace('.', '');
}

/** "ter 8" / "Tue 8" for the search header: weekday and day of month. */
export function formatMealDay(dayKey: string): string {
  const date = fromDayKey(dayKey);
  return `${formatWeekdayShort(date)} ${date.getDate()}`;
}
