import type { Meal } from '../../domain/diary/Meal';
import type { GoalProfile, Intent } from '../../domain/goals/mifflin';

/**
 * The first run, or "Recalcular" from "Metas". They differ in the way out
 * (reset to "Hoje" vs. back to "Metas"), in the last button and in whether
 * "Pular" is offered at all.
 */
export type OnboardingMode = 'first-run' | 'recalculate';

/**
 * Every route in the app and the params it takes. Screens import this type
 * instead of declaring their own, so a renamed route fails `tsc` everywhere.
 */
export type RootStackParamList = {
  Today: undefined;
  /** "O que você quer?": the first screen of a clean install. */
  OnboardingIntent: undefined;
  /** "Só o necessário para calcular", prefilled with defaults or the saved profile. */
  OnboardingProfile: { mode: OnboardingMode; intent: Intent };
  /** "Sua meta: N kcal", editable in place. */
  OnboardingGoal: { mode: OnboardingMode; profile: GoalProfile };
  AddFood: { day: string; meal: Meal };
  /** One meal of one day, with its own subtotal and macro bars. */
  Meal: { day: string; meal: Meal };
  /**
   * The portion sheet. `entryId` present = editing an entry that already
   * exists, so the button reads "Salvar" and "Mover para…" appears.
   */
  Portion: { day: string; meal: Meal; foodId: string; entryId?: string };
  /** "Registrar só as calorias": kcal now, the name and macros if they matter. */
  QuickLog: { day: string; meal: Meal };
  /** The month sheet opened from the "Hoje" title; `day` is the day it opens on. */
  DayPicker: { day: string };
  /**
   * "Compartilhar": the day as a picture, as plain text, or the whole month
   * as a picture. `day` is the day on screen; the month is the one it is in.
   */
  Share: { day: string };
  Goals: undefined;
  /** Attribution and licences of every food source — a licence obligation. */
  Sources: undefined;
};
