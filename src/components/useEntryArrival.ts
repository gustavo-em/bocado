import { useRef } from 'react';

/**
 * Which rows of a diary list have just arrived.
 *
 * A row is "new" only against the list as it was the last time the screen was
 * looked at: the id was not there, and now it is. That is what tells the
 * entrance apart from the three things that must never animate — the first
 * paint, a day change, and a re-render of the same list.
 */

const NO_ARRIVALS: ReadonlyMap<string, number> = new Map();

/**
 * The ids of `next` that were not in `previous`, in the order the list prints
 * them. `previous` being null is the first time this list is seen at all, and
 * a first sight has no arrivals — otherwise opening the app would animate the
 * whole day.
 */
export function newlyArrivedIds(
  previous: readonly string[] | null,
  next: readonly string[],
): string[] {
  if (previous === null) return [];
  const seen = new Set(previous);
  return next.filter(id => !seen.has(id));
}

interface ArrivalState {
  /** What the list looked like when it was last observed. */
  seen: string[] | null;
  /** The day (or meal) the `seen` list belongs to. */
  key: string;
  /** Inputs of the last computation, so a repeated render is a no-op. */
  signature: string;
  arrivals: ReadonlyMap<string, number>;
}

/**
 * Watches a list of entry ids and returns the ones that have just arrived,
 * mapped to their position among the arrivals (which is the stagger index when
 * a whole meal is copied at once).
 *
 * `enabled` is the screen's focus: while a sheet is on top, the list keeps
 * changing underneath but nothing is observed, so the entrance plays when the
 * user comes back to it instead of behind the sheet. `resetKey` — the day, or
 * the day and meal — starts the observation over without animating: a day
 * arriving is a day change, not an arrival.
 */
export function useEntryArrival(
  ids: readonly string[],
  resetKey: string,
  enabled = true,
): ReadonlyMap<string, number> {
  const state = useRef<ArrivalState>({
    seen: null,
    key: resetKey,
    signature: '',
    arrivals: NO_ARRIVALS,
  });

  const signature = [resetKey, enabled ? '1' : '0', ...ids].join(' ');
  const current = state.current;
  if (current.signature === signature) return current.arrivals;

  current.signature = signature;

  if (current.key !== resetKey) {
    current.key = resetKey;
    current.seen = [...ids];
    current.arrivals = NO_ARRIVALS;
    return current.arrivals;
  }

  // Not being looked at: the list is left exactly as it was, so whatever was
  // written while a sheet was up is still an arrival when the screen comes
  // back.
  if (!enabled) {
    current.arrivals = NO_ARRIVALS;
    return current.arrivals;
  }

  const arrived = newlyArrivedIds(current.seen, ids);
  current.seen = [...ids];
  current.arrivals =
    arrived.length === 0
      ? NO_ARRIVALS
      : new Map(arrived.map((id, index) => [id, index]));
  return current.arrivals;
}
