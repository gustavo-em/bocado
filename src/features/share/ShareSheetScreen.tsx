import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type Svg from 'react-native-svg';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { ActionRow } from '../../components/ActionRow';
import { Sheet } from '../../components/Sheet';
import { Snackbar, type SnackbarMessage } from '../../components/Snackbar';
import { useSnackbarCountdown } from '../../components/useSnackbarCountdown';
import { diaryRepository } from '../../data/diary/DiaryRepository';
import { entryName } from '../../domain/diary/entryName';
import {
  addDays,
  addMonths,
  dateFromDayKey,
  startOfMonth,
} from '../../domain/diary/days';
import { buildDayText } from '../../domain/share/dayText';
import {
  buildMonthCard,
  type MonthCardModel,
} from '../../domain/share/monthCard';
import { buildShareDay, type ShareDay } from '../../domain/share/shareDay';
import { currentLanguage, t } from '../../i18n';
import { formatDayLong } from '../../i18n/format';
import {
  isShareAvailable,
  shareError,
  shareErrorCode,
  shareImage,
  shareText,
} from '../../native/share';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';
import { useGoal } from '../diary/hooks/useGoal';
import { setPortionSheetOpen } from '../portion/portionSheet';
import { ShareDayCard } from './ShareDayCard';
import { ShareMonthCard } from './ShareMonthCard';
import {
  captureCard,
  dayFileName,
  monthFileName,
  waitForCard,
} from './useShare';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Share'>;
type Route = RouteProp<RootStackParamList, 'Share'>;

const SHARE_LOG_TAG = '[bocado:share]';
/** Anatomy of the sheet (§2.12), top to bottom, in dp. */
const HANDLE_TO_TITLE = 16;
const TITLE_TO_ROWS = 16;
/** Design system §2.11: the snackbar sits 16 dp above the inset. */
const SNACKBAR_GAP = 16;

type Output = 'dayImage' | 'dayText' | 'monthImage';

/** Everything the three outputs need, read once when the sheet opens. */
interface ShareData {
  day: ShareDay;
  month: MonthCardModel;
}

/**
 * The sentence the failure deserves. Only a piece that could not be drawn or
 * written says so as an image — the plain text has no image in it, and a
 * bridge that is not answering is not the drawing's fault either.
 */
function errorMessage(failure: unknown): string {
  switch (shareErrorCode(failure)) {
    case 'share_no_app':
      return t('share.errorNoApp');
    case 'share_capture_failed':
    case 'share_write_failed':
      return t('share.errorImage');
    default:
      return t('share.errorShare');
  }
}

/**
 * The one place anything leaves the app: three outputs of the day on screen,
 * each handed to the Android chooser. There is no account and no upload — the
 * picture is drawn here (off screen, at 1080 × 1350) and written to the app's
 * own cache, and the user picks who receives it.
 */
