import React from 'react';
import { Appearance, AppState, type ColorSchemeName } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';

import { prefs } from '../src/data/prefs/prefs';
import {
  ThemeProvider,
  useAppearance,
  useTheme,
  type AppTheme,
  type AppearanceState,
} from '../src/theme';

let theme: AppTheme;
let appearance: AppearanceState;

function Probe() {
  theme = useTheme();
  appearance = useAppearance();
  return null;
}

type AppearanceHandler = (preferences: {
  colorScheme: ColorSchemeName;
}) => void;
type AppStateHandler = (state: string) => void;

let onAppearance: AppearanceHandler = () => undefined;
let onAppState: AppStateHandler = () => undefined;

beforeEach(() => {
  jest
    .spyOn(Appearance, 'addChangeListener')
    .mockImplementation((handler: AppearanceHandler) => {
      onAppearance = handler;
      return { remove: () => undefined };
    });
  jest.spyOn(AppState, 'addEventListener').mockImplementation(((
    _event: string,
    handler: AppStateHandler,
  ) => {
    onAppState = handler;
    return { remove: () => undefined };
  }) as unknown as typeof AppState.addEventListener);
  jest.spyOn(Appearance, 'getColorScheme').mockReturnValue('light');
});

afterEach(() => {
  jest.restoreAllMocks();
  // The MMKV fake is a module-level Map: without this, the choice made in one
  // case is still stored when the next one mounts the provider.
  prefs.setAppearance('system');
});

function mount(): ReactTestRenderer.ReactTestRenderer {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
  });
  return tree;
}

describe('ThemeProvider', () => {
  test('starts on the palette the system reports', () => {
    mount();
    expect(theme.mode).toBe('light');
    expect(theme.colors.background).toBe('#F7F4EE');
  });

  test('an appearance change swaps the palette', () => {
    mount();
    ReactTestRenderer.act(() => {
      onAppearance({ colorScheme: 'dark' });
    });
    expect(theme.mode).toBe('dark');
    ReactTestRenderer.act(() => {
      onAppearance({ colorScheme: 'light' });
    });
    expect(theme.mode).toBe('light');
  });

  test('coming back to the foreground reads the appearance again', () => {
    mount();
    // The night switch landed while the app was away: no event was delivered,
    // only the resume tells the truth.
    (Appearance.getColorScheme as jest.Mock).mockReturnValue('dark');
    ReactTestRenderer.act(() => {
      onAppState('active');
    });
    expect(theme.mode).toBe('dark');
    expect(theme.colors.background).toBe('#15161A');
  });

  test('the choice wins over the system', () => {
    mount();
    ReactTestRenderer.act(() => {
      appearance.setSetting('dark');
    });
    expect(theme.mode).toBe('dark');
    expect(theme.colors.background).toBe('#15161A');
    // The device is on the light palette and says so again: the choice holds.
    ReactTestRenderer.act(() => {
      onAppearance({ colorScheme: 'light' });
    });
    expect(theme.mode).toBe('dark');
    // Back to "system" and the device is heard again.
    ReactTestRenderer.act(() => {
      appearance.setSetting('system');
    });
    expect(theme.mode).toBe('light');
    expect(theme.colors.background).toBe('#F7F4EE');
  });

  test('the choice survives a remount', () => {
    const first = mount();
    ReactTestRenderer.act(() => {
      appearance.setSetting('dark');
    });
    ReactTestRenderer.act(() => {
      first.unmount();
    });
    // A cold start: the stored choice is read while the first state is built,
    // so the first frame is already dark even though the system says light.
    mount();
    expect(appearance.setting).toBe('dark');
    expect(theme.mode).toBe('dark');
    expect(theme.colors.background).toBe('#15161A');
  });
});
