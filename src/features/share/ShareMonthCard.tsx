import React, { forwardRef } from 'react';
import Svg, { G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { BRAND_MARK_PATH, BRAND_MARK_VIEW } from '../../components/BrandMark';
import { dateFromDayKey, weekDays, type DayKey } from '../../domain/diary/days';
import {
  CARD_HEIGHT,
  CARD_MARGIN,
  CARD_WIDTH,
  fitText,
} from '../../domain/share/dayCard';
import {
  MONTH_CELL,
  MONTH_COLUMNS,
  type MonthCardModel,
} from '../../domain/share/monthCard';
import { t } from '../../i18n';
import {
  formatKcal,
  formatMacroGrams,
  formatMonthTitle,
  formatWeekdayShort,
} from '../../i18n/format';
import { lightColors } from '../../theme/colors';
import { fontFamily } from '../../theme/type';

/**
 * The month as a picture, same 1080 × 1350 as the day.
 *
 * A cell is 136 px, about 68 px once a chat has shown the image: the day, its
 * kcal and a three-part bar for the macro split are what stay readable at that
 * size. The grams of each macro were cut from the cell — at this scale they
 * would land under ten effective pixels and smear as soon as the image is
 * re-encoded — and come back in the footer, as the month's total and the
 * average day.
 */

const SIZE = {
  wordmark: 40,
  month: 56,
  weekday: 24,
  dayOfMonth: 24,
  kcal: 30,
  footer: 30,
  footerQuiet: 28,
  brand: 24,
} as const;

const MARK_SIZE = 44;
const MARK_TOP = 56;
const WORDMARK_X = CARD_MARGIN + MARK_SIZE + 20;
const BRAND_BASELINE = MARK_TOP + 34;
const MONTH_BASELINE = 208;
const WEEKDAY_BASELINE = 268;
const GRID_TOP = 288;
const CELL_INSET = 4;
const CELL_BOX = MONTH_CELL - CELL_INSET * 2;
const CELL_RADIUS = 12;
const DAY_BASELINE = 38;
const KCAL_BASELINE = 84;
const BAR_TOP = 100;
const BAR_HEIGHT = 8;
const BAR_INSET = 14;
const BAR_WIDTH = CELL_BOX - BAR_INSET * 2;
const FOOTER_TOTAL_BASELINE = 1194;
const FOOTER_AVERAGE_BASELINE = 1244;
const FOOTER_BRAND_BASELINE = 1306;
const CONTENT_WIDTH = CARD_WIDTH - CARD_MARGIN * 2;
const HAIRLINE = 2;
const RULE_Y = 1140;
/** Any Monday: the week of 2024-01-01 is one, as in the day picker. */
const WEEK_SAMPLE: DayKey = '2024-01-01';

export interface ShareMonthCardProps {
  month: MonthCardModel;
}

export const ShareMonthCard = forwardRef<Svg, ShareMonthCardProps>(
  function ShareMonthCardBase({ month }, ref) {
    const title = formatMonthTitle(dateFromDayKey(month.monthStart));
    const weekdays = weekDays(WEEK_SAMPLE).map(day =>
      formatWeekdayShort(dateFromDayKey(day)),
    );

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
          y={MONTH_BASELINE}
          fill={lightColors.ink}
          fontSize={SIZE.month}
          fontFamily={fontFamily.displaySemiBold}
        >
          {fitText(title, CONTENT_WIDTH, SIZE.month)}
        </SvgText>

        {weekdays.map((label, column) => (
          <SvgText
            key={label}
            x={CARD_MARGIN + column * MONTH_CELL + MONTH_CELL / 2}
            y={WEEKDAY_BASELINE}
            fill={lightColors.inkMuted}
            fontSize={SIZE.weekday}
            fontFamily={fontFamily.bodyMedium}
            textAnchor="middle"
          >
            {label}
          </SvgText>
        ))}

        {month.cells.map((cell, index) => {
          if (cell.day === null) return null;
          const column = index % MONTH_COLUMNS;
          const row = Math.floor(index / MONTH_COLUMNS);
          const x = CARD_MARGIN + column * MONTH_CELL + CELL_INSET;
          const y = GRID_TOP + row * MONTH_CELL + CELL_INSET;
          const logged = cell.logged;
          let barX = x + BAR_INSET;
          return (
            <G key={cell.day}>
              <Rect
                x={x}
                y={y}
                width={CELL_BOX}
                height={CELL_BOX}
                rx={CELL_RADIUS}
                fill={logged ? lightColors.surface : 'none'}
                stroke={lightColors.line}
                strokeWidth={HAIRLINE}
              />
              <SvgText
                x={x + BAR_INSET}
                y={y + DAY_BASELINE}
                fill={logged ? lightColors.inkMuted : lightColors.inkSubtle}
                fontSize={SIZE.dayOfMonth}
                fontFamily={fontFamily.bodyMedium}
              >
                {String(cell.dayOfMonth)}
              </SvgText>
              <SvgText
                x={x + CELL_BOX / 2}
                y={y + KCAL_BASELINE}
                fill={logged ? lightColors.ink : lightColors.inkSubtle}
                fontSize={SIZE.kcal}
                fontFamily={
                  logged ? fontFamily.bodySemiBold : fontFamily.bodyMedium
                }
                textAnchor="middle"
              >
                {logged ? formatKcal(cell.kcal) : t('share.monthEmptyCell')}
              </SvgText>
              {logged
                ? (
                    [
                      { key: 'protein', color: lightColors.protein },
                      { key: 'carbs', color: lightColors.carbs },
                      { key: 'fat', color: lightColors.fat },
                    ] as const
                  ).map(segment => {
                    const width = BAR_WIDTH * cell.share[segment.key];
                    const at = barX;
                    barX += width;
                    return width <= 0 ? null : (
                      <Rect
                        key={segment.key}
                        x={at}
                        y={y + BAR_TOP}
                        width={width}
                        height={BAR_HEIGHT}
                        fill={segment.color}
                      />
                    );
                  })
                : null}
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
        {month.empty || month.average === null ? (
          <SvgText
            x={CARD_MARGIN}
            y={FOOTER_TOTAL_BASELINE}
            fill={lightColors.inkMuted}
            fontSize={SIZE.footer}
            fontFamily={fontFamily.body}
          >
            {t('share.emptyMonth')}
          </SvgText>
        ) : (
          <>
            <SvgText
              x={CARD_MARGIN}
              y={FOOTER_TOTAL_BASELINE}
              fill={lightColors.ink}
              fontSize={SIZE.footer}
              fontFamily={fontFamily.bodyMedium}
            >
              {t(
                month.loggedDays === 1
                  ? 'share.monthTotalOne'
                  : 'share.monthTotal',
                {
                  kcal: formatKcal(month.total.kcal),
                  days: month.loggedDays,
                },
              )}
            </SvgText>
            <SvgText
              x={CARD_MARGIN}
              y={FOOTER_AVERAGE_BASELINE}
              fill={lightColors.inkMuted}
              fontSize={SIZE.footerQuiet}
              fontFamily={fontFamily.body}
            >
              {t('share.monthAverage', {
                protein: formatMacroGrams(month.average.protein),
                carbs: formatMacroGrams(month.average.carbs),
                fat: formatMacroGrams(month.average.fat),
              })}
            </SvgText>
          </>
        )}
        <SvgText
          x={CARD_MARGIN}
          y={FOOTER_BRAND_BASELINE}
          fill={lightColors.inkMuted}
          fontSize={SIZE.brand}
          fontFamily={fontFamily.bodyMedium}
        >
          {t('share.cardFooter')}
        </SvgText>
      </Svg>
    );
  },
);
