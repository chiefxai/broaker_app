jest.mock('@react-native-async-storage/async-storage', () => {
  const mock = require('@react-native-async-storage/async-storage/jest/async-storage-mock');
  return { __esModule: true, default: mock, ...mock };
});

jest.mock('react-native-maps', () => {
  const MockMapElement = () => null;
  return {
    __esModule: true,
    default: MockMapElement,
    Marker: MockMapElement,
    UrlTile: MockMapElement,
    PROVIDER_GOOGLE: 'google',
  };
});

jest.mock('react-native-webview', () => ({
  WebView: () => null,
}));

require('react-native-reanimated').setUpTests();

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
beforeEach(() => AsyncStorage.clear());
