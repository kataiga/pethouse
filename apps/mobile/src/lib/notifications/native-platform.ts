import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type {
  DevicePlatform, PushPlatform,
} from './registration';

/** The EAS project the push token is issued for, once `eas init` has run; null before. */
function readProjectId (): string | null {
  const fromEas = Constants.easConfig?.projectId;

  if (typeof fromEas === 'string' && fromEas !== '') {
    return fromEas;
  }

  const eas: unknown = Constants.expoConfig?.extra?.eas;

  if (typeof eas === 'object' && eas !== null && 'projectId' in eas && typeof eas.projectId === 'string') {
    return eas.projectId;
  }

  return null;
}

function platformOf (os: string): DevicePlatform | null {
  if (os === 'android') {
    return 'ANDROID';
  }

  return os === 'ios' ? 'IOS' : null;
}

/** The phone as registration sees it, backed by expo-notifications. */
export const nativePushPlatform: PushPlatform = {
  platform: platformOf(Platform.OS),
  // An iOS simulator gets no token; an Android emulator with Google Play does.
  canReceivePush: Platform.OS === 'android' || Device.isDevice,
  get projectId (): string | null {
    return readProjectId();
  },
  permission: async () => {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();

    return {
      granted,
      canAskAgain,
    };
  },
  requestPermission: async () => {
    const { granted } = await Notifications.requestPermissionsAsync();

    return { granted };
  },
  expoPushToken: async (projectId) => (await Notifications.getExpoPushTokenAsync({ projectId })).data,
};
