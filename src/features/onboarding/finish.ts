import { prefs } from '../../data/prefs/prefs';
import type { DailyGoal } from '../../domain/diary/Meal';
import {
  DEFAULT_SKIP_GOAL,
  type GoalProfile,
} from '../../domain/goals/mifflin';

/**
 * How many steps the first run has: intent, profile, goal.
 *
 * The step strip reads from this, so the three screens cannot disagree about
 * how long the flow is. "Recalcular" reuses two of these screens without the
 * strip — it is an edit, not a first run, and it has no third step.
 */
export const ONBOARDING_STEPS = 3;

/**
 * "Pular": the round default goal, flagged as an estimate so "Metas" can say
 * where it came from. The first run is over either way — it never comes back.
 */
export function skipOnboarding(): void {
  prefs.setGoal(DEFAULT_SKIP_GOAL);
  prefs.setGoalEstimated(true);
  prefs.setOnboardingDone(true);
}

/**
 * "Começar" / "Salvar": the goal as it stands on screen, plus the answers
 * that produced it, so "Recalcular" reopens what the user actually said.
 */
export function saveCalculatedGoal(
  goal: DailyGoal,
  profile: GoalProfile,
): void {
  prefs.setGoal(goal);
  prefs.setGoalEstimated(false);
  prefs.setProfile(profile);
  prefs.setOnboardingDone(true);
}
