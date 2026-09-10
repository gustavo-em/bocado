import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ThemeProvider, useTheme } from '../theme';
import { LanguageProvider } from '../i18n/LanguageProvider';
import { setBarColors, setLightNavigationBars } from '../native/appearance';
import { prefs } from '../data/prefs/prefs';
import { importSeedIfNeeded } from '../data/seed/importSeed';
import { AddFoodScreen } from '../features/add-food/AddFoodScreen';
import { DayPickerSheetScreen } from '../features/diary/DayPickerSheetScreen';
import { MealScreen } from '../features/diary/MealScreen';
import { TodayScreen } from '../features/diary/TodayScreen';
import { GoalsScreen } from '../features/goals/GoalsScreen';
import { GoalScreen } from '../features/onboarding/GoalScreen';
import { IntentScreen } from '../features/onboarding/IntentScreen';
import { ProfileScreen } from '../features/onboarding/ProfileScreen';
import { PortionSheetScreen } from '../features/portion/PortionSheetScreen';
import { QuickLogSheetScreen } from '../features/quick-log/QuickLogSheetScreen';
import { ShareSheetScreen } from '../features/share/ShareSheetScreen';
import { SourcesScreen } from '../features/sources/SourcesScreen';
import type { RootStackParamList } from './navigation/routes';
import { SplashOverlay } from './SplashOverlay';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Navigation() {
  const theme = useTheme();
  // Read once, synchronously: a clean install opens on "O que você quer?",
  // everyone else opens on "Hoje" with no flash of the first run in between.
  const [initialRoute] = useState<'Today' | 'OnboardingIntent'>(() =>
    prefs.isOnboardingDone() ? 'Today' : 'OnboardingIntent',
  );
  useEffect(() => {
    // Both halves of the bars, because the activity is never recreated
    // (`uiMode` is in `configChanges`): the icons were fixed when edge-to-edge
    // was configured, and the grounds came from the theme that was inflated at
    // launch. Writing only the icons would leave light glyphs on paper.
    // A no-op without the native module.
    setLightNavigationBars(theme.mode === 'light');
    setBarColors(theme.colors.background);
  }, [theme.mode, theme.colors.background]);
  const navigationTheme = {
    ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: theme.colors.background,
      card: theme.colors.background,
      text: theme.colors.ink,
      primary: theme.colors.accent,
      border: theme.colors.line,
    },
  };
  return (
    <NavigationContainer theme={navigationTheme}>
      {/*
        Only the icons are set from here: since React Native 0.87 the window is
        edge-to-edge and `backgroundColor` is gone, so the bars themselves take
        their colour from the Android theme (`values/styles.xml`), which paints
        them from the very first frame — before JavaScript is up.
      */}
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="Today" component={TodayScreen} />
        {/*
          The first run: three steps that slide sideways like any other push.
          Step 1 cannot be swiped away — the only ways out are an answer and
          "Pular", both of which end the first run for good.
        */}
        <Stack.Screen
          name="OnboardingIntent"
          component={IntentScreen}
          options={{ animation: 'slide_from_right', gestureEnabled: false }}
        />
        <Stack.Screen
          name="OnboardingProfile"
          component={ProfileScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="OnboardingGoal"
          component={GoalScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen name="Goals" component={GoalsScreen} />
        <Stack.Screen name="Sources" component={SourcesScreen} />
        <Stack.Screen name="Meal" component={MealScreen} />
        <Stack.Screen
          name="AddFood"
          component={AddFoodScreen}
          options={{ presentation: 'modal' }}
        />
        {/*
          The sheet animates itself (§2.12), so the route arrives with no
          transition of its own and a transparent background: what is under
          it — the search list or the diary — stays visible behind the scrim.
        */}
        <Stack.Screen
          name="Portion"
          component={PortionSheetScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="QuickLog"
          component={QuickLogSheetScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="DayPicker"
          component={DayPickerSheetScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
        <Stack.Screen
          name="Share"
          component={ShareSheetScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/**
 * Runs `task` once the first frame has been drawn (InteractionManager is gone
 * from React Native 0.87, so this is the frame-then-tick equivalent).
 */
function scheduleAfterFirstFrame(task: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const frame = requestAnimationFrame(() => {
    timer = setTimeout(task, 0);
  });
  return () => {
    cancelAnimationFrame(frame);
    if (timer !== null) clearTimeout(timer);
  };
}

export default function App() {
  useEffect(() => {
    // The seed import never blocks the UI: "Hoje" renders first, the 2 000+
    // foods land in SQLite behind it.
    return scheduleAfterFirstFrame(() => {
      importSeedIfNeeded();
    });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/*
          Language sits above the theme on purpose: the theme takes it as a
          dependency, so switching to English re-renders every screen through
          the context they all already read, without remounting the navigator.
        */}
        <LanguageProvider>
          <ThemeProvider>
            {/*
              The opening is a sibling of the navigator, never a gate around
              it: "Hoje" mounts and draws on the first frame exactly as it did
              before, and the mark plays over it without taking a touch.
            */}
            <View style={styles.root}>
              <Navigation />
              <SplashOverlay />
            </View>
          </ThemeProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
