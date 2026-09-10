module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest-setup.js'],
  // react-native-worklets ships a resolver that swaps its native entry for the
  // JS mock under Jest, which Reanimated 4 needs to load without a device.
  resolver: 'react-native-worklets/jest/resolver',
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  // The seed build scripts are plain ESM (.mjs), which the default testMatch
  // does not pick up; the glossary they apply is domain logic and has tests.
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
    '**/?(*.)+(spec|test).mjs',
  ],
  // lucide-react-native resolves to its ESM build (.mjs) under the
  // `react-native` export condition; the preset only transforms js/ts/tsx.
  transform: {
    '^.+\\.(js|mjs|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      '@react-native/jest-preset/jest/assetFileTransformer.js',
    ),
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-.*|@react-navigation|@shopify/flash-list|@op-engineering|lucide-react-native)/)',
  ],
};
