import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { Chip, ChipRow } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Sheet } from '../../components/Sheet';
import { SourceBadge } from '../../components/SourceBadge';
import { Stepper } from '../../components/Stepper';
import { TextButton } from '../../components/TextButton';
import { haptics } from '../../components/haptics';
import { usePressAnimation } from '../../components/usePressAnimation';
import { diaryRepository } from '../../data/diary/DiaryRepository';
import { MEALS } from '../../domain/diary/Meal';
import type { Meal } from '../../domain/diary/Meal';
import {
  servingLabel,
  unitKey,
  type PortionUnit,
} from '../../domain/food/portion';
import { localizedName } from '../../domain/food/rank';
import { currentLanguage, t } from '../../i18n';
import { formatGrams, formatKcal, formatQuantity } from '../../i18n/format';
import { useTheme } from '../../theme';
import { CONFIRM_SETTLED_MS } from '../../theme/motion';
import { textDefaults } from '../../theme/type';
import { requestEntryRemoval, setPortionSheetOpen } from './portionSheet';
import { usePortion } from './usePortion';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Portion'>;
type Route = RouteProp<RootStackParamList, 'Portion'>;

/** Design system §2.12: the gaps down the sheet. */
const HEADER_TO_STEPPER = 24;
const STEPPER_TO_MACROS = 8;
const MACROS_TO_CHIPS = 24;
const CHIPS_TO_BUTTON = 24;
const LABEL_TO_CHIPS = 8;
/** "Ver no Open Food Facts", 8 dp under the measures. */
const LINK_TOP = 8;

/**
 * The label of a chip: a household measure, "porção de 100 g" or "g". A liquid
 * says "ml" and "porção de 100 ml" for the same numbers — 1 ml = 1 g here, see
 * src/domain/food/liquid.ts (spec 09).
 */
function chipLabel(unit: PortionUnit, liquid: boolean): string {
  const base = liquid ? t('common.milliliters') : t('common.grams');
  if (unit.kind === 'grams') return base;
  if (unit.serving.kind === 'reference')
    return t(liquid ? 'portion.referenceChipMl' : 'portion.referenceChip');
  return servingLabel(unit.serving, currentLanguage()) ?? base;
}

const FAVORITE_LOG_TAG = '[bocado:favorite]';

/**
 * The heart of the sheet (spec 04): neutral ink, never the accent — this
 * screen already spends its accent on "Adicionar" — filled once the food is a
 * favourite, so "Favoritos" on the search screen is one tap away.
 */
function FavoriteButton({
  favorite,
  onPress,
}: {
  favorite: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityState={{ checked: favorite, selected: favorite }}
      accessibilityLabel={t(
        favorite ? 'portion.unfavorite' : 'portion.favorite',
      )}
      style={[
        styles.favorite,
        { width: theme.touchTarget, height: theme.touchTarget },
      ]}
      testID="portion-favorite"
    >
      <Animated.View style={press.style}>
        <Icon
          name="heart"
          size="action"
          color={favorite ? theme.colors.ink : theme.colors.inkMuted}
          fill={favorite ? theme.colors.ink : 'none'}
        />
      </Animated.View>
    </Pressable>
  );
}

/**
 * The portion sheet (docs/specs/03): a big editable number with its unit, the
 * food's household measures as chips with "g" last, a −/+ stepper, the live
 * kcal · P · C · G line and one primary button carrying the kcal. Editing an
 * entry adds "Mover para…"; there is no "Cancelar" — dragging down, the scrim
 * and back all close without writing.
 */
