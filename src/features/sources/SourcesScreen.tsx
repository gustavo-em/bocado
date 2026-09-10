import React, { useCallback } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../app/navigation/routes';
import { BrandMark, BRAND_MARK_UI_DP } from '../../components/BrandMark';
import { ScreenHeader } from '../../components/ScreenHeader';
import { TextButton } from '../../components/TextButton';
import { t, type CopyKey } from '../../i18n';
import { useTheme } from '../../theme';
import { textDefaults } from '../../theme/type';

type Navigation = NativeStackNavigationProp<RootStackParamList, 'Sources'>;

const LINK_LOG_TAG = '[bocado:sources]';

/** Gap between the citation and the link that follows it. */
const TEXT_TO_LINK = 4;

/**
 * Room kept under the last line for a navigation bar the window insets do not
 * report (Android 10 with the three-button bar overlaying the window).
 */
const NAV_BAR_CLEARANCE = 48;

interface SourceBlock {
  key: string;
  name: CopyKey;
  text: CopyKey;
  url?: CopyKey;
}

/**
 * The four datasets behind every number in the app, in the order they answer
 * a search. The citations are fixed verbatim by docs/FOOD_DATA_CONTRACT.md —
 * TACO asks for the citation, IBGE for the credit, Open Food Facts for the
 * ODbL notice, USDA for the CC0 provenance. None of it is optional.
 */
const SOURCES: SourceBlock[] = [
  {
    key: 'taco',
    name: 'sources.taco',
    text: 'sources.tacoText',
    url: 'sources.tacoUrl',
  },
  { key: 'ibge', name: 'sources.ibge', text: 'sources.ibgeText' },
  {
    key: 'off',
    name: 'sources.off',
    text: 'sources.offText',
    url: 'sources.offUrl',
  },
  {
    key: 'usda',
    name: 'sources.usda',
    text: 'sources.usdaText',
    url: 'sources.usdaUrl',
  },
];

/**
 * "Fontes de dados e licenças", reached from "Metas". Plain reading matter:
 * a name, its citation and, where there is one, a link. No card, no accent —
 * the screen exists to be read and to be found, not to be looked at.
 */
export function SourcesScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Navigation>();

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

  const open = useCallback((url: string) => {
    Linking.openURL(url).catch(error => {
      console.warn(`${LINK_LOG_TAG} ${url} failed: ${String(error)}`);
    });
  }, []);

  return (
    <View
      style={[
        styles.screen,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
      testID="sources-screen"
    >
      <ScreenHeader
        title={t('sources.title')}
        leading={{
          icon: 'chevron-left',
          onPress: goBack,
          accessibilityLabel: t('common.back'),
        }}
      />
      <ScrollView
        // Explicitly the leftover space under the header, so the four
        // citations always have somewhere to scroll instead of being cut by
        // whatever height the column happens to give this view.
        style={styles.scroll}
        contentContainerStyle={{
          /*
            The J6 reports no bottom inset for its overlaid navigation bar, so
            the last citation and its link ended up under it, unreadable and
            untappable. `NAV_BAR_CLEARANCE` is the floor: whichever of the two
            is larger wins, plus the screen's own bottom margin.
          */
          paddingBottom:
            Math.max(insets.bottom, NAV_BAR_CLEARANCE) + theme.spacing.xl,
          paddingHorizontal: theme.spacing.lg,
        }}
      >
        {SOURCES.map((source, index) => {
          const url = source.url ? t(source.url) : undefined;
          return (
            <View key={source.key} testID={`source-${source.key}`}>
              {index > 0 ? (
                <View
                  style={[
                    styles.rule,
                    {
                      backgroundColor: theme.colors.line,
                      marginVertical: theme.spacing.md,
                    },
                  ]}
                />
              ) : null}
              <Text
                style={[
                  theme.type.bodyMedium,
                  textDefaults,
                  {
                    color: theme.colors.ink,
                    marginTop: index === 0 ? theme.spacing.md : 0,
                  },
                ]}
                maxFontSizeMultiplier={1.3}
                accessibilityRole="header"
              >
                {t(source.name)}
              </Text>
              <Text
                style={[
                  theme.type.label,
                  textDefaults,
                  { color: theme.colors.inkMuted, marginTop: theme.spacing.xs },
                ]}
                maxFontSizeMultiplier={1.3}
              >
                {t(source.text)}
              </Text>
              {url ? (
                /*
                  "Abrir USDA", not the address again: every one of these URLs
                  is already inside the verbatim citation right above, and the
                  long ones wrapped onto a second line at larger text sizes,
                  pushing the last source under the navigation bar.
                */
                <View style={[styles.link, { marginLeft: -theme.spacing.md }]}>
                  <TextButton
                    label={t('sources.openLink', { source: t(source.name) })}
                    accessibilityLabel={t('sources.openLink', {
                      source: t(source.name),
                    })}
                    onPress={() => open(url)}
                    variant="compact"
                    tone="ink"
                    icon="external-link"
                    testID={`source-${source.key}-link`}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
        <View
          style={[
            styles.rule,
            {
              backgroundColor: theme.colors.line,
              marginVertical: theme.spacing.md,
            },
          ]}
        />
        <Text
          style={[
            theme.type.label,
            textDefaults,
            { color: theme.colors.inkMuted },
          ]}
          maxFontSizeMultiplier={1.3}
          testID="sources-notice"
        >
          {t('sources.notice')}
        </Text>
        {/*
          The mark at its interface size, signing the page that credits every
          other name on it. Ink, no container, no accent — docs/BRAND.md §4.5.
        */}
        <View style={[styles.signature, { marginTop: theme.spacing.xl }]}>
          <BrandMark
            size={BRAND_MARK_UI_DP}
            color={theme.colors.ink}
            accessibilityLabel={t('sources.brandMark')}
            testID="sources-brand-mark"
          />
          <Text
            style={[
              theme.type.label,
              textDefaults,
              { color: theme.colors.inkMuted, marginLeft: theme.spacing.sm },
            ]}
            maxFontSizeMultiplier={1.3}
          >
            {t('app.name')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
  },
  link: {
    flexDirection: 'row',
    marginTop: TEXT_TO_LINK,
  },
  signature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
