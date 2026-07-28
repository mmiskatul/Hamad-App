module.exports = {
  root: true,
  extends: ['@react-native', 'prettier'],
  rules: {
    'react-native/no-inline-styles': 'off', // styles are token-composed inline by convention
    'no-restricted-imports': ['error', {
      paths: [{ name: 'react-native', importNames: ['Text'], message: 'Use AppText from @/shared/ui so typography tokens and theme colors are applied.' }],
      patterns: [{ group: ['@/features/*/*'], message: 'Do not deep-import from another feature. Use the feature\'s public index or promote code to @/shared.' }],
    }],
  },
  overrides: [
    { files: ['jest.setup.js'], env: { jest: true } },
  ],
};
