import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FlashList,
  type FlashListRef,
  type ListRenderItem,
} from '@shopify/flash-list';
import {
  useIsFocused,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { AddTray, ADD_TRAY_HEIGHT } from '../../components/AddTray';
import { ActionChip, ChipRow } from '../../components/Chip';
import {
  FoodResultRow,
  type AddedPortion,
} from '../../components/FoodResultRow';
import { Icon } from '../../components/Icon';
import { SuggestionRepeatRow } from '../../components/SuggestionRepeatRow';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  SearchField,
  type SearchFieldHandle,
} from '../../components/SearchField';
import { SkeletonRows } from '../../components/SkeletonRow';
import { Snackbar } from '../../components/Snackbar';
import { TextButton } from '../../components/TextButton';
import { haptics } from '../../components/haptics';
import { usePressAnimation } from '../../components/usePressAnimation';
import type { DiaryEntryView } from '../../data/diary/DiaryRepository';
import type { NormalizedFood } from '../../domain/food/NormalizedFood';
import { groupBySource, mergeProductGroups } from '../../domain/food/grouping';
import { portionSnapshot, servingFromMemory } from '../../domain/food/portion';
import { localizedName } from '../../domain/food/rank';
import type { SuggestionItem } from '../suggestions/suggestionsService';
import {
  isPortionSheetOpen,
  rememberFood,
  subscribePortionSheetOpen,
} from '../portion/portionSheet';
import { usePendingRemoval } from '../portion/usePendingRemoval';
import { currentLanguage, t } from '../../i18n';
import {
  formatKcal,
  formatMealDay,
  formatPortionSpeech,
} from '../../i18n/format';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';
import { useAddSession } from './hooks/useAddSession';
import { useFoodSearch, type SearchStatus } from './hooks/useFoodSearch';
import { useSuggestions } from './hooks/useSuggestions';
import { useKeyboardInset } from '../../components/useKeyboardInset';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'AddFood'>;
type Route = RouteProp<RootStackParamList, 'AddFood'>;

/** Design system §2.14: the field sits 4 dp under the header, 12 dp over the list. */
const FIELD_TOP = 4;
const FIELD_BOTTOM = 12;
/** Section labels: 20 dp above, 8 dp below (§2.4). */
const SECTION_TOP = 20;
const SECTION_BOTTOM = 8;
/** The empty and preparing states start 24 dp under the field. */
const STATE_TOP = 24;
/** "Registrar só as calorias" sits 8 dp under the empty state's hint. */
const STATE_ACTION_TOP = 8;
/** The offline strip: one line of `label`, edge to edge (spec 05). */
const OFFLINE_BANNER_HEIGHT = 40;
/** Room under the last row so the tray never covers it. */
const LIST_TAIL = 64;
const SEARCH_LOG_TAG = '[bocado:add-food]';
/** The snackbar floats 8 dp above the tray. */
const SNACKBAR_GAP = 8;

/** "Seus": history and favourites that match what is being typed (spec 04). */
const YOURS_LIMIT = 3;

type ListItem =
  | { type: 'header'; key: string; title: string }
  /**
   * `foodIndex` counts result rows only. The stagger is about the rows the
   * user reads, so a header or the "Repetir" line must not spend one of the
   * six places it has.
   */
  | { type: 'food'; key: string; food: NormalizedFood; foodIndex: number }
  | {
      type: 'repeat';
      key: string;
      title: string;
      detail: string;
      label: string;
      day: string;
    }
  | { type: 'chips'; key: string; group: string; items: SuggestionItem[] }
  | { type: 'more'; key: string }
  /** Footer of the "Produtos" group while a round is still running. */
  | { type: 'progress'; key: string }
  /** "Registrar só as calorias", the way out when nothing fits. */
  | { type: 'quick'; key: string };

function CloseButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const press = usePressAnimation(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
      style={[
        styles.close,
        { width: theme.touchTarget, height: theme.touchTarget },
      ]}
      testID="add-food-close"
    >
      <Animated.View style={press.style}>
        <Icon name="x" size="action" color={theme.colors.ink} />
      </Animated.View>
    </Pressable>
  );
}

