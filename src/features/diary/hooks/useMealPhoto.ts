import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { launchCamera } from 'react-native-image-picker';

import type { SnackbarMessage } from '../../../components/Snackbar';
import { useSnackbarCountdown } from '../../../components/useSnackbarCountdown';
import {
  mealPhotoRepository,
  type MealPhoto,
} from '../../../data/diary/MealPhotoRepository';
import type { Meal } from '../../../domain/diary/Meal';
import { t } from '../../../i18n';

const PHOTO_LOG_TAG = '[bocado:photo]';

/**
 * What the camera is asked for.
 *
 * 1280 px on the long side at quality 0.7 lands around 150-250 kB for a
 * plate, which is the size that decides whether this feature is usable: four
 * meals a day for a year is roughly 300 MB at this setting and several
 * gigabytes at the phone's native resolution. The photo exists to remind the
 * owner what the plate looked like, and later to be read by a model — neither
 * needs more pixels than this.
 *
 * `saveToPhotos` is false: these are the owner's meals and they have no
 * business in the phone's gallery, or in whatever syncs it to a cloud.
 */
const CAMERA_OPTIONS = {
  mediaType: 'photo',
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 0.7,
  saveToPhotos: false,
  includeBase64: false,
  cameraType: 'back',
} as const;

export interface MealPhotos {
  /** One photo per meal, for the day on screen. */
  byMeal: Map<Meal, MealPhoto>;
  snackbar: SnackbarMessage | null;
  /** Opens the camera and attaches what comes back to the meal. */
  capture: (meal: Meal) => void;
  /** Drops the photo, with "Desfazer" for the next few seconds. */
  remove: (meal: Meal) => void;
  undo: () => void;
  /** Takes the pill down without undoing: another action owns it now. */
  dismiss: () => void;
}

/** `file:///a/b.jpg` and `/a/b.jpg` both reach the filesystem as the latter. */
function toPath(uri: string): string {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

/** Deleting a file nobody can reach any more: worth a log, never a message. */
function discard(fileName: string): void {
  mealPhotoRepository.discardFile(fileName).catch(error => {
    console.warn(`${PHOTO_LOG_TAG} discard failed`, error);
  });
}

function requestCamera(): Promise<boolean> {
  if (Platform.OS !== 'android') return Promise.resolve(true);
  return PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA).then(
    granted => granted === PermissionsAndroid.RESULTS.GRANTED,
  );
}

/**
 * The photo of a plate, for the day on screen.
 *
 * Capturing replaces whatever the meal had: one plate, one picture. Removal
 * follows the diary's own rule — the row goes at once, "Desfazer" puts it
 * back, and the JPEG is only deleted when that window closes.
 */
export function useMealPhoto(day: string): MealPhotos {
  const [byMeal, setByMeal] = useState<Map<Meal, MealPhoto>>(new Map());
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);
  /** The row a "Desfazer" would put back, and whose file is still on disk. */
  const pending = useRef<MealPhoto | null>(null);
  const countdown = useSnackbarCountdown(() => {
    const expired = pending.current;
    pending.current = null;
    setSnackbar(null);
    if (expired) discard(expired.fileName);
  });

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      mealPhotoRepository
        .photosForDay(day)
        .then(photos => {
          if (!cancelled) setByMeal(photos);
        })
        .catch(error => {
          console.warn(`${PHOTO_LOG_TAG} load failed`, error);
        });
    };
    load();
    const unsubscribe = mealPhotoRepository.subscribe(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [day]);

  const say = useCallback(
    (sentence: string) => {
      setSnackbar({ food: sentence, meal: '', kind: 'text' });
      countdown.start();
    },
    [countdown],
  );

  const capture = useCallback(
    (meal: Meal) => {
      requestCamera()
        .then(granted => {
          if (!granted) {
            say(t('photo.denied'));
            return undefined;
          }
          return launchCamera(CAMERA_OPTIONS).then(result => {
            if (result.didCancel) return undefined;
            if (result.errorCode === 'camera_unavailable') {
              say(t('photo.noCamera'));
              return undefined;
            }
            const asset = result.assets?.[0];
            if (result.errorCode || !asset?.uri) {
              console.warn(
                `${PHOTO_LOG_TAG} camera failed`,
                result.errorCode,
                result.errorMessage,
              );
              say(t('photo.failed'));
              return undefined;
            }
            return mealPhotoRepository.savePhoto(day, meal, {
              path: toPath(asset.uri),
              width: asset.width ?? 0,
              height: asset.height ?? 0,
            });
          });
        })
        .catch(error => {
          console.warn(`${PHOTO_LOG_TAG} capture failed`, error);
          say(t('photo.failed'));
        });
    },
    [day, say],
  );

  const remove = useCallback(
    (meal: Meal) => {
      // A second removal before the first undo expired: that file is now
      // unreachable either way, so let it go before taking its place.
      const superseded = pending.current;
      if (superseded) discard(superseded.fileName);

      mealPhotoRepository
        .removePhoto(day, meal)
        .then(removed => {
          if (!removed) return;
          pending.current = removed;
          setSnackbar({ food: t('photo.removed'), meal: '', kind: 'text' });
          countdown.start();
        })
        .catch(error => {
          console.warn(`${PHOTO_LOG_TAG} remove failed`, error);
        });
    },
    [countdown, day],
  );

  const undo = useCallback(() => {
    const photo = pending.current;
    pending.current = null;
    setSnackbar(null);
    countdown.cancel();
    if (!photo) return;
    mealPhotoRepository.restorePhoto(photo).catch(error => {
      console.warn(`${PHOTO_LOG_TAG} restore failed`, error);
    });
  }, [countdown]);

  const dismiss = useCallback(() => {
    const dropped = pending.current;
    pending.current = null;
    setSnackbar(null);
    countdown.cancel();
    if (dropped) discard(dropped.fileName);
  }, [countdown]);

  return { byMeal, snackbar, capture, remove, undo, dismiss };
}
