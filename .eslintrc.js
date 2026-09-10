module.exports = {
  root: true,
  extends: '@react-native',
  overrides: [
    {
      // Node scripts (seed builder, brand assets): plain ESM, no Babel.
      files: ['scripts/**/*.mjs'],
      parser: 'espree',
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      // `jest` for the glossary test, which runs under Jest like the rest.
      env: { node: true, es2022: true, jest: true },
    },
  ],
};