function SectionLabel({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <Text
      style={[
        theme.type.labelMedium,
        textDefaults,
        styles.section,
        { color: theme.colors.inkMuted, paddingHorizontal: theme.spacing.lg },
      ]}
      maxFontSizeMultiplier={1.3}
      accessibilityRole="header"
    >
      {title}
    </Text>
  );
}

interface SuggestionChipsProps {
  /** Announced as the line's name: "Recentes", "Favoritos". */
  group: string;
  items: SuggestionItem[];
  mealName: string;
  onAdd: (item: SuggestionItem) => void;
  onOpen: (item: SuggestionItem) => void;
  testID: string;
}

/**
 * A line of chips that log in one tap (spec 04). The label carries the food
 * and the kcal of the portion it will write; a long press opens the portion
 * sheet instead — and so does the same food's row above, for anyone who
 * cannot long press.
 */
const SuggestionChips = React.memo(function SuggestionChipsBase({
  group,
  items,
  mealName,
  onAdd,
  onOpen,
  testID,
}: SuggestionChipsProps) {
  const theme = useTheme();
  const locale = currentLanguage();
  return (
    <View style={{ paddingHorizontal: theme.spacing.lg }}>
      <ChipRow
        accessibilityLabel={group}
        group="actions"
        gutter={theme.spacing.lg}
        testID={testID}
      >
        {items.map(item => {
          const name = localizedName(item.food, locale);
          return (
            <ActionChip
              key={item.food.id}
              label={name}
              detail={t('meal.subtotal', {
                kcal: formatKcal(item.portion.kcal),
              })}
              accessibilityLabel={t('search.chipA11y', {
                food: name,
                portion: formatPortionSpeech(item.portion),
                kcal: formatKcal(item.portion.kcal),
                meal: mealName,
              })}
              accessibilityHint={t('search.chipHint')}
              onPress={() => onAdd(item)}
              onLongPress={() => onOpen(item)}
              longPressLabel={t('portion.quantityHint')}
              testID={`${testID}-${item.food.id}`}
            />
          );
        })}
      </ChipRow>
    </View>
  );
});

function ListState({
  status,
  query,
  onQuickLog,
}: {
  status: SearchStatus;
  query: string;
  onQuickLog: () => void;
}) {
  const theme = useTheme();
  if (status !== 'empty' && status !== 'preparing') return null;
  const body = [theme.type.body, textDefaults, { color: theme.colors.ink }];
  const hint = [
    theme.type.label,
    textDefaults,
    { color: theme.colors.inkMuted },
  ];
  return (
    <View
      style={[styles.state, { paddingHorizontal: theme.spacing.lg }]}
      testID={`add-food-${status}`}
    >
      {status === 'preparing' ? (
        <View style={styles.preparing}>
          <ActivityIndicator size="small" color={theme.colors.inkMuted} />
          <Text
            style={[body, { marginLeft: theme.spacing.sm }]}
            maxFontSizeMultiplier={1.3}
          >
            {t('search.preparing')}
          </Text>
        </View>
      ) : (
        <>
          <Text style={body} maxFontSizeMultiplier={1.3}>
            {t('search.noResults', { query })}
          </Text>
          <Text
            style={[hint, { marginTop: theme.spacing.xs }]}
            maxFontSizeMultiplier={1.3}
          >
            {t('search.noResultsHint')}
          </Text>
          {/*
            No table has this food, so the way forward is to write down what
            the user does know. `ink`, not the accent: the tray may already be
            spending it.
          */}
          <View style={[styles.stateAction, { marginLeft: -theme.spacing.md }]}>
            <TextButton
              label={t('search.quickLog')}
              accessibilityLabel={t('search.quickLog')}
              onPress={onQuickLog}
              tone="ink"
              testID="add-food-quick-log"
            />
          </View>
        </>
      )}
    </View>
  );
}

/** How many rows hold the place of the products still on their way. */
const PRODUCTS_SKELETON_ROWS = 3;

/**
 * Spec 05: the group's own footer while products are still coming. It appears
 * only after 300 ms and only at the end of the list, so nothing already on
 * screen moves for it — three rows in the shape of the ones about to land,
 * which is also the only loading state the app has.
 */
