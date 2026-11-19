import type {
  ApiClient, Schemas,
} from '@pethouse/api-client';

export type DevicePlatform = Schemas['DevicePlatform'];

/**
 * - `granted`: this phone receives routine notifications.
 * - `undetermined`: never asked yet.
 * - `denied`: refused; only the phone's settings can change it.
 * - `unsupported`: a device that cannot receive push (an iOS simulator).
 * - `unconfigured`: the build has no EAS project or FCM credentials, so no token can be issued.
 * - `failed`: the token or the registration call failed; retried on the next launch.
 */
export type PushStatus = 'granted' | 'undetermined' | 'denied' | 'unsupported' | 'unconfigured' | 'failed';

export interface PushRegistration {
  status: PushStatus;
  /** The API's id for this installation, needed to stop notifications on sign-out. */
  deviceId: number | null;
}

/** What registration needs from the phone; the real one wraps expo-notifications. */
export interface PushPlatform {
  platform: DevicePlatform | null;
  /** False on an iOS simulator. Android emulators with Google Play do receive push. */
  canReceivePush: boolean;
  projectId: string | null;
  permission (): Promise<{ granted: boolean;
    canAskAgain: boolean }>;
  requestPermission (): Promise<{ granted: boolean }>;
  expoPushToken (projectId: string): Promise<string>;
}

/**
 * Makes sure this installation is registered for routine notifications. Asks for the permission
 * only when `ask` is true, from a gesture of the person: never on its own at launch.
 */
export async function registerDevice (api: ApiClient, phone: PushPlatform, ask: boolean): Promise<PushRegistration> {
  if (phone.platform === null || !phone.canReceivePush) {
    return {
      status: 'unsupported',
      deviceId: null,
    };
  }

  const current = await phone.permission();
  let granted = current.granted;

  if (!granted && ask && current.canAskAgain) {
    granted = (await phone.requestPermission()).granted;
  }

  if (!granted) {
    return {
      status: current.canAskAgain && !ask ? 'undetermined' : 'denied',
      deviceId: null,
    };
  }

  if (phone.projectId === null) {
    return {
      status: 'unconfigured',
      deviceId: null,
    };
  }

  let expoPushToken: string;

  try {
    expoPushToken = await phone.expoPushToken(phone.projectId);
  } catch {
    // Without FCM credentials Android refuses to issue a token: a build problem, not the person's.
    return {
      status: 'unconfigured',
      deviceId: null,
    };
  }

  const { data } = await api.PUT('/api/users/me/devices', {
    body: {
      expoPushToken,
      platform: phone.platform,
    },
  });

  return data
    ? {
      status: 'granted',
      deviceId: data.id,
    }
    : {
      status: 'failed',
      deviceId: null,
    };
}

/** Stops notifications to this installation; best effort, sign-out goes on whatever happens. */
export async function unregisterDevice (api: ApiClient, deviceId: number | null): Promise<void> {
  if (deviceId === null) {
    return;
  }

  try {
    await api.DELETE('/api/users/me/devices/{deviceId}', { params: { path: { deviceId } } });
  } catch {
    // Offline: the API prunes the token once Expo reports it unregistered.
  }
}
