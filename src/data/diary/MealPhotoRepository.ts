import ReactNativeBlobUtil from 'react-native-blob-util';

import type { Meal } from '../../domain/diary/Meal';
import { getDatabase } from '../db/database';

/** A plate's photo, as the screens need it. */
export interface MealPhoto {
  day: string;
  meal: Meal;
  /** Base name inside the photo directory. Never a path, never a URI. */
  fileName: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
}

/**
 * Where the photos live: the app's own document directory, in one folder.
 *
 * Not the cache directory, which is what the image picker hands back and what
 * Android is free to delete whenever the phone runs short of space — a diary
 * that loses last month's photos to a cleanup is not a diary. Not external
 * storage either: these are the owner's meals, and they have no business
 * appearing in the phone's gallery or in whatever backs it up.
 */
const PHOTO_DIRECTORY = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/meal-photos`;

/** The absolute path a screen passes to `<Image source={{ uri }}>`. */
export function mealPhotoUri(photo: MealPhoto): string {
  return `file://${PHOTO_DIRECTORY}/${photo.fileName}`;
}

async function ensureDirectory(): Promise<void> {
  if (await ReactNativeBlobUtil.fs.isDir(PHOTO_DIRECTORY)) return;
  await ReactNativeBlobUtil.fs.mkdir(PHOTO_DIRECTORY);
}

type Listener = () => void;

const listeners = new Set<Listener>();

const PHOTOS_FOR_DAY = `
  SELECT day, meal, file_name, width, height, bytes, created_at
    FROM meal_photos
   WHERE day = ?
`;

const UPSERT = `
  INSERT INTO meal_photos (day, meal, file_name, width, height, bytes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(day, meal) DO UPDATE SET
       file_name  = excluded.file_name,
       width      = excluded.width,
       height     = excluded.height,
       bytes      = excluded.bytes,
       created_at = excluded.created_at
`;

function toPhoto(row: Record<string, unknown>): MealPhoto {
  return {
    day: String(row.day),
    meal: String(row.meal) as Meal,
    fileName: String(row.file_name),
    width: Number(row.width) || 0,
    height: Number(row.height) || 0,
    bytes: Number(row.bytes) || 0,
    createdAt: String(row.created_at),
  };
}

/**
 * Deletes a file and says nothing when it was already gone.
 *
 * The row and the file are two writes and cannot be one transaction, so they
 * can disagree: a file removed by hand, a row left behind by a crash between
 * the two. Both directions are survivable — a missing file renders as no
 * photo, a stray file wastes a few hundred kilobytes — and neither is worth
 * throwing at the screen.
 */
async function unlinkQuietly(fileName: string): Promise<void> {
  try {
    await ReactNativeBlobUtil.fs.unlink(`${PHOTO_DIRECTORY}/${fileName}`);
  } catch {
    // Already gone. See above.
  }
}

/**
 * The only place that reads or writes `meal_photos` and the photo directory.
 *
 * It keeps one photo per meal of a day. Saving over an existing one deletes
 * the old file before the row points away from it, so the directory cannot
 * accumulate copies nobody can reach.
 */
export const mealPhotoRepository = {
  async photosForDay(day: string): Promise<Map<Meal, MealPhoto>> {
    const db = await getDatabase();
    const result = await db.execute(PHOTOS_FOR_DAY, [day]);
    const byMeal = new Map<Meal, MealPhoto>();
    for (const row of result.rows) {
      const photo = toPhoto(row as Record<string, unknown>);
      byMeal.set(photo.meal, photo);
    }
    return byMeal;
  },

  /**
   * Moves a just-captured file into the photo directory and records it.
   *
   * `sourcePath` is the picker's own temporary file; it is copied and then
   * removed, so the cache does not keep a second copy of every plate. The
   * picker has already downscaled and compressed it — resizing is its job,
   * not this module's.
   */
  async savePhoto(
    day: string,
    meal: Meal,
    source: { path: string; width: number; height: number },
  ): Promise<MealPhoto> {
    await ensureDirectory();
    const previous = (await this.photosForDay(day)).get(meal);

    const fileName = `${day}-${meal}-${Date.now()}.jpg`;
    const destination = `${PHOTO_DIRECTORY}/${fileName}`;
    await ReactNativeBlobUtil.fs.cp(source.path, destination);
    await unlinkQuietly(source.path.replace(`${PHOTO_DIRECTORY}/`, ''));

    const stat = await ReactNativeBlobUtil.fs.stat(destination);
    const photo: MealPhoto = {
      day,
      meal,
      fileName,
      width: source.width,
      height: source.height,
      bytes: Number(stat.size) || 0,
      createdAt: new Date().toISOString(),
    };

    const db = await getDatabase();
    await db.execute(UPSERT, [
      photo.day,
      photo.meal,
      photo.fileName,
      photo.width,
      photo.height,
      photo.bytes,
      photo.createdAt,
    ]);

    // Only after the row points at the new file, so a failure above leaves
    // the old photo in place instead of none at all.
    if (previous) await unlinkQuietly(previous.fileName);

    this.notifyChanged();
    return photo;
  },

  /**
   * Takes the photo off the day and hands back the row that left.
   *
   * The file stays on disk on purpose. The app's rule is that the undo is the
   * confirmation — there is no "Tem certeza?" anywhere in the diary — and an
   * undo cannot put back a JPEG that has already been deleted. The caller
   * keeps the row for as long as "Desfazer" is on screen, then calls
   * `discardFile`. A caller that forgets leaves one orphan file behind, which
   * is the cheap side of this trade.
   */
  async removePhoto(day: string, meal: Meal): Promise<MealPhoto | undefined> {
    const existing = (await this.photosForDay(day)).get(meal);
    const db = await getDatabase();
    await db.execute('DELETE FROM meal_photos WHERE day = ? AND meal = ?', [
      day,
      meal,
    ]);
    this.notifyChanged();
    return existing;
  },

  /** Puts back exactly the row `removePhoto` returned, file and all. */
  async restorePhoto(photo: MealPhoto): Promise<void> {
    const db = await getDatabase();
    await db.execute(UPSERT, [
      photo.day,
      photo.meal,
      photo.fileName,
      photo.width,
      photo.height,
      photo.bytes,
      photo.createdAt,
    ]);
    this.notifyChanged();
  },

  /** The second half of a removal, once the undo window has closed. */
  async discardFile(fileName: string): Promise<void> {
    await unlinkQuietly(fileName);
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notifyChanged(): void {
    for (const listener of listeners) listener();
  },
};