export function ShareSheetScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Navigation>();
  const { params } = useRoute<Route>();
  const goal = useGoal();
  const [day, setDay] = useState<ShareDay | null>(null);
  const [month, setMonth] = useState<MonthCardModel | null>(null);
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<Output | null>(null);
  /** The output being produced right now, readable within the same frame. */
  const running = useRef<Output | null>(null);
  /**
   * A failure is a passing note, not a state of the sheet: the same snackbar
   * the rest of the app speaks with, over the sheet, with nothing to undo.
   */
  const [failure, setFailure] = useState<SnackbarMessage | null>(null);
  const countdown = useSnackbarCountdown(
    useCallback(() => setFailure(null), []),
  );
  const say = useCallback(
    (message: string) => {
      setFailure({ food: message, meal: '', kind: 'text' });
      countdown.start();
    },
    [countdown],
  );
  const dayCard = useRef<Svg>(null);
  const monthCard = useRef<Svg>(null);
  /**
   * The day and the month being read. The three rows are live buttons from
   * the first frame — a row that is only sometimes a button is a row a screen
   * reader, and the tester driving by label, cannot count on — so a press
   * that lands before SQLite has answered waits here instead of being
   * refused.
   */
  const loaded = useRef<Promise<ShareData> | null>(null);

  // The diary underneath steps out of the accessibility tree while the sheet
  // holds the screen, exactly as the other sheets do.
  useEffect(() => {
    setPortionSheetOpen(true);
    return () => setPortionSheetOpen(false);
  }, []);

  useEffect(() => {
    let alive = true;
    const monthStart = startOfMonth(params.day);
    const monthEnd = addDays(addMonths(monthStart, 1), -1);
    const reading = Promise.all([
      diaryRepository.entriesForDay(params.day),
      diaryRepository.totalsForDay(params.day),
      diaryRepository.totalsForRange(monthStart, monthEnd),
    ]).then(([entries, totals, range]) => ({
      day: buildShareDay(
        params.day,
        entries.map(entry => ({
          meal: entry.meal,
          name: entryName(entry, currentLanguage()),
          grams: entry.grams,
          servingLabel: entry.servingLabel,
          servingCount: entry.servingCount,
          kcal: entry.kcal,
        })),
        totals,
        goal.kcal,
      ),
      month: buildMonthCard(monthStart, range),
    }));
    loaded.current = reading;
    reading.then(
      data => {
        if (!alive) return;
        setDay(data.day);
        setMonth(data.month);
      },
      error => {
        if (!alive) return;
        console.warn(`${SHARE_LOG_TAG} could not read the day: ${error}`);
        say(t('share.errorShare'));
      },
    );
    return () => {
      alive = false;
    };
  }, [params.day, goal.kcal, say]);

  const close = useCallback(() => navigation.goBack(), [navigation]);

  const run = useCallback(
    (output: Output, task: () => Promise<void>) => {
      // One output at a time. The row that is working stays a live button —
      // it says "ocupado", not "desativado" — so the second tap has to be
      // refused here, or it would draw the piece twice and open a second
      // chooser, possibly after the first one already closed the sheet. The
      // guard is a ref and not the state because two taps in the same frame
      // would both still read `busy` as null.
      if (running.current !== null) return;
      // Asked on every press, never cached: under the TurboModule interop the
      // registry can answer later than this sheet was mounted.
      if (!isShareAvailable()) {
        say(t('share.errorShare'));
        return;
      }
      running.current = output;
      setBusy(output);
      countdown.cancel();
      setFailure(null);
      task().then(
        () => navigation.goBack(),
        error => {
          // The sheet stays open with its three rows live again; the note
          // passes on its own, like every other failure in the app.
          running.current = null;
          setBusy(null);
          say(errorMessage(error));
          console.warn(`${SHARE_LOG_TAG} ${output} failed: ${error}`);
        },
      );
    },
    [navigation, say, countdown],
  );

  /** The day and the month, waiting for the read if it is still running. */
  const data = useCallback(async (): Promise<ShareData> => {
    const reading = loaded.current;
    if (!reading) {
      throw shareError('share_unavailable', 'the day was never read');
    }
    return reading;
  }, []);

  const onDayImage = useCallback(() => {
    run('dayImage', async () => {
      await data();
      const svg = await waitForCard(() => dayCard.current, 'day');
      const base64 = await captureCard(svg, 'day');
      await shareImage(base64, dayFileName(params.day), t('share.chooserDay'));
    });
  }, [run, data, params.day]);

  const onDayText = useCallback(() => {
    run('dayText', async () => {
      const { day: shareDay } = await data();
      await shareText(buildDayText(shareDay), t('share.chooserDay'));
    });
  }, [run, data]);

  const onMonthImage = useCallback(() => {
    run('monthImage', async () => {
      const { month: card } = await data();
      const svg = await waitForCard(() => monthCard.current, 'month');
      const base64 = await captureCard(svg, 'month');
      await shareImage(
        base64,
        monthFileName(card.monthStart),
        t('share.chooserMonth'),
      );
    });
  }, [run, data]);

  // The pieces are mounted as soon as they can be drawn; the rows never wait
  // for them, so all three stay reachable buttons while the day is read.
  const drawable = day !== null && month !== null;
  const working = busy !== null;

  return (
    <>
      {/*
        The two pieces, drawn but not shown. The box is two points in the top
        corner, one for each piece: Android clips a view that sits outside its
        parent and never draws it, and a drawing that is never drawn cannot be
        turned into a PNG — `toDataURL` would wait for a first render that
        never comes. It is drawn before the sheet, so nothing of it is ever
        over the sheet's own controls, and it is out of the accessibility tree
        so the three rows are the only buttons here. The output size does not
        come from this box: `toDataURL` is given the piece's own 1080 × 1350
        and the view box is mapped onto it.
      */}
      {drawable ? (
        <View
          style={styles.offscreen}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <ShareDayCard ref={dayCard} day={day} />
          <ShareMonthCard ref={monthCard} month={month} />
        </View>
      ) : null}
      <Sheet
        onClose={close}
        dismissAccessibilityLabel={t('share.dismiss')}
        testID="share-sheet"
      >
        <View style={{ paddingTop: HANDLE_TO_TITLE }}>
          <Text
            style={[
              theme.type.heading,
              textDefaults,
              { color: theme.colors.ink },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
            testID="share-title"
          >
            {t('share.title')}
          </Text>
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted, marginTop: theme.spacing.xs },
            ]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {formatDayLong(dateFromDayKey(params.day))}
          </Text>
          <View style={{ marginTop: TITLE_TO_ROWS }} testID="share-options">
            <ActionRow
              label={t('share.dayImage')}
              icon="image"
              onPress={onDayImage}
              disabled={working && busy !== 'dayImage'}
              busy={busy === 'dayImage'}
              testID="share-day-image"
            />
            <ActionRow
              label={t('share.dayText')}
              icon="file-text"
              onPress={onDayText}
              disabled={working && busy !== 'dayText'}
              busy={busy === 'dayText'}
              testID="share-day-text"
            />
            <ActionRow
              label={t('share.monthImage')}
              icon="calendar-days"
              onPress={onMonthImage}
              disabled={working && busy !== 'monthImage'}
              busy={busy === 'monthImage'}
              testID="share-month-image"
            />
          </View>
        </View>
      </Sheet>
      <Snackbar
        message={failure}
        bottom={insets.bottom + SNACKBAR_GAP}
        testID="share-snackbar"
      />
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 1,
    // One point per piece, stacked: both `SvgView`s stay inside the box and
    // are drawn, which is what makes them capturable.
    height: 2,
    overflow: 'hidden',
  },
});
