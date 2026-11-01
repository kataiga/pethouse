/** One message of a send request, as Expo Push expects it. */
export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data: Record<string, string | number>;
  sound: 'default';
  priority: 'high';
  /** Notification category registered by the app; carries the "Done" action button. */
  categoryId: string;
  /** Android notification channel created by the app. */
  channelId: string;
}

/** Expo's error code when a token belongs to an uninstalled app or a revoked permission. */
export const DEVICE_NOT_REGISTERED = 'DeviceNotRegistered';

export type ExpoPushTicket =
  | {
    status: 'ok';
    id: string;
  }
  | {
    status: 'error';
    message: string;
    errorCode: string | null;
  };

export type ExpoPushReceipt =
  | { status: 'ok' }
  | {
    status: 'error';
    message: string;
    errorCode: string | null;
  };
