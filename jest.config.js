module.exports = {
  preset: 'jest-expo',
  passWithNoTests: true,
  setupFilesAfterEnv: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // global.css is a NativeWind/PostCSS entry, not parseable JS — see jest.style-mock.js.
    '\\.css$': '<rootDir>/jest.style-mock.js',
    // .svg is a React component under Metro (react-native-svg-transformer) but a
    // plain asset object under jest-expo — rendering that object throws
    // "Element type is invalid". Stub it so SVG-using screens are testable.
    '\\.svg$': '<rootDir>/jest.svg-mock.js',
  },
  // Deliberately no transformIgnorePatterns override — jest-expo's own preset default already
  // covers all expo-* packages correctly (an earlier custom regex here anchored on "expo/",
  // which broke transformation of dash-suffixed packages like expo-modules-core).
};
