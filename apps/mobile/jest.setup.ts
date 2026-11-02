// The native module is absent under Jest: answer like a device set to French.
jest.mock('expo-localization', () => ({
  getLocales: () => [{
    languageCode: 'fr',
    languageTag: 'fr-FR',
  }],
  getCalendars: () => [{ timeZone: 'Europe/Paris' }],
}));

// Without native insets the provider renders nothing; the library ships a mock for tests.
jest.mock('react-native-safe-area-context', () => jest.requireActual<{ default: object }>(
  'react-native-safe-area-context/jest/mock',
).default);

// No keychain under Jest: an in-memory store with the same API.
jest.mock('expo-secure-store', () => {
  const values = new Map<string, string>();

  return {
    getItemAsync: (key: string) => Promise.resolve(values.get(key) ?? null),
    setItemAsync: (key: string, value: string) => {
      values.set(key, value);

      return Promise.resolve();
    },
    deleteItemAsync: (key: string) => {
      values.delete(key);

      return Promise.resolve();
    },
  };
});

// No native font registry under Jest: fonts count as loaded, as they are once the splash hides.
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));
