import type { DayKey } from '../../domain/diary/days';

type Listener = (day: DayKey) => void;

const listeners = new Set<Listener>();

/**
 * The month sheet is a route, so it cannot hand the chosen day back through
 * props. "Hoje" listens here and selects the day itself, which keeps the strip
 * paging and the fade exactly as they are for a tap on a chip.
 */
export function onDayPicked(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitDayPicked(day: DayKey): void {
  for (const listener of listeners) listener(day);
}
