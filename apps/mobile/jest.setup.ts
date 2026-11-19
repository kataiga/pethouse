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

// The system date picker is native. Under Jest it renders a button that picks 15 January 2026.
jest.mock('@react-native-community/datetimepicker', () => {
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const { Pressable } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    __esModule: true,
    default: ({ onChange, testID }: { onChange?: (event: { type: 'set';
      nativeEvent: { timestamp: number;
        utcOffset: number } }, date?: Date) => void;
    testID?: string }) => {
      const date = new Date(2026, 0, 15);

      return createElement(Pressable, {
        testID,
        onPress: () => onChange?.({
          type: 'set',
          nativeEvent: {
            timestamp: date.getTime(),
            utcOffset: 0,
          },
        }, date),
      });
    },
  };
});

// Notifications are native. Under Jest: nothing granted yet, no tap pending, and listeners that
// tests can reach through `jest.requireMock('expo-notifications')`.
jest.mock('expo-notifications', () => {
  const subscription = (): { remove: jest.Mock } => ({ remove: jest.fn() });

  return {
    AndroidImportance: { HIGH: 4 },
    PermissionStatus: {
      GRANTED: 'granted',
      DENIED: 'denied',
      UNDETERMINED: 'undetermined',
    },
    DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn(() => Promise.resolve(null)),
    setNotificationCategoryAsync: jest.fn(() => Promise.resolve(null)),
    getPermissionsAsync: jest.fn(() => Promise.resolve({
      granted: false,
      canAskAgain: true,
    })),
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    getExpoPushTokenAsync: jest.fn(() => Promise.resolve({
      type: 'expo',
      data: 'ExponentPushToken[jest]',
    })),
    addPushTokenListener: jest.fn(subscription),
    addNotificationResponseReceivedListener: jest.fn(subscription),
    getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
    dismissNotificationAsync: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('expo-device', () => ({ isDevice: true }));
