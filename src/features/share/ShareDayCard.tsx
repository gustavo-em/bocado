import React, { forwardRef } from 'react';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { BRAND_MARK_PATH, BRAND_MARK_VIEW } from '../../components/BrandMark';
import {
  CARD_HEIGHT,
  CARD_MARGIN,
  CARD_WIDTH,
  MEALS_TOP,
  MEAL_ENTRY_HEIGHT,
  MEAL_GAP,
  MEAL_HEADER_HEIGHT,
  buildDayCard,
  fitText,
} from '../../domain/share/dayCard';
import type { ShareDay } from '../../domain/share/shareDay';
import { dateFromDayKey } from '../../domain/diary/days';
import { t } from '../../i18n';
import {
  formatDayLong,
  formatGrams,
  formatKcal,
  formatMacroGrams,
} from '../../i18n/format';
import { lightColors } from '../../theme/colors';
import { fontFamily } from '../../theme/type';

/**
 * The day as a picture, drawn at 1080 × 1350 — never a screenshot: there is no
 * status bar and no navigation bar in it, and every number is placed by this
 * file. Always the light "Papel" palette, whatever the app is wearing: chat
 * apps re-encode what they receive, and flat dark grounds band while thin
 * light strokes thin out, where ink on paper survives at 12:1.
 */

/** Type sizes in the piece's own pixels. They are its scale, not the app's. */
const SIZE = {
  wordmark: 40,
  date: 30,
  hero: 120,
  heroLine: 32,
  macroLabel: 26,
  macroValue: 34,
  mealName: 34,
  mealKcal: 34,
  entry: 28,
  footer: 24,
} as const;

const MARK_SIZE = 44;
const MARK_TOP = 56;
const WORDMARK_X = CARD_MARGIN + MARK_SIZE + 20;
const BRAND_BASELINE = MARK_TOP + 34;
const DATE_BASELINE = 178;
const HERO_BASELINE = 306;
const HERO_LINE_BASELINE = 356;
const MACRO_LABEL_BASELINE = 424;
const MACRO_VALUE_BASELINE = 466;
const MACRO_BAR_TOP = 484;
const MACRO_BAR_HEIGHT = 10;
const MACRO_GAP = 24;
const RULE_Y = 520;
const FOOTER_BASELINE = 1306;
const RIGHT_EDGE = CARD_WIDTH - CARD_MARGIN;
const CONTENT_WIDTH = CARD_WIDTH - CARD_MARGIN * 2;
const MACRO_COLUMN = (CONTENT_WIDTH - MACRO_GAP * 2) / 3;
const HAIRLINE = 2;
const ENTRY_BASELINE_IN_ROW = 26;
const MEAL_NAME_BASELINE = 38;
const EMPTY_BASELINE = MEALS_TOP + 48;

interface MacroColumn {
  label: string;
  value: string;
  ratio: number;
  color: string;
}

export interface ShareDayCardProps {
  day: ShareDay;
}

/**
 * `forwardRef` because the sheet needs the `Svg` itself: `toDataURL` is a
 * method on it, and it is what turns this drawing into the PNG that leaves
 * the phone.
 */
