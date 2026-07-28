/*
 * Babel config — REQUIRED for NativeWind.
 *
 * This file was missing, and its absence was the root cause of the auth screen
 * rendering as a nearly blank canvas: `withNativewind` in metro.config.js only
 * compiles global.css into a stylesheet. Turning a `className` prop into actual
 * styles on a React Native component is the job of the NativeWind Babel preset
 * (it rewrites JSX to the styled/useCssElement runtime). Without it React Native
 * receives `className` as an unknown prop and silently drops it — so every
 * color, background and layout utility in the app was inert, and only inline
 * `style` objects ever rendered. Text fell back to the platform default (black
 * on the #1F1F20 canvas) and button fills never appeared.
 *
 * NOTE: do NOT add `jsxImportSource: 'nativewind'` to babel-preset-expo here.
 * That was the v4 wiring; the v5 preview ships no `nativewind/jsx-runtime`
 * export, so it fails to resolve from react-native's own View.js. v5 rewrites
 * className through the `nativewind/babel` plugin (a re-export of
 * react-native-css/babel), which is all that is needed.
 *
 * REANIMATED / WORKLETS PLUGIN — REQUIRED, and was missing. react-native-reanimated
 * v4 runs its animations on the UI thread by compiling worklet functions
 * (useAnimatedStyle, withTiming, withRepeat, …) via a Babel plugin. In v4 that
 * plugin ships from `react-native-worklets/plugin` (it moved out of reanimated
 * itself). Without it the worklets are never transformed, so every animation in
 * the app silently no-ops — the splash hex logo sat frozen and the Shimmer
 * skeletons never shimmered. It MUST be the LAST entry in `plugins` so it runs
 * after every other transform.
 */
module.exports = function babelConfig(api) {
  api.cache(true);

  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: ['react-native-worklets/plugin'],
  };
};
