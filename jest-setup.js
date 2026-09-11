/* eslint-env jest */
/**
 * Native modules are replaced by small in-memory fakes so domain and screen
 * tests run without a device. Keep each fake honest to the real API surface
 * the app uses; extend it when a new method is needed.
 */
require('react-native-gesture-handler/jestSetup');
require('@shopify/flash-list/jestSetup');
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/lib/module/mock'),
);
// react-native-reanimated is mocked automatically from __mocks__/.

jest.mock('react-native-mmkv', () => {
  const stores = new Map();
  const createMMKV = (config = {}) => {
    const id = config.id ?? 'default';
    if (!stores.has(id)) stores.set(id, new Map());
    const store = stores.get(id);
    return {
      set: (key, value) => store.set(key, value),
      getString: key =>
        typeof store.get(key) === 'string' ? store.get(key) : undefined,
      getNumber: key =>
        typeof store.get(key) === 'number' ? store.get(key) : undefined,
      getBoolean: key =>
        typeof store.get(key) === 'boolean' ? store.get(key) : undefined,
      contains: key => store.has(key),
      remove: key => store.delete(key),
      delete: key => store.delete(key),
      getAllKeys: () => [...store.keys()],
      clearAll: () => store.clear(),
    };
  };
  return { createMMKV };
});

jest.mock('@op-engineering/op-sqlite', () => {
  // A minimal fake: statements are recorded, queries return empty result sets.
  // Tests that need real SQL semantics should run against the domain layer
  // with plain arrays, not against this fake.
  const open = () => ({
    execute: jest.fn(async () => ({ rows: [], rowsAffected: 0 })),
    executeSync: jest.fn(() => ({ rows: [], rowsAffected: 0 })),
    executeBatch: jest.fn(async () => ({ rowsAffected: 0 })),
    transaction: jest.fn(async fn =>
      fn({
        execute: async () => ({ rows: [], rowsAffected: 0 }),
        commit: async () => {},
        rollback: async () => {},
      }),
    ),
    close: jest.fn(),
  });
  return { open };
});

jest.mock('react-native-blob-util', () => {
  // The real module builds a NativeEventEmitter the moment it is imported,
  // which throws under jest. Only the filesystem half is used here (meal
  // photos), and it answers as if every call succeeded: the paths themselves
  // are asserted against the migration, not against a real directory.
  const fs = {
    dirs: { DocumentDir: '/tmp/bocado-test' },
    isDir: jest.fn(async () => true),
    mkdir: jest.fn(async () => undefined),
    cp: jest.fn(async () => undefined),
    unlink: jest.fn(async () => undefined),
    stat: jest.fn(async () => ({ size: 1024 })),
  };
  return { __esModule: true, default: { fs } };
});

jest.mock('react-native-image-picker', () => ({
  // Cancelled by default: a test that wants a photo overrides this, and one
  // that does not must never open a camera.
  launchCamera: jest.fn(async () => ({ didCancel: true })),
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {},
}));

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);
