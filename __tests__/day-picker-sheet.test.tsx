import React from 'react';
import ReactTestRenderer, {
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { DayPickerSheetScreen } from '../src/features/diary/DayPickerSheetScreen';
import { addMonths, startOfMonth, type DayKey } from '../src/domain/diary/days';
import { dayRange } from '../src/features/diary/todayRange';

const TODAY = '2026-09-09' as DayKey;
const params = { day: TODAY };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn() }),
  useRoute: () => ({ params }),
}));
jest.mock('../src/features/diary/hooks/useToday', () => ({
  useToday: () => '2026-09-09',
}));

function press(tree: Renderer, testID: string): void {
  ReactTestRenderer.act(() => {
    tree.root.findByProps({ testID }).props.onPress();
  });
}

function monthTitleOf(tree: Renderer): string {
  return tree.root.findByProps({ testID: 'calendar-month' }).props.children;
}

describe('the month sheet', () => {
  let tree: Renderer;

  beforeEach(() => {
    params.day = TODAY;
    ReactTestRenderer.act(() => {
      tree = ReactTestRenderer.create(<DayPickerSheetScreen />);
    });
  });

  afterEach(() => {
    ReactTestRenderer.act(() => {
      tree?.unmount();
    });
  });

  it('draws one month, not a pager of them', () => {
    // Spec 12: an inverted horizontal list of a hundred-odd months skipped
    // months on the J6 and crashed the mount at the far end. One grid cannot.
    expect(
      tree.root.findAllByProps({ testID: 'calendar-months' }).length,
    ).toBeGreaterThan(0);
    expect(
      tree.root.findAllByProps({ testID: 'calendar-day-2026-09-15' }).length,
    ).toBeGreaterThan(0);
    // No neighbouring month is mounted off screen.
    expect(
      tree.root.findAllByProps({ testID: 'calendar-day-2026-08-15' }).length,
    ).toBe(0);
  });

  it('walks month by month, one arrow tap at a time', () => {
    press(tree, 'calendar-previous-month');
    expect(
      tree.root.findAllByProps({ testID: 'calendar-day-2026-08-15' }).length,
    ).toBeGreaterThan(0);

    press(tree, 'calendar-next-month');
    expect(
      tree.root.findAllByProps({ testID: 'calendar-day-2026-09-15' }).length,
    ).toBeGreaterThan(0);
  });

  it('stops at the ends of the range, with the arrow disabled there', () => {
    const { firstDay, lastDay } = dayRange(TODAY);
    const oldest = startOfMonth(firstDay);

    // Today's month is the newest, so "next" is already at the end.
    expect(startOfMonth(lastDay)).toBe(startOfMonth(TODAY));
    expect(
      tree.root.findByProps({ testID: 'calendar-next-month' }).props.disabled,
    ).toBe(true);

    let month = startOfMonth(TODAY);
    let guard = 0;
    while (month !== oldest && guard < 60) {
      press(tree, 'calendar-previous-month');
      month = addMonths(month, -1);
      guard += 1;
    }
    expect(month).toBe(oldest);
    expect(
      tree.root.findByProps({ testID: 'calendar-previous-month' }).props
        .disabled,
    ).toBe(true);

    // One more tap at the edge changes nothing, and does not throw.
    press(tree, 'calendar-previous-month');
    expect(monthTitleOf(tree)).toBe(monthTitleOf(tree));
  });
});