function ProductsProgress() {
  return (
    <SkeletonRows
      count={PRODUCTS_SKELETON_ROWS}
      accessibilityLabel={t('search.searchingProductsA11y')}
      testID="add-food-products-progress"
    />
  );
}

/**
 * Spec 05: a quiet strip, outside the list so it never pushes rows around
 * mid-scroll. It states a fact and offers no retry.
 */
function OfflineBanner() {
  const theme = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      accessible
      accessibilityLabel={t('search.offlineBanner')}
      style={[
        styles.banner,
        {
          backgroundColor: theme.colors.surfaceMuted,
          paddingHorizontal: theme.spacing.lg,
        },
      ]}
      testID="add-food-offline"
    >
      <Icon name="cloud-off" size="row" color={theme.colors.inkMuted} />
      <Text
        style={[
          theme.type.label,
          textDefaults,
          styles.bannerText,
          { color: theme.colors.inkMuted, marginLeft: theme.spacing.sm },
        ]}
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {t('search.offlineBanner')}
      </Text>
    </View>
  );
}

const keyExtractor = (item: ListItem) => item.key;
const getItemType = (item: ListItem) => item.type;

/**
 * The "Buscar alimento" modal: header, field, one FlashList of suggestions or
 * ranked results, and — once something is added — the tray with "Concluir".
 * Every "+" writes to the diary at once; closing by any route keeps it.
 */
