import { interpolate, resolveLanguage, setLanguage, t } from '../src/i18n';
import {
  formatDayFull,
  formatDayLong,
  formatDayTitle,
  formatKcal,
  formatMonthTitle,
  fromDayKey,
  toDayKey,
} from '../src/i18n/format';

describe('i18n', () => {
  test('resolves the device language, Portuguese first', () => {
    expect(resolveLanguage('system', ['pt-BR', 'en-US'])).toBe('pt-BR');
    expect(resolveLanguage('system', ['en-GB'])).toBe('en-US');
    expect(resolveLanguage('system', ['fr-FR'])).toBe('pt-BR');
    expect(resolveLanguage('en-US', ['pt-BR'])).toBe('en-US');
  });

  test('interpolates placeholders and leaves unknown ones visible', () => {
    expect(interpolate('Adicionar em {meal}', { meal: 'Almoço' })).toBe(
      'Adicionar em Almoço',
    );
    expect(interpolate('{a} e {b}', { a: 1 })).toBe('1 e {b}');
  });

  test('copy switches language', () => {
    setLanguage('pt-BR');
    expect(t('meals.afternoon_snack')).toBe('Café da tarde');
    setLanguage('en-US');
    expect(t('meals.afternoon_snack')).toBe('Afternoon snack');
    setLanguage('pt-BR');
  });

  test('formats kcal as an integer with the locale separator', () => {
    setLanguage('pt-BR');
    expect(formatKcal(1240.4)).toBe('1.240');
    setLanguage('en-US');
    expect(formatKcal(1240.4)).toBe('1,240');
    setLanguage('pt-BR');
  });

  test('day titles are short, day names for screen readers are long', () => {
    const monday = new Date(2026, 8, 7);
    setLanguage('pt-BR');
    // No weekday in the title: it is also the button that opens the month
    // sheet, and the strip right below already shows "seg".
    expect(formatDayTitle(monday)).toBe('7 de set');
    expect(formatDayLong(monday)).toBe('segunda-feira, 7 de setembro');
    expect(formatMonthTitle(monday)).toBe('setembro de 2026');
    expect(formatDayFull(monday)).toBe('segunda-feira, 7 de setembro de 2026');
    setLanguage('en-US');
    expect(formatDayTitle(monday)).toBe('Sep 7');
    expect(formatDayLong(monday)).toBe('Monday, September 7');
    expect(formatMonthTitle(monday)).toBe('September 2026');
    expect(formatDayFull(monday)).toBe('Monday, September 7, 2026');
    setLanguage('pt-BR');
  });

  test('day keys use the local calendar', () => {
    const date = new Date(2026, 8, 8, 23, 30);
    expect(toDayKey(date)).toBe('2026-09-08');
    expect(fromDayKey('2026-09-08').getDate()).toBe(8);
  });
});