export function PortionSheetScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { params } = useRoute<Route>();
  const portion = usePortion(params);
  const {
    food,
    unit,
    units,
    quantity,
    snapshot,
    editing,
    entry,
    targetMeal,
    gone,
  } = portion;

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const { foodId } = params;
  const [favorite, setFavorite] = useState(false);
  useEffect(() => {
    let active = true;
    diaryRepository
      .isFavorite(foodId)
      .then(value => {
        if (active) setFavorite(value);
      })
      .catch(error => {
        console.warn(`${FAVORITE_LOG_TAG} read failed: ${String(error)}`);
      });
    return () => {
      active = false;
    };
  }, [foodId]);

  const toggleFavorite = useCallback(() => {
    const next = !favorite;
    setFavorite(next);
    haptics.selection();
    diaryRepository.setFavorite(foodId, next).catch(error => {
      console.warn(`${FAVORITE_LOG_TAG} write failed: ${String(error)}`);
      setFavorite(!next);
    });
  }, [favorite, foodId]);

  // Announced for as long as the route lives, so the screen underneath can
  // step out of the accessibility tree and stop competing for taps.
  useEffect(() => {
    setPortionSheetOpen(true);
    return () => setPortionSheetOpen(false);
  }, []);

  const removeEntry = useCallback(() => {
    if (!entry) return;
    haptics.selection();
    requestEntryRemoval(entry);
    navigation.goBack();
  }, [entry, navigation]);

  /*
    Confirming, in this order: the write leaves at the touch (decision 5), the
    "✓" takes the button's place in the same tick, it is held for its own
    length, and only then does the sheet play the exit every other dismissal
    plays. Nothing waits for the write — the entry is on disk either way, and
    the snackbar counts from there. The guard is what keeps a double tap to one
    entry and one vibration.
  */
  const [confirmed, setConfirmed] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const confirming = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (holdTimer.current !== null) clearTimeout(holdTimer.current);
    },
    [],
  );

  const confirm = useCallback(() => {
    if (confirming.current) return;
    confirming.current = true;
    portion
      .confirm()
      .then(() => {
        haptics.added();
      })
      .catch(() => {
        // The row was not written, so the sheet stays and the button goes back
        // to being an offer rather than an answer.
        confirming.current = false;
        if (holdTimer.current !== null) {
          clearTimeout(holdTimer.current);
          holdTimer.current = null;
        }
        setConfirmed(false);
        setLeaving(false);
      });
    setConfirmed(true);
    /*
      The whole confirmation happens before the sheet starts leaving. The two
      cannot overlap: the exit fades the surface in 120 ms while the "✓" is
      still growing over 200 ms, and the two opacities multiply into a peak of
      about 0,15 — nobody sees that. And the "✓" arriving is not yet a "✓" to
      read, so it stands still for a beat before the sheet goes. One path for
      reduced motion too, which removes the exit altogether. The row was
      written at the touch and the snackbar counts from there; only the sheet
      waits.
    */
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      setLeaving(true);
    }, CONFIRM_SETTLED_MS);
  }, [portion]);

  // The entry was removed while the sheet was on its way in: there is nothing
  // left to edit, so the screen leaves instead of offering a "Salvar" that
  // would write a second row. A sheet already on its way out is left alone —
  // its own exit is what pops the route, and popping it twice would take the
  // screen underneath with it.
  useEffect(() => {
    if (gone && !leaving) navigation.goBack();
  }, [gone, leaving, navigation]);

  const name = food ? localizedName(food, currentLanguage()) : '';
  const kcal = snapshot ? Math.round(snapshot.kcal) : 0;
  const macroLine = snapshot
    ? t('portion.macroLine', {
        kcal: formatKcal(snapshot.kcal),
        protein: formatGrams(snapshot.protein),
        carbs: formatGrams(snapshot.carbs),
        fat: formatGrams(snapshot.fat),
      })
    : '';
  const macroA11y = snapshot
    ? t('portion.macroLineA11y', {
        kcal: formatKcal(snapshot.kcal),
        protein: formatGrams(snapshot.protein),
        carbs: formatGrams(snapshot.carbs),
        fat: formatGrams(snapshot.fat),
      })
    : '';

  const liquid = food?.isLiquid === true;
  const unitText = unit ? chipLabel(unit, liquid) : '';
  const formattedQuantity = unit
    ? unit.kind === 'grams'
      ? formatGrams(quantity)
      : formatQuantity(quantity)
    : '';

  const sourceUrl = food?.attribution.url;
  const openSource = useCallback(() => {
    if (sourceUrl === undefined) return;
    Linking.openURL(sourceUrl).catch(error => {
      console.warn(`${FAVORITE_LOG_TAG} link failed: ${String(error)}`);
    });
  }, [sourceUrl]);

  const selectMeal = useCallback(
    (meal: Meal) => {
      haptics.selection();
      portion.selectMeal(meal);
    },
    [portion],
  );

  const selectUnit = useCallback(
    (next: PortionUnit) => {
      haptics.selection();
      portion.selectUnit(next);
    },
    [portion],
  );

  const mealChips = useMemo(
    () => MEALS.map(meal => ({ meal, label: t(`meals.${meal}`) })),
    [],
  );

  // Spec 09: "g" (or "ml") holds the *head* of the line, out of the scroll,
  // because weighing is the common case. The measures scroll on their own to
  // the right of it and the row moves to whichever of them is in effect;
  // "Jantar", last of the meals, keeps its pin at the other end.
  const measures = useMemo(
    () => units.filter(candidate => candidate.kind !== 'grams'),
    [units],
  );
  const gramsUnit = units.find(candidate => candidate.kind === 'grams');
  const selectedMeasureIndex =
    unit && unit.kind !== 'grams'
      ? measures.findIndex(candidate => unitKey(candidate) === unitKey(unit))
      : undefined;
  const selectedMealIndex = MEALS.indexOf(targetMeal);

  // The sheet is mounted only once the food and its chip are known, so the
  // entrance runs from the sheet's real height instead of growing on screen.
  // The route itself arrives without a transition, so this costs a frame.
  // A sheet already leaving keeps its frames: unmounting mid-exit would drop
  // the animation that pops the route, and the sheet would never come off.
  if ((gone && !leaving) || food === null || unit === null) return null;

  return (
    <Sheet
      onClose={close}
      closing={leaving}
      footer={
        // Outside the scrollable body on purpose: the button carries the kcal
        // and closes the sheet, so it holds the bottom instead of being one
        // more thing to scroll to.
        <View style={[styles.confirm, { marginTop: CHIPS_TO_BUTTON }]}>
          <PrimaryButton
            label={t(editing ? 'portion.save' : 'portion.add', {
              kcal: formatKcal(kcal),
            })}
            onPress={confirm}
            confirmed={confirmed}
            testID="portion-confirm"
          />
          {/*
            Removing was only reachable by swiping a row, and a hidden gesture
            is not a path (spec 09). It is stated here, under the primary
            button, in `danger` — the one place the app spends that colour —
            and it goes through the screen's own removal, so "Desfazer" still
            brings the entry back.
          */}
          {editing && entry ? (
            <TextButton
              label={t('portion.removeAction')}
              accessibilityLabel={t('today.removeEntry', { food: name })}
              onPress={removeEntry}
              tone="danger"
              testID="portion-remove"
            />
          ) : null}
        </View>
      }
      testID="portion-sheet"
    >
      <View style={{ paddingTop: theme.spacing.md }}>
        <View style={styles.titleRow}>
          <Text
            style={[
              theme.type.heading,
              textDefaults,
              styles.title,
              { color: theme.colors.ink },
            ]}
            numberOfLines={2}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
            testID="portion-name"
          >
            {name}
          </Text>
          <FavoriteButton favorite={favorite} onPress={toggleFavorite} />
        </View>
        <View style={[styles.meta, { marginTop: theme.spacing.xs }]}>
          <SourceBadge source={food.source} />
          <Text
            style={[
              theme.type.label,
              textDefaults,
              styles.metaText,
              {
                color: theme.colors.inkMuted,
                marginLeft: theme.spacing.sm,
              },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            testID="portion-meal"
          >
            {t('portion.forMeal', { meal: t(`meals.${targetMeal}`) })}
          </Text>
        </View>

        <View style={{ marginTop: HEADER_TO_STEPPER }}>
          <Stepper
            formatted={formattedQuantity}
            unit={unitText}
            valueText={t('portion.quantityValue', {
              quantity: formattedQuantity,
              unit: unitText,
            })}
            onStep={portion.step}
            onType={portion.typeQuantity}
            testID="portion-stepper"
          />
        </View>

        <View
          accessible
          accessibilityLabel={macroA11y}
          style={{ marginTop: STEPPER_TO_MACROS }}
        >
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            testID="portion-macros"
          >
            {macroLine}
          </Text>
        </View>

        <View style={{ marginTop: MACROS_TO_CHIPS }}>
          <ChipRow
            accessibilityLabel={t('portion.measures')}
            gutter={theme.spacing.lg}
            selectedIndex={selectedMeasureIndex}
            pinned={
              gramsUnit ? (
                <Chip
                  label={chipLabel(gramsUnit, liquid)}
                  selected={unitKey(unit) === unitKey(gramsUnit)}
                  onPress={() => selectUnit(gramsUnit)}
                  testID={`portion-unit-${unitKey(gramsUnit)}`}
                />
              ) : null
            }
            pinnedSide="start"
            testID="portion-units"
          >
            {measures.map(candidate => (
              <Chip
                key={unitKey(candidate)}
                label={chipLabel(candidate, liquid)}
                selected={unitKey(candidate) === unitKey(unit)}
                onPress={() => selectUnit(candidate)}
                testID={`portion-unit-${unitKey(candidate)}`}
              />
            ))}
          </ChipRow>
        </View>

        {/*
          The ODbL asks for a link back to the product page wherever its data
          is shown. It is also the only way to check a label the app cannot
          show in full — so it stays quiet ink, not the accent.
        */}
        {food.source === 'off' && food.attribution.url !== undefined ? (
          <View style={[styles.link, { marginLeft: -theme.spacing.md }]}>
            <TextButton
              label={t('portion.viewOnOff')}
              accessibilityLabel={t('portion.viewOnOffA11y')}
              onPress={openSource}
              variant="compact"
              tone="ink"
              icon="external-link"
              testID="portion-source-link"
            />
          </View>
        ) : null}

        {editing ? (
          <View style={{ marginTop: CHIPS_TO_BUTTON }}>
            <Text
              style={[
                theme.type.label,
                textDefaults,
                { color: theme.colors.inkMuted },
              ]}
              maxFontSizeMultiplier={1.3}
            >
              {t('portion.moveTo')}
            </Text>
            <View style={{ marginTop: LABEL_TO_CHIPS }}>
              <ChipRow
                accessibilityLabel={t('portion.moveTo')}
                gutter={theme.spacing.lg}
                selectedIndex={selectedMealIndex}
                testID="portion-meals"
              >
                {mealChips.map(option => (
                  <Chip
                    key={option.meal}
                    label={option.label}
                    selected={option.meal === targetMeal}
                    onPress={() => selectMeal(option.meal)}
                    testID={`portion-meal-${option.meal}`}
                  />
                ))}
              </ChipRow>
            </View>
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    flex: 1,
  },
  favorite: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    flexShrink: 1,
  },
  confirm: {
    alignItems: 'stretch',
  },
  link: {
    flexDirection: 'row',
    marginTop: LINK_TOP,
  },
});
