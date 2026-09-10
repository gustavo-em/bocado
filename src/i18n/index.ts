import { NativeModules, Platform } from 'react-native';

import { enUS } from './en-US';
import { ptBR, type CopyTable } from './pt-BR';

export type AppLanguage = 'pt-BR' | 'en-US';
export type LanguageSetting = 'system' | AppLanguage;

/**
 * The language tags the phone reports, most preferred first. Read from the
 * platform's own settings instead of through a library: two tags are all this
 * app needs.
 */
export function deviceLanguageTags(): string[] {
  try {
    if (Platform.OS === 'ios') {
      const settings =
        NativeModules.SettingsManager?.settings ??
        NativeModules.SettingsManager?.getConstants?.()?.settings;
      const tags: string[] = settings?.AppleLanguages ?? [];
      return tags.length ? tags : [settings?.AppleLocale ?? 'en-US'];
    }
    const constants =
      NativeModules.I18nManager?.getConstants?.() ?? NativeModules.I18nManager;
    const tag = constants?.localeIdentifier;
    return tag ? [String(tag).replace('_', '-')] : ['pt-BR'];
  } catch {
    return ['pt-BR'];
  }
}

export function resolveLanguage(
  setting: LanguageSetting,
  tags: readonly string[] = deviceLanguageTags(),
): AppLanguage {
  if (setting !== 'system') return setting;
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('pt')) return 'pt-BR';
    if (lower.startsWith('en')) return 'en-US';
  }
  return 'pt-BR';
}

const tables: Record<AppLanguage, CopyTable | typeof enUS> = {
  'pt-BR': ptBR,
  'en-US': enUS,
};

let current: AppLanguage = resolveLanguage('system');

export function setLanguage(language: AppLanguage): void {
  current = language;
}

export function currentLanguage(): AppLanguage {
  return current;
}

/** Fills `{name}` placeholders. Numbers are formatted by `format.ts`, not here. */
export function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

type Leaves<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${Prefix}${K}`
    : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type CopyKey = Leaves<CopyTable>;

/** `t('today.addTo', { meal: 'Almoço' })` → "Adicionar em Almoço". */
export function t(
  key: CopyKey,
  values?: Record<string, string | number>,
): string {
  const parts = key.split('.');
  let node: unknown = tables[current];
  for (const part of parts) {
    node = (node as Record<string, unknown>)?.[part];
  }
  return interpolate(typeof node === 'string' ? node : key, values);
}

export { ptBR, enUS };
