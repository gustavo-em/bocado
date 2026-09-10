import type { DiaryEntryView } from '../../data/diary/DiaryRepository';
import type { NormalizedFood } from '../../domain/food/NormalizedFood';

/**
 * How many foods are kept for the sheet. The screens that open it (search
 * results, the tray, a diary entry) hand over the row they already hold, so
 * the sheet paints its first frame without waiting for SQLite; anything older
 * falls back to `localFoodProvider.getById`.
 */
const CACHE_LIMIT = 24;

const foods = new Map<string, NormalizedFood>();

/** Called right before navigating to the sheet with a food already in hand. */
export function rememberFood(food: NormalizedFood): void {
  foods.delete(food.id);
  foods.set(food.id, food);
  if (foods.size > CACHE_LIMIT) {
    const oldest = foods.keys().next();
    if (!oldest.done) foods.delete(oldest.value);
  }
}

export function cachedFood(id: string): NormalizedFood | undefined {
  return foods.get(id);
}

export interface PortionResult {
  /** `added` wrote a new entry; `saved` rewrote the one being edited. */
  kind: 'added' | 'saved';
  entry: DiaryEntryView;
}

type Listener = (result: PortionResult) => void;

const listeners = new Set<Listener>();

/**
 * The sheet is a route, so it cannot hand its result back through props.
 * "Hoje" reloads from the repository on its own; the search screen listens
 * here to keep its "✓" and its tray in step with what was just written.
 */
export function onPortionResult(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPortionResult(result: PortionResult): void {
  for (const listener of listeners) listener(result);
}

/**
 * The entry the sheet's "Remover" asked to be deleted (spec 09).
 *
 * The sheet never deletes on its own: the screen it came back to owns the
 * removal, so the row disappears with the snackbar and the "Desfazer" that
 * already restore it. It is handed over here rather than through
 * `onPortionResult` because several hosts can be mounted at once ("Hoje"
 * under the meal screen, the search modal over both) and exactly one of them
 * — the one that takes the focus back — must do the deleting.
 */
let requestedRemoval: DiaryEntryView | null = null;

export function requestEntryRemoval(entry: DiaryEntryView): void {
  requestedRemoval = entry;
}

/** Reads the request and clears it, so only the first caller acts on it. */
export function takeRequestedRemoval(): DiaryEntryView | null {
  const entry = requestedRemoval;
  requestedRemoval = null;
  return entry;
}

/**
 * Whether the portion sheet is on screen.
 *
 * The sheet is a transparent modal, so the screen under it stays mounted and
 * its own overlays — the search tray above all — keep competing with the
 * sheet's footer for the accessibility tree and for taps. Navigation focus
 * proved not to be a reliable signal for a transparent modal, so the route
 * states it here on mount and the host reads it.
 */
let sheetOpen = false;
const openListeners = new Set<() => void>();

export function setPortionSheetOpen(next: boolean): void {
  if (sheetOpen === next) return;
  sheetOpen = next;
  for (const listener of openListeners) listener();
}

export function isPortionSheetOpen(): boolean {
  return sheetOpen;
}

export function subscribePortionSheetOpen(listener: () => void): () => void {
  openListeners.add(listener);
  return () => {
    openListeners.delete(listener);
  };
}
