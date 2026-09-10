import React from 'react';
import ReactTestRenderer, {
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import App from '../src/app/App';
import { prefs } from '../src/data/prefs/prefs';
import {
  dayKeyFromDate,
  startOfWeek,
  weekDays,
} from '../src/domain/diary/days';

/**
 * What the device test opens on: "Hoje", with nothing touched yet. The day
 * strip has to be filled on that first frame (spec 09) and every meal has to
 * offer "Adicionar", which is what the driver taps.
 *
 * A clean install opens on the onboarding intent screen instead, by an earlier
 * decision, so the flag is set here exactly as skipping it would.
 */
describe('the first frame of "Hoje"', () => {
  let tree: Renderer | undefined;

  beforeAll(() => {
    prefs.setOnboardingDone(true);
  });

  afterEach(async () => {
    await ReactTestRenderer.act(async () => {
      tree?.unmount();
    });
    jest.useRealTimers();
  });

  it('shows the current week and one "Adicionar" per meal', async () => {
    jest.useFakeTimers();
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(<App />);
    });
    await ReactTestRenderer.act(async () => {
      jest.runOnlyPendingTimers();
    });
    const root = tree!.root;

    for (const day of weekDays(startOfWeek(dayKeyFromDate(new Date())))) {
      expect(
        root.findAllByProps({ testID: `day-chip-${day}` }).length,
      ).toBeGreaterThan(0);
    }

    // One way into each meal on the first frame. The affordance is the "+"
    // ring since task 18, so this counts the control, not the old label —
    // the invariant is that all four meals are reachable without scrolling.
    for (const meal of ['breakfast', 'lunch', 'afternoon_snack', 'dinner']) {
      expect(
        root.findAllByProps({ testID: `meal-${meal}-add` }).length,
      ).toBeGreaterThan(0);
    }
  });
});
