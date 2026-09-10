import { t } from '../../i18n';
import {
  formatDayLong,
  formatGrams,
  formatKcal,
  formatMacroGrams,
} from '../../i18n/format';
import { dateFromDayKey } from '../diary/days';
import type { ShareDay, ShareEntry } from './shareDay';

/**
 * The day as plain text, for a WhatsApp message or a chat with an assistant.
 *
 * Short lines and one fact per line: no emoji, no ASCII table, nothing that
 * depends on a monospaced font. A phone keyboard wraps a long food name and
 * the message still reads, because every line stands on its own.
 */
export function buildDayText(day: ShareDay): string {
  const date = formatDayLong(dateFromDayKey(day.day));
  const lines: string[] = [t('share.textHeader', { app: t('app.name'), date })];

  if (day.empty) {
    lines.push(t('share.emptyDay'));
    return lines.join('\n');
  }

  lines.push(
    t('share.textKcal', {
      consumed: formatKcal(day.totals.kcal),
      goal: formatKcal(day.goalKcal),
    }),
    t('share.textMacros', {
      protein: formatMacroGrams(day.totals.protein),
      carbs: formatMacroGrams(day.totals.carbs),
      fat: formatMacroGrams(day.totals.fat),
    }),
  );

  for (const block of day.blocks) {
    lines.push(
      '',
      t('share.textMeal', {
        meal: t(`meals.${block.meal}`),
        kcal: formatKcal(block.kcal),
      }),
    );
    for (const entry of block.entries) {
      lines.push(
        t('share.textEntry', {
          food: entry.name,
          portion: portionText(entry),
          kcal: formatKcal(entry.kcal),
        }),
      );
    }
  }

  return lines.join('\n');
}

/** "100 g", or "2 colher de servir cheia · 150 g" when a measure was used. */
function portionText(entry: ShareEntry): string {
  const grams = `${formatGrams(entry.grams)} ${t('common.grams')}`;
  if (entry.servingLabel === undefined) return grams;
  return t('share.textPortion', {
    count: formatGrams(entry.servingCount ?? 1),
    label: entry.servingLabel,
    grams,
  });
}
