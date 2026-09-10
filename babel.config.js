module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Build-time only: the values of `.env` (gitignored) are inlined into the
    // bundle as `@env`. No native module, no runtime file system.
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: false,
        allowUndefined: true,
        verbose: false,
      },
    ],
    'react-native-worklets/plugin',
  ],
};
