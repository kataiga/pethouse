// The native module is absent under Jest: answer like a device set to French.
jest.mock('expo-localization', () => ({
  getLocales: () => [{
    languageCode: 'fr',
    languageTag: 'fr-FR',
  }],
}));

// Without native insets the provider renders nothing; the library ships a mock for tests.
jest.mock('react-native-safe-area-context', () => jest.requireActual<{ default: object }>(
  'react-native-safe-area-context/jest/mock',
).default);