export const ShareDayCard = forwardRef<Svg, ShareDayCardProps>(
  function ShareDayCardBase({ day }, ref) {
    const card = buildDayCard(day);
    const date = formatDayLong(dateFromDayKey(day.day));
    const macros: MacroColumn[] = [
      {
        label: t('today.protein'),
        value: `${formatMacroGrams(day.totals.protein)} ${t('common.grams')}`,
        ratio: share(day.totals.protein * 4, day),
        color: lightColors.protein,
      },
      {
        label: t('today.carbs'),
        value: `${formatMacroGrams(day.totals.carbs)} ${t('common.grams')}`,
        ratio: share(day.totals.carbs * 4, day),
        color: lightColors.carbs,
      },
      {
        label: t('today.fat'),
        value: `${formatMacroGrams(day.totals.fat)} ${t('common.grams')}`,
        ratio: share(day.totals.fat * 9, day),
        color: lightColors.fat,
      },
    ];

    let cursor = MEALS_TOP;

    return (
      <Svg
        ref={ref}
        width={1}
        height={1}
        viewBox={`0 0 ${CARD_WIDTH} ${CARD_HEIGHT}`}
        collapsable={false}
      >
        <Rect
          x={0}
          y={0}
          width={CARD_WIDTH}
          height={CARD_HEIGHT}
          fill={lightColors.background}
        />
        <G
          transform={`translate(${CARD_MARGIN} ${MARK_TOP}) scale(${
            MARK_SIZE / BRAND_MARK_VIEW
          })`}
        >
          <Path d={BRAND_MARK_PATH} fill={lightColors.ink} />
        </G>
        <SvgText
          x={WORDMARK_X}
          y={BRAND_BASELINE}
          fill={lightColors.ink}
          fontSize={SIZE.wordmark}
          fontFamily={fontFamily.displaySemiBold}
        >
          {t('app.name')}
        </SvgText>
        <SvgText
          x={CARD_MARGIN}
          y={DATE_BASELINE}
          fill={lightColors.inkMuted}
          fontSize={SIZE.date}
          fontFamily={fontFamily.bodyMedium}
        >
          {fitText(date, CONTENT_WIDTH, SIZE.date)}
        </SvgText>

        <SvgText
          x={CARD_MARGIN}
          y={HERO_BASELINE}
          fill={lightColors.ink}
          fontSize={SIZE.hero}
          fontFamily={fontFamily.displaySemiBold}
        >
          {formatKcal(day.totals.kcal)}
        </SvgText>
        <SvgText
          x={CARD_MARGIN}
          y={HERO_LINE_BASELINE}
          fill={lightColors.inkMuted}
          fontSize={SIZE.heroLine}
          fontFamily={fontFamily.body}
        >
          {t('share.cardGoal', { goal: formatKcal(day.goalKcal) })}
        </SvgText>

        {macros.map((macro, index) => {
          const x = CARD_MARGIN + index * (MACRO_COLUMN + MACRO_GAP);
          return (
            <G key={macro.label}>
              <SvgText
                x={x}
                y={MACRO_LABEL_BASELINE}
                fill={lightColors.inkMuted}
                fontSize={SIZE.macroLabel}
                fontFamily={fontFamily.bodyMedium}
              >
                {fitText(macro.label, MACRO_COLUMN, SIZE.macroLabel)}
              </SvgText>
              <SvgText
                x={x}
                y={MACRO_VALUE_BASELINE}
                fill={lightColors.ink}
                fontSize={SIZE.macroValue}
                fontFamily={fontFamily.bodySemiBold}
              >
                {macro.value}
              </SvgText>
              <Rect
                x={x}
                y={MACRO_BAR_TOP}
                width={MACRO_COLUMN}
                height={MACRO_BAR_HEIGHT}
                rx={MACRO_BAR_HEIGHT / 2}
                fill={lightColors.track}
              />
              {macro.ratio > 0 ? (
                <Rect
                  x={x}
                  y={MACRO_BAR_TOP}
                  width={Math.max(MACRO_BAR_HEIGHT, MACRO_COLUMN * macro.ratio)}
                  height={MACRO_BAR_HEIGHT}
                  rx={MACRO_BAR_HEIGHT / 2}
                  fill={macro.color}
                />
              ) : null}
            </G>
          );
        })}

        <Rect
          x={CARD_MARGIN}
          y={RULE_Y}
          width={CONTENT_WIDTH}
          height={HAIRLINE}
          fill={lightColors.line}
        />

        {card.empty ? (
          <SvgText
            x={CARD_MARGIN}
            y={EMPTY_BASELINE}
            fill={lightColors.inkMuted}
            fontSize={SIZE.entry}
            fontFamily={fontFamily.body}
          >
            {t('share.emptyDay')}
          </SvgText>
        ) : (
          card.blocks.map((block, index) => {
            const top = cursor;
            const lines = block.entries.length + (block.hidden > 0 ? 1 : 0);
            cursor =
              top + MEAL_HEADER_HEIGHT + lines * MEAL_ENTRY_HEIGHT + MEAL_GAP;
            return (
              <G key={block.meal}>
                {index === 0 ? null : (
                  <Rect
                    x={CARD_MARGIN}
                    y={top - MEAL_GAP / 2}
                    width={CONTENT_WIDTH}
                    height={HAIRLINE}
                    fill={lightColors.line}
                  />
                )}
                <SvgText
                  x={CARD_MARGIN}
                  y={top + MEAL_NAME_BASELINE}
                  fill={lightColors.ink}
                  fontSize={SIZE.mealName}
                  fontFamily={fontFamily.bodyMedium}
                >
                  {t(`meals.${block.meal}`)}
                </SvgText>
                <SvgText
                  x={RIGHT_EDGE}
                  y={top + MEAL_NAME_BASELINE}
                  fill={lightColors.ink}
                  fontSize={SIZE.mealKcal}
                  fontFamily={fontFamily.displaySemiBold}
                  textAnchor="end"
                >
                  {t('share.cardMealKcal', { kcal: formatKcal(block.kcal) })}
                </SvgText>
                {block.entries.map((entry, at) => (
                  <SvgText
                    key={`${block.meal}-${at}`}
                    x={CARD_MARGIN}
                    y={
                      top +
                      MEAL_HEADER_HEIGHT +
                      at * MEAL_ENTRY_HEIGHT +
                      ENTRY_BASELINE_IN_ROW
                    }
                    fill={lightColors.inkMuted}
                    fontSize={SIZE.entry}
                    fontFamily={fontFamily.body}
                  >
                    {fitText(
                      t('share.cardEntry', {
                        food: entry.name,
                        portion: `${formatGrams(entry.grams)} ${t(
                          'common.grams',
                        )}`,
                        kcal: formatKcal(entry.kcal),
                      }),
                      CONTENT_WIDTH,
                      SIZE.entry,
                    )}
                  </SvgText>
                ))}
                {block.hidden > 0 ? (
                  <SvgText
                    x={CARD_MARGIN}
                    y={
                      top +
                      MEAL_HEADER_HEIGHT +
                      block.entries.length * MEAL_ENTRY_HEIGHT +
                      ENTRY_BASELINE_IN_ROW
                    }
                    fill={lightColors.inkSubtle}
                    fontSize={SIZE.entry}
                    fontFamily={fontFamily.body}
                  >
                    {t('share.cardMore', { count: block.hidden })}
                  </SvgText>
                ) : null}
              </G>
            );
          })
        )}

        <SvgText
          x={CARD_MARGIN}
          y={FOOTER_BASELINE}
          fill={lightColors.inkMuted}
          fontSize={SIZE.footer}
          fontFamily={fontFamily.bodyMedium}
        >
          {t('share.cardFooter')}
        </SvgText>
      </Svg>
    );
  },
);

/** One macro's share of the day's energy, for its bar. */
function share(macroKcal: number, day: ShareDay): number {
  const total =
    day.totals.protein * 4 + day.totals.carbs * 4 + day.totals.fat * 9;
  if (total <= 0) return 0;
  return Math.min(macroKcal / total, 1);
}
