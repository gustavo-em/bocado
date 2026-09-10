import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { DailyGoal } from '../domain/diary/Meal';
import {
  heroValue,
  type DaySummary,
  type DiaryDisplayMode,
} from '../domain/diary/daySummary';
import { t } from '../i18n';
import { formatKcal } from '../i18n/format';
import { useTheme } from '../theme';
import { tabularNumbers, textDefaults } from '../theme/type';
import { CountUpText } from './CountUpText';
import { MacroBar } from './MacroBar';
import { ProgressBar } from './ProgressBar';

/** Design system §2.7: the block measures 169 dp including its 20 dp top. */
export const HERO_BLOCK_HEIGHT = 169;
const HERO_TOP = 20;
const BAR_TOP = 10;
const MACROS_TOP = 14;

export interface HeroBlockProps {
  /** `null` while the day is still loading: the number shows "—". */
  summary: DaySummary | null;
  goal: DailyGoal;
  isToday: boolean;
  /** `false` on the first paint of a day; `true` when totals change in place. */
  animate: boolean;
  /** "Metas" decides whether the number counts down or up. */
  mode: DiaryDisplayMode;
}

/**
 * The answer number: kcal remaining (or over), the line under it, the daily
 * bar and the three macro bars. One accessibility element, read as a progress
 * bar whose value is the whole sentence.
 */
export function HeroBlock({
  summary,
  goal,
  isToday,
  animate,
  mode,
}: HeroBlockProps) {
  const theme = useTheme();
  const goalKcal = Math.round(goal.kcal);
  const consumed = summary?.consumed.kcal ?? 0;
  const isOver = summary?.isOver ?? false;
  const answer = heroValue(summary, goalKcal, mode);
  const number = answer.kcal;

  let subtitle: string;
  if (answer.line === 'ofGoal') {
    subtitle = t('today.ofGoal', { goal: formatKcal(goalKcal) });
  } else if (answer.line === 'available') {
    subtitle = isToday ? t('today.availableToday') : t('today.availableOnDay');
  } else if (answer.line === 'over') {
    subtitle = t('today.overLine', {
      consumed: formatKcal(consumed),
      goal: formatKcal(goalKcal),
    });
  } else {
    subtitle = t('today.remainingLine', {
      consumed: formatKcal(consumed),
      goal: formatKcal(goalKcal),
    });
  }

  // The sentence a screen reader hears comes from the same answer the eye
  // reads: in "consumidas" nothing is said about what is left, because that
  // is not the number on the screen.
  let a11yValue: string;
  if (!summary) {
    a11yValue = t('today.loading');
  } else if (answer.line === 'ofGoal') {
    a11yValue = t('today.progressLabelConsumed', {
      consumed: formatKcal(consumed),
      goal: formatKcal(goalKcal),
    });
  } else if (isOver) {
    a11yValue = t('today.progressLabelOver', {
      consumed: formatKcal(consumed),
      goal: formatKcal(goalKcal),
      over: formatKcal(summary.overBy),
    });
  } else {
    a11yValue = t('today.progressLabel', {
      consumed: formatKcal(consumed),
      goal: formatKcal(goalKcal),
      remaining: formatKcal(summary.remaining),
    });
  }

  const macros = [
    {
      key: 'protein',
      label: t('today.protein'),
      consumed: summary?.consumed.protein ?? 0,
      goal: Math.round(goal.protein_g),
      ratio: summary?.macroRatio.protein ?? 0,
      color: theme.colors.protein,
    },
    {
      key: 'carbs',
      label: t('today.carbs'),
      consumed: summary?.consumed.carbs ?? 0,
      goal: Math.round(goal.carbs_g),
      ratio: summary?.macroRatio.carbs ?? 0,
      color: theme.colors.carbs,
    },
    {
      key: 'fat',
      label: t('today.fat'),
      consumed: summary?.consumed.fat ?? 0,
      goal: Math.round(goal.fat_g),
      ratio: summary?.macroRatio.fat ?? 0,
      color: theme.colors.fat,
    },
  ] as const;

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ text: a11yValue }}
      style={{ paddingHorizontal: theme.spacing.lg, paddingTop: HERO_TOP }}
      testID="hero-block"
    >
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {summary ? (
          <CountUpText
            value={number}
            animate={animate}
            style={[
              theme.type.hero,
              textDefaults,
              tabularNumbers,
              { color: theme.colors.ink },
            ]}
            testID="hero-number"
          />
        ) : (
          <Text
            style={[
              theme.type.hero,
              textDefaults,
              tabularNumbers,
              { color: theme.colors.inkMuted },
            ]}
            maxFontSizeMultiplier={1.3}
            testID="hero-number"
          >
            {t('today.loading')}
          </Text>
        )}
        <Text
          style={[
            theme.type.body,
            textDefaults,
            tabularNumbers,
            { color: theme.colors.inkMuted },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
          testID="hero-subtitle"
        >
          {subtitle}
        </Text>
        <View style={{ marginTop: BAR_TOP }}>
          <ProgressBar
            ratio={summary?.goalRatio ?? 0}
            overRatio={summary?.overRatio ?? 0}
            animate={animate}
          />
        </View>
        <View style={[styles.macros, { marginTop: MACROS_TOP }]}>
          {macros.map((macro, index) => (
            <View
              key={macro.key}
              style={[
                styles.macroColumn,
                index > 0 ? { marginLeft: theme.spacing.md } : null,
              ]}
            >
              <MacroBar
                label={macro.label}
                value={t('today.macroValue', {
                  consumed: formatKcal(macro.consumed),
                  goal: formatKcal(macro.goal),
                })}
                ratio={macro.ratio}
                color={macro.color}
                animate={animate}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  macros: {
    flexDirection: 'row',
  },
  macroColumn: {
    flex: 1,
  },
});