export function AddFoodScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();
  const { params } = useRoute<Route>();
  const { day, meal } = params;
  const search = useFoodSearch(meal);
  const session = useAddSession(day, meal);
  const keyboardPadding = useKeyboardInset(insets.bottom);
  const focused = useIsFocused();
  /**
   * The portion sheet says so itself: navigation focus alone did not settle
   * whether a transparent modal is covering this screen.
   */
  const sheetOpen = useSyncExternalStore(
    subscribePortionSheetOpen,
    isPortionSheetOpen,
  );
  /** True while the sheet owns the screen: nothing here may be reached. */
  const covered = sheetOpen || !focused;

  useEffect(() => {
    // Says whether this screen really heard the sheet open. If the tree still
    // lists `add-food-search` while this logs `covered=true`, the problem is
    // not here.
    if (__DEV__) {
      console.log(
        `${SEARCH_LOG_TAG} covered=${covered} sheet=${sheetOpen} focused=${focused}`,
      );
    }
  }, [covered, sheetOpen, focused]);
  const field = useRef<SearchFieldHandle>(null);

  useEffect(
    () =>
      navigation.addListener('transitionEnd', event => {
        if (!event.data.closing) field.current?.focus();
      }),
    [navigation],
  );

  // One session, one success: the tap on "Concluir" is felt once, and the next
  // time this screen opens it can be felt again.
  useEffect(() => {
    haptics.resetSuccess();
  }, []);

  const close = useCallback(() => navigation.goBack(), [navigation]);
  const done = useCallback(() => {
    haptics.success();
    navigation.goBack();
  }, [navigation]);

  const [trayExpanded, setTrayExpanded] = useState(false);
  const toggleTray = useCallback(() => setTrayExpanded(open => !open), []);

  // The row already holds the food, so the sheet paints without a round trip
  // to SQLite; `entryId` is what turns it into "Salvar".
  const openPortion = useCallback(
    (food: NormalizedFood) => {
      rememberFood(food);
      navigation.navigate('Portion', {
        day,
        meal,
        foodId: food.id,
        entryId: session.added.get(food.id)?.entryId,
      });
    },
    [navigation, day, meal, session.added],
  );

  const sessionRemove = session.remove;
  /**
   * "Remover" on the portion sheet, when the sheet was opened from here: the
   * session owns the deletion, so the tray, the "✓" and "Desfazer" all stay
   * in step with what left (spec 09).
   */
  const removeFromSheet = useCallback(
    (entry: DiaryEntryView) => {
      const item = session.added.get(entry.foodId);
      if (item) sessionRemove(item);
    },
    // The session object is rebuilt on every render; these two are not.
    [session.added, sessionRemove],
  );
  usePendingRemoval(removeFromSheet);

  const openQuickLog = useCallback(() => {
    haptics.selection();
    navigation.navigate('QuickLog', { day, meal });
  }, [navigation, day, meal]);

  const editItem = useCallback(
    (entry: DiaryEntryView) =>
      navigation.navigate('Portion', {
        day: entry.day,
        meal: entry.meal,
        foodId: entry.foodId,
        entryId: entry.id,
      }),
    [navigation],
  );

  const suggestions = useSuggestions(day, meal);
  /** Once the past meal has been copied, the line has nothing left to offer. */
  const [repeated, setRepeated] = useState(false);
  const mealName = t(`meals.${meal}`);

  const repeatLine = useMemo(() => {
    const source = suggestions?.repeat;
    if (!source || repeated) return null;
    const items =
      source.itemCount === 1
        ? t('search.oneItem')
        : t('search.itemsCount', { count: String(source.itemCount) });
    const title = t(
      source.kind === 'yesterday'
        ? 'search.repeatYesterday'
        : 'search.repeatLastWeek',
      { meal: t(`mealsLower.${meal}`) },
    );
    const kcal = formatKcal(source.kcal);
    return {
      day: source.day,
      title,
      detail: t('search.repeatDetail', { items, kcal }),
      label: t('search.repeatA11y', { title, items, kcal }),
    };
  }, [suggestions?.repeat, repeated, meal]);

  /**
   * The portion each row is about to write: the last one used for that food.
   * Precomputed per list so a memoised row keeps the same object between
   * renders.
   */
  const memory = suggestions?.memory;
  const previews = useMemo(() => {
    const map = new Map<string, AddedPortion>();
    const locale = currentLanguage();
    const remember = (item: SuggestionItem) => {
      if (item.remembered) map.set(item.food.id, item.portion);
    };
    suggestions?.items.forEach(remember);
    suggestions?.recents.forEach(remember);
    suggestions?.favorites.forEach(remember);
    if (memory) {
      for (const food of search.foods) {
        const known = memory.get(food.id);
        if (!known || map.has(food.id)) continue;
        const portion = servingFromMemory(food, known, locale);
        map.set(
          food.id,
          portionSnapshot(food, portion.serving, portion.servingCount, locale),
        );
      }
    }
    return map;
  }, [suggestions, memory, search.foods]);

  const items = useMemo<ListItem[]>(() => {
    // Every result row, wherever its group, takes the next number in the list.
    let foodCount = 0;
    const foodRow = (key: string, food: NormalizedFood): ListItem => ({
      type: 'food',
      key,
      food,
      foodIndex: foodCount++,
    });
    if (search.status === 'suggestions') {
      const foods =
        suggestions && suggestions.items.length > 0
          ? suggestions.items.map(item => item.food)
          : search.foods;
      const rows: ListItem[] = [];
      if (foods.length > 0 || repeatLine) {
        rows.push({
          type: 'header',
          key: 'suggestions',
          title: t('search.suggestions'),
        });
      }
      if (repeatLine) {
        rows.push({ type: 'repeat', key: 'repeat', ...repeatLine });
      }
      for (const food of foods) {
        rows.push(foodRow(food.id, food));
      }
      if (suggestions && suggestions.recents.length > 0) {
        rows.push({
          type: 'header',
          key: 'recents-header',
          title: t('search.recents'),
        });
        rows.push({
          type: 'chips',
          key: 'recent-chip',
          group: t('search.recents'),
          items: suggestions.recents,
        });
      }
      if (suggestions && suggestions.favorites.length > 0) {
        rows.push({
          type: 'header',
          key: 'favorites-header',
          title: t('search.favorites'),
        });
        rows.push({
          type: 'chips',
          key: 'favorite-chip',
          group: t('search.favorites'),
          items: suggestions.favorites,
        });
      }
      // Last line of the utilities, before anything is typed (spec 05).
      rows.push({ type: 'quick', key: 'quick-log' });
      return rows;
    }
    // "Seus" holds what the user has logged or favourited before, above the
    // bundled table — and out of it, so no food is offered twice.
    const history = suggestions?.historyIds;
    const yours = history
      ? search.foods.filter(food => history.has(food.id)).slice(0, YOURS_LIMIT)
      : [];
    const mine = new Set(yours.map(food => food.id));
    const rows: ListItem[] = [];
    if (yours.length > 0) {
      rows.push({ type: 'header', key: 'yours', title: t('search.yours') });
      for (const food of yours) {
        rows.push(foodRow(`yours-${food.id}`, food));
      }
    }
    /*
      The group is decided by the food's origin, not by the road it took to
      get here: once a label found online is cached in `foods`, the local
      search returns it like any other row, and it must keep reading as
      "Produtos" with its "Rótulo" badge instead of sliding into "Base"
      (spec 05).
    */
    const local = groupBySource(
      search.foods.filter(food => !mine.has(food.id)),
    );
    if (search.status === 'results' && local.base.length > 0) {
      rows.push({ type: 'header', key: 'base', title: t('search.base') });
      for (const food of local.base) {
        rows.push(foodRow(food.id, food));
      }
      if (search.hasMore) rows.push({ type: 'more', key: 'more' });
    }
    /*
      "Produtos" is always the tail of the list: the online half arrives
      hundreds of milliseconds after the local rows and may never arrive at
      all, so appending is the only place it can go without moving what the
      user is already reading (spec 05). The cached labels lead, in the order
      the ranking gave them; the fresh ones follow.
    */
    const products = mergeProductGroups(local.products, search.products);
    if (products.length > 0 || search.searchingProducts) {
      rows.push({
        type: 'header',
        key: 'products',
        title: t('search.products'),
      });
      for (const food of products) {
        rows.push(foodRow(food.id, food));
      }
      if (search.searchingProducts)
        rows.push({ type: 'progress', key: 'products-progress' });
    }
    return rows;
  }, [
    search.status,
    search.foods,
    search.hasMore,
    search.products,
    search.searchingProducts,
    suggestions,
    repeatLine,
  ]);

  const { added, add, copyMeal } = session;
  const { query, showMore } = search;

  // Read at tap time: the memory arrives after the first render and the row
  // callbacks must not be rebuilt (and the rows re-rendered) when it does.
  const memoryRef = useRef(memory);
  memoryRef.current = memory;
  const addFood = useCallback(
    (food: NormalizedFood) => {
      add(food, memoryRef.current?.get(food.id) ?? null);
    },
    [add],
  );
  const addChip = useCallback(
    (item: SuggestionItem) => add(item.food, item.memory),
    [add],
  );
  const openChip = useCallback(
    (item: SuggestionItem) => {
      haptics.selection();
      openPortion(item.food);
    },
    [openPortion],
  );
  const repeatDay = repeatLine?.day;
  const repeatMeal = useCallback(() => {
    if (repeatDay === undefined) return;
    setRepeated(true);
    copyMeal(repeatDay, t('search.repeatDone', { meal: mealName }));
  }, [copyMeal, repeatDay, mealName]);

  /*
    A new query is a new list. Without this the previous offset survives the
    change and the first rows — "Seus" and the head of "Base" — stay above the
    viewport, which reads as a list that opens blank.
  */
  const list = useRef<FlashListRef<ListItem>>(null);
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [search.query]);

  const renderItem = useCallback<ListRenderItem<ListItem>>(
    ({ item }) => {
      if (item.type === 'header') return <SectionLabel title={item.title} />;
      if (item.type === 'repeat') {
        return (
          <SuggestionRepeatRow
            title={item.title}
            detail={item.detail}
            accessibilityLabel={item.label}
            onPress={repeatMeal}
            testID="suggestion-repeat"
          />
        );
      }
      if (item.type === 'chips') {
        return (
          <SuggestionChips
            group={item.group}
            items={item.items}
            mealName={mealName}
            onAdd={addChip}
            onOpen={openChip}
            testID={item.key}
          />
        );
      }
      if (item.type === 'more') {
        return (
          <View style={[styles.more, { paddingHorizontal: theme.spacing.xs }]}>
            <TextButton
              label={t('search.showMore')}
              onPress={showMore}
              accessibilityLabel={t('search.showMore')}
              tone="ink"
              testID="add-food-more"
            />
          </View>
        );
      }
      if (item.type === 'progress') return <ProductsProgress />;
      if (item.type === 'quick') {
        return (
          <View style={[styles.more, { paddingHorizontal: theme.spacing.xs }]}>
            <TextButton
              label={t('search.quickLog')}
              onPress={openQuickLog}
              accessibilityLabel={t('search.quickLog')}
              tone="ink"
              testID="add-food-quick-log"
            />
          </View>
        );
      }
      const addedItem = added.get(item.food.id);
      return (
        <FoodResultRow
          food={item.food}
          added={addedItem !== undefined}
          addedPortion={addedItem?.entry}
          previewPortion={previews.get(item.food.id)}
          query={query}
          onAdd={addFood}
          onOpen={openPortion}
          index={item.foodIndex}
          testID={`food-${item.food.id}`}
        />
      );
    },
    [
      added,
      addFood,
      addChip,
      openChip,
      repeatMeal,
      mealName,
      previews,
      openPortion,
      openQuickLog,
      query,
      showMore,
      theme.spacing.xs,
    ],
  );

  const trayVisible = session.itemCount > 0;
  const trayHeight = ADD_TRAY_HEIGHT + insets.bottom;
  const trayItems = useMemo(() => Array.from(added.values()), [added]);

  return (
    /*
      The portion sheet is a transparent modal, so this screen stays mounted
      under it and its tray — the app's only elevated surface — kept ending up
      over the sheet's own footer in the accessibility tree, hiding
      "Adicionar · N kcal" and catching taps meant for it. While the sheet
      holds focus, everything here steps out of that tree.
    */
    <View
      importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={covered}
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
          paddingBottom: keyboardPadding,
        },
      ]}
    >
      <View
        style={[styles.screen, { paddingTop: insets.top }]}
        testID={`add-food-${meal}`}
      >
        <ScreenHeader
          title={t('search.headerTitle', {
            meal: mealName,
            day: formatMealDay(day),
          })}
          titleRole="heading"
          trailing={<CloseButton onPress={close} />}
        />
        <View
          style={{
            paddingHorizontal: theme.spacing.lg,
            paddingTop: FIELD_TOP,
            paddingBottom: FIELD_BOTTOM,
          }}
        >
          <SearchField
            ref={field}
            value={search.query}
            onChangeText={search.setQuery}
            onClear={search.clear}
            autoFocus
            testID="add-food-search"
          />
        </View>
        {/*
          Outside the list on purpose: a banner inserted as row zero would
          shove every result down mid-read. Here it takes its own strip once
          and the list keeps its offset.
        */}
        {search.offline ? <OfflineBanner /> : null}
        <FlashList
          ref={list}
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          extraData={added}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ paddingBottom: trayHeight + LIST_TAIL }}
          ListEmptyComponent={
            <ListState
              status={search.status}
              query={search.emptyQuery}
              onQuickLog={openQuickLog}
            />
          }
          testID="add-food-list"
        />
        <AddTray
          visible={trayVisible && !covered}
          itemCount={session.itemCount}
          kcal={session.kcal}
          items={trayItems}
          expanded={trayExpanded && trayVisible}
          onToggle={toggleTray}
          onEditItem={editItem}
          onRemoveItem={session.remove}
          onDone={done}
          testID="add-food-tray"
        />
        <Snackbar
          message={session.snackbar}
          onUndo={session.undo}
          bottom={trayHeight + SNACKBAR_GAP}
          testID="add-food-snackbar"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  close: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingTop: SECTION_TOP,
    paddingBottom: SECTION_BOTTOM,
  },
  more: {
    flexDirection: 'row',
  },
  state: {
    paddingTop: STATE_TOP,
  },
  stateAction: {
    flexDirection: 'row',
    marginTop: STATE_ACTION_TOP,
  },
  preparing: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  banner: {
    height: OFFLINE_BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerText: {
    flexShrink: 1,
  },
});
