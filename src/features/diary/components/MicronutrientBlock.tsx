import React, { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import type { DiaryEntryView } from '../../../data/diary/DiaryRepository';
import {
  summarizeMicros,
  type MicroTotal,
} from '../../../domain/nutrition/micronutrients';
import { t } from '../../../i18n';
import { formatMicroAmount } from '../../../i18n/format';
import { useTheme, type AppTheme } from '../../../theme';
import { textDefaults } from '../../../theme/type';
import { MacroBar } from '../../../components/MacroBar';

/** Two columns, and the same 12 dp between the rows. */
const GRID_GAP = 12;
const COLUMNS = 2;

export interface MicronutrientBlockProps {
  entries: readonly DiaryEntryView[];
  /** Only the current day says "hoje"; the strip can be on another one. */
  isToday: boolean;
  animate: boolean;
}

/**
 * The day's minerals, fibre and sodium, under the last meal (task 20).
 *
 * Read-only on purpose: nothing here is tappable and nothing pushes a screen.
 * Every bar is drawn in `ink` — six indigo bars would kill the single accent
 * the screen keeps for its primary action — and sodium is set apart by the
 * word "Limites", because a colour cannot carry that meaning on its own.
 * There is no percentage anywhere, and a nutrient no food of the day carried
 * says "sem dado" instead of showing a zero it never measured.
 */
export function MicronutrientBlock({
  entries,
  isToday,
  animate,
}: MicronutrientBlockProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const summary = useMemo(() => summarizeMicros(entries), [entries]);

  // (328 − 12) / 2 = 158 dp on the 360 dp reference device.
  const cellWidth = Math.floor(
    (width - 2 * theme.spacing.lg - GRID_GAP) / COLUMNS,
  );
  const rows: MicroTotal[][] = [];
  for (let index = 0; index < summary.grid.length; index += COLUMNS)
    rows.push(summary.grid.slice(index, index + COLUMNS));

  const { withData, total } = summary.coverage;
  const suffix = total === 1 ? 'One' : '';
  const coverage = isToday
    ? t(`today.minerals.coverage${suffix}`, { n: withData, m: total })
    : t(`today.minerals.coverageDay${suffix}`, { n: withData, m: total });

  return (
    <View testID="minerals-block">
      <View
        style={[
          styles.rule,
          {
            backgroundColor: theme.colors.line,
            marginTop: theme.spacing.sm,
            marginHorizontal: theme.spacing.lg,
          },
        ]}
      />
      <View
        style={[
          styles.body,
          {
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.lg,
          },
        ]}
      >
        <Text
          style={[
            theme.type.label,
            textDefaults,
            { color: theme.colors.inkMuted },
          ]}
          maxFontSizeMultiplier={1.3}
          testID="minerals-coverage"
        >
          {coverage}
        </Text>
        <View style={{ marginTop: theme.spacing.md }}>
          {rows.map((row, index) => (
            <View
              key={row[0]?.key ?? index}
              style={[
                styles.row,
                index === 0 ? null : { marginTop: GRID_GAP },
                { gap: GRID_GAP },
              ]}
            >
              {row.map(cell => (
                <MicroCell
                  key={cell.key}
                  total={cell}
                  theme={theme}
                  width={cellWidth}
                  animate={animate}
                />
              ))}
            </View>
          ))}
        </View>
        <Text
          style={[
            theme.type.labelMedium,
            textDefaults,
            { color: theme.colors.inkMuted, marginTop: theme.spacing.lg },
          ]}
          maxFontSizeMultiplier={1.3}
        >
          {t('today.minerals.limits')}
        </Text>
        <View style={{ marginTop: theme.spacing.sm }}>
          {summary.limits.map(cell => (
            <MicroCell
              key={cell.key}
              total={cell}
              theme={theme}
              animate={animate}
            />
          ))}
        </View>
        <Text
          style={[
            theme.type.caption,
            textDefaults,
            { color: theme.colors.inkMuted, marginTop: theme.spacing.md },
          ]}
          maxFontSizeMultiplier={1.3}
          testID="minerals-footnote"
        >
          {t('today.minerals.footnote')}
        </Text>
      </View>
    </View>
  );
}

interface MicroCellProps {
  total: MicroTotal;
  theme: AppTheme;
  /** Absent for sodium, which takes the whole width under "Limites". */
  width?: number;
  animate: boolean;
}

function MicroCell({ total, theme, width, animate }: MicroCellProps) {
  const label = t(`today.minerals.${total.key}`);
  const value = total.hasData
    ? formatMicroAmount(total.consumed, total.reference, total.unit)
    : t('today.minerals.noData');
  /*
    A screen reader hears the unit spelled out ("14 miligramas"), because "mg"
    is read letter by letter on Android.
  */
  const speech = total.hasData
    ? t('today.minerals.cellLabel', {
        label,
        amount: formatMicroAmount(
          total.consumed,
          total.reference,
          t(
            total.unit === 'g'
              ? 'today.minerals.unitG'
              : 'today.minerals.unitMg',
          ),
        ),
      })
    : t('today.minerals.cellLabelNoData', { label });

  return (
    <View
      style={width === undefined ? styles.fullWidth : { width }}
      accessible
      accessibilityLabel={speech}
      testID={`micro-${total.key}`}
    >
      <MacroBar
        label={label}
        value={value}
        ratio={total.ratio}
        color={theme.colors.ink}
        animate={animate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  body: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
});
