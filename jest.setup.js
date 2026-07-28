// Inline mocks for native modules used by the app.
//
// react-native-reanimated's bundled `mock` entrypoint (added in v4) transitively
// imports CSS subpaths that jest-expo's preset doesn't transform, throwing
// `Cannot find module 'D:/.../node_modules/react-native-reanimated/src/css/...'`
// before any test runs. The library's own docs (and the v3-v4 migration guide)
// recommend providing a minimal stub here for unit tests.

const stubWorklet = () => {};

// react-native-gesture-handler ships its own jest setup; without it the Gesture
// API used by the drawer/sheet throws on import under jest-expo.
require('react-native-gesture-handler/jestSetup');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'en' }] }));
jest.mock('expo-updates', () => ({ reloadAsync: jest.fn() }));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  // The mock's module is loaded lazily; ensure worklet runtime is registered.
  Reanimated.call = stubWorklet;
  return Reanimated;
});

// Stub react-native-svg for tests that transitively pull Hugeicons.
jest.mock('react-native-svg', () => {
  const React = require('react');
  const mock = (name) => {
    const Cmp = (props) => React.createElement(name, props, props.children);
    Cmp.displayName = name;
    return Cmp;
  };
  return new Proxy({}, { get: (_t, key) => (typeof key === 'string' ? mock(key) : undefined) });
});

// Stub @hugeicons/react-native renderer for tests (no DOM/SVG in node).
jest.mock('@hugeicons/react-native', () => ({
  __esModule: true,
  HugeiconsIcon: () => null,
}));

// FlatList in the test renderer relies on @react-native/virtualized-lists, which
// the jsdom-style test renderer doesn't fully load. Replace it with a thin
// scrollable wrapper so existing tests that render <ConversationScreen />
// (and any other FlatList consumer) don't blow up on `Consumer` undefined.
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const React = require('react');
  const RN = require('react-native');
  const isComponentType = (value) =>
    typeof value === 'function' || (typeof value === 'object' && value !== null && value.$$typeof != null);

  const FlatList = React.forwardRef(({ data, renderItem, keyExtractor, ListEmptyComponent, ListFooterComponent, contentContainerStyle, ...rest }, ref) => {
    const items = Array.isArray(data) ? data : [];
    const elements = [];
    if (items.length === 0) {
      if (ListEmptyComponent) {
        if (React.isValidElement(ListEmptyComponent)) {
          elements.push(React.cloneElement(ListEmptyComponent, { key: '__empty__' }));
        } else if (isComponentType(ListEmptyComponent)) {
          elements.push(
            React.createElement(ListEmptyComponent, { key: '__empty__' }),
          );
        }
      }
    } else {
      items.forEach((item, index) => {
        const node = renderItem ? renderItem({ item, index }) : null;
        const key = keyExtractor ? keyExtractor(item, index) : index;
        if (React.isValidElement(node)) {
          elements.push(React.cloneElement(node, { key }));
        } else {
          elements.push(
            React.createElement(RN.View, { key }, node),
          );
        }
      });
    }
    if (ListFooterComponent) {
      if (React.isValidElement(ListFooterComponent)) {
        elements.push(React.cloneElement(ListFooterComponent, { key: '__footer__' }));
      } else if (isComponentType(ListFooterComponent)) {
        elements.push(
          React.createElement(ListFooterComponent, { key: '__footer__' }),
        );
      }
    }
    return React.createElement(
      RN.ScrollView,
      { ref, contentContainerStyle, ...rest },
      ...elements,
    );
  });
  FlatList.displayName = 'FlatList';
  return { __esModule: true, default: FlatList, FlatList };
});
