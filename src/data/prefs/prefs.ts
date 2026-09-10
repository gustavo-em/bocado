import { createMMKV } from 'react-native-mmkv';

import { DEFAULT_GOAL, type DailyGoal } from '../../domain/diary/Meal';
import {
  ACTIVITY_LEVELS,
  DEFAULT_PROFILE,
  INTENTS,
  SEXES,
  type ActivityLevel,
  type GoalProfile,
  type Intent,
  type Sex,
} from '../../domain/goals/mifflin';
import type { LanguageSetting } from '../../i18n';
import {
  APPEARANCE_SETTINGS,
  type AppearanceSetting,
} from '../../theme/colors';

/**
 * Small, synchronous preferences. Anything with history or relations belongs
 * in SQLite, not here.
 */
const storage = createMMKV({ id: 'bocado.prefs' });

const KEYS = {
  goalKcal: 'goal.kcal',
  goalProtein: 'goal.protein_g',
  goalCarbs: 'goal.carbs_g',
  goalFat: 'goal.fat_g',
  goalEstimated: 'goal.estimated',
  language: 'language',
  appearance: 'appearance',
  seedVersion: 'seed.version',
  onboardingDone: 'onboarding.done',
  showRemaining: 'diary.showRemaining',
  minerals: 'diary.minerals',
  haptics: 'haptics.enabled',
  profileSex: 'profile.sex',
  profileAge: 'profile.age',
  profileHeight: 'profile.height',
  profileWeight: 'profile.weight',
  profileActivity: 'profile.activity',
  profileIntent: 'profile.intent',
} as const;

/** Reads a stored string only when it is still one of the values the app knows. */
function readOneOf<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  const stored = storage.getString(key);
  return allowed.includes(stored as T) ? (stored as T) : fallback;
}

export const prefs = {
  getGoal(): DailyGoal {
    return {
      kcal: storage.getNumber(KEYS.goalKcal) ?? DEFAULT_GOAL.kcal,
      protein_g: storage.getNumber(KEYS.goalProtein) ?? DEFAULT_GOAL.protein_g,
      carbs_g: storage.getNumber(KEYS.goalCarbs) ?? DEFAULT_GOAL.carbs_g,
      fat_g: storage.getNumber(KEYS.goalFat) ?? DEFAULT_GOAL.fat_g,
    };
  },
  setGoal(goal: DailyGoal): void {
    storage.set(KEYS.goalKcal, goal.kcal);
    storage.set(KEYS.goalProtein, goal.protein_g);
    storage.set(KEYS.goalCarbs, goal.carbs_g);
    storage.set(KEYS.goalFat, goal.fat_g);
  },
  isGoalEstimated(): boolean {
    return storage.getBoolean(KEYS.goalEstimated) ?? true;
  },
  setGoalEstimated(value: boolean): void {
    storage.set(KEYS.goalEstimated, value);
  },
  getLanguage(): LanguageSetting {
    return (storage.getString(KEYS.language) as LanguageSetting | undefined) ?? 'system';
  },
  setLanguage(value: LanguageSetting): void {
    storage.set(KEYS.language, value);
  },
  /**
   * The appearance the user picked. Read synchronously while the first theme
   * is built, so the first frame is already on the right palette.
   */
  getAppearance(): AppearanceSetting {
    return readOneOf<AppearanceSetting>(
      KEYS.appearance,
      APPEARANCE_SETTINGS,
      'system',
    );
  },
  setAppearance(value: AppearanceSetting): void {
    storage.set(KEYS.appearance, value);
  },
  getSeedVersion(): number {
    return storage.getNumber(KEYS.seedVersion) ?? 0;
  },
  setSeedVersion(value: number): void {
    storage.set(KEYS.seedVersion, value);
  },
  isOnboardingDone(): boolean {
    return storage.getBoolean(KEYS.onboardingDone) ?? false;
  },
  setOnboardingDone(value: boolean): void {
    storage.set(KEYS.onboardingDone, value);
  },
  showRemaining(): boolean {
    return storage.getBoolean(KEYS.showRemaining) ?? true;
  },
  setShowRemaining(value: boolean): void {
    storage.set(KEYS.showRemaining, value);
  },
  /**
   * The minerals block at the end of "Hoje". Off on a fresh install: the fast
   * path to logging a food is the screen's job, and this block is an extra.
   */
  mineralsInDiary(): boolean {
    return storage.getBoolean(KEYS.minerals) ?? false;
  },
  setMineralsInDiary(value: boolean): void {
    storage.set(KEYS.minerals, value);
  },
  hapticsEnabled(): boolean {
    return storage.getBoolean(KEYS.haptics) ?? true;
  },
  setHapticsEnabled(value: boolean): void {
    storage.set(KEYS.haptics, value);
  },
  /** True once the calculator has run: "Recalcular" then reopens real answers. */
  hasProfile(): boolean {
    return storage.getNumber(KEYS.profileAge) !== undefined;
  },
  /**
   * What the user answered on the first run. Missing or corrupted fields fall
   * back to `DEFAULT_PROFILE`, so "Recalcular" always opens on valid values.
   */
  getProfile(): GoalProfile {
    return {
      sex: readOneOf<Sex>(KEYS.profileSex, SEXES, DEFAULT_PROFILE.sex),
      ageYears: storage.getNumber(KEYS.profileAge) ?? DEFAULT_PROFILE.ageYears,
      heightCm:
        storage.getNumber(KEYS.profileHeight) ?? DEFAULT_PROFILE.heightCm,
      weightKg:
        storage.getNumber(KEYS.profileWeight) ?? DEFAULT_PROFILE.weightKg,
      activity: readOneOf<ActivityLevel>(
        KEYS.profileActivity,
        ACTIVITY_LEVELS,
        DEFAULT_PROFILE.activity,
      ),
      intent: readOneOf<Intent>(
        KEYS.profileIntent,
        INTENTS,
        DEFAULT_PROFILE.intent,
      ),
    };
  },
  setProfile(profile: GoalProfile): void {
    storage.set(KEYS.profileSex, profile.sex);
    storage.set(KEYS.profileAge, profile.ageYears);
    storage.set(KEYS.profileHeight, profile.heightCm);
    storage.set(KEYS.profileWeight, profile.weightKg);
    storage.set(KEYS.profileActivity, profile.activity);
    storage.set(KEYS.profileIntent, profile.intent);
  },
};
