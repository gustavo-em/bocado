import { GOAL_KCAL_INPUT_LIMITS, PROFILE_LIMITS } from './mifflin';

export type ProfileField = keyof typeof PROFILE_LIMITS;

export type ProfileInput =
  | { kind: 'valid'; value: number }
  | { kind: 'clamped'; value: number }
  | { kind: 'invalid' };

/**
 * What was typed on "Só o necessário para calcular" → what the calculator
 * gets. Same contract as `parseGoalInput`: empty or non-numeric is invalid
 * (the field shakes and reverts), out of range is clamped to the limit.
 */
export function parseProfileInput(
  field: ProfileField,
  text: string,
): ProfileInput {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return { kind: 'invalid' };
  const value = Number(digits);
  if (!Number.isFinite(value)) return { kind: 'invalid' };
  const { min, max } = PROFILE_LIMITS[field];
  if (value < min) return { kind: 'clamped', value: min };
  if (value > max) return { kind: 'clamped', value: max };
  return { kind: 'valid', value };
}

/**
 * A goal typed by hand on "Sua meta". Kept inside the range a daily goal can
 * sensibly take: a slip of the thumb is clamped, not saved.
 */
export function parseGoalKcalInput(text: string): ProfileInput {
  const digits = text.replace(/\D/g, '');
  if (digits === '') return { kind: 'invalid' };
  const value = Number(digits);
  if (!Number.isFinite(value)) return { kind: 'invalid' };
  const { min, max } = GOAL_KCAL_INPUT_LIMITS;
  if (value < min) return { kind: 'clamped', value: min };
  if (value > max) return { kind: 'clamped', value: max };
  return { kind: 'valid', value };
}
