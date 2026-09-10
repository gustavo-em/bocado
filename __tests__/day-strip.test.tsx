import React from 'react';
import ReactTestRenderer, {
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { DayStrip } from '../src/components/DayStrip';
import {
  startOfWeek,
  weekDays,
  weekStarts,
  type DayKey,
} from '../src/domain/diary/days';

const TODAY = '2026-09-09' as DayKey;
/** Twelve weeks back: the jump the month sheet makes, and spec 12's defect. */
const FAR_DAY = '2026-06-15' as DayKey;

/** What "Hoje" hands over: newest week first, the anchor week at index 0. */
function stripWeeks(selectedDay: DayKey = TODAY): DayKey[] {
  const newestFirst = [...weekStarts(TODAY, 104)].reverse();
  return newestFirst.slice(newestFirst.indexOf(startOfWeek(selectedDay)));
}

function render(selectedDay: DayKey): Renderer {
  let tree!: Renderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <DayStrip
        weeks={stripWeeks(selectedDay)}
        anchorWeek={startOfWeek(selectedDay)}
        selectedDay={selectedDay}
        today={TODAY}
        onSelectDay={() => undefined}
      />,
    );
  });
  return tree;
}

describe('the day strip', () => {
  let tree: Renderer;

  // FlashList schedules its own work off timers, so they are drained inside
  // the test rather than left to fire after the environment tears down.
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    ReactTestRenderer.act(() => {
      jest.runOnlyPendingTimers();
      tree?.unmount();
    });
    jest.useRealTimers();
  });

  it('paints the current week on the first frame, with no scrolling', () => {
    tree = render(TODAY);

    // The seven chips of the week being lived, before any interaction: the
    // regression of spec 09 was an empty band of the strip's own height.
    for (const day of weekDays(stripWeeks()[0])) {
      expect(
        tree.root.findAllByProps({ testID: `day-chip-${day}` }).length,
      ).toBeGreaterThan(0);
    }
  });

  it('never asks the list to open at an index it has not measured', () => {
    tree = render(TODAY);
    const list = tree.root.findByProps({ testID: 'day-strip' });

    // Spec 12: `scrollToIndex` on this list parks it at the end of the data,
    // so the anchor week has to be the page the list already opens on.
    expect(list.props.initialScrollIndex).toBeUndefined();
    // Inverted, so index 0 sits under the finger and dragging right walks
    // back into the past.
    expect(list.props.inverted).toBe(true);
  });

  it('heads the list with a week twelve pages back, and paints it', () => {
    tree = render(FAR_DAY);
    const anchor = startOfWeek(FAR_DAY);

    // The far week is index 0 of the data, not an index to be sought.
    expect(stripWeeks(FAR_DAY)[0]).toBe(anchor);
    const list = tree.root.findByProps({ testID: 'day-strip' });
    expect(list.props.initialScrollIndex).toBeUndefined();

    for (const day of weekDays(anchor)) {
      expect(
        tree.root.findAllByProps({ testID: `day-chip-${day}` }).length,
      ).toBeGreaterThan(0);
    }
    // Everything older than the anchor is still reachable by dragging right.
    expect(list.props.data.length).toBeGreaterThan(1);
  });

  it('re-anchors when the picked day moves to another week', () => {
    tree = render(TODAY);
    ReactTestRenderer.act(() => {
      tree.update(
        <DayStrip
          weeks={stripWeeks(FAR_DAY)}
          anchorWeek={startOfWeek(FAR_DAY)}
          selectedDay={FAR_DAY}
          today={TODAY}
          onSelectDay={() => undefined}
        />,
      );
    });

    for (const day of weekDays(startOfWeek(FAR_DAY))) {
      expect(
        tree.root.findAllByProps({ testID: `day-chip-${day}` }).length,
      ).toBeGreaterThan(0);
    }
  });
});
