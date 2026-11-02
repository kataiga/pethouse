import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from './token-store';

const KEY = 'pethouse.refresh-token';

/** Keychain on iOS, Keystore-backed storage on Android. */
export const secureTokenStore: TokenStore = {
  read: () => SecureStore.getItemAsync(KEY),
  write: (refreshToken) => SecureStore.setItemAsync(KEY, refreshToken),
  clear: () => SecureStore.deleteItemAsync(KEY),
};
