import * as Notifications from 'expo-notifications';
import type { TFunction } from 'i18next';
import {
  DONE_ACTION, DONE_OPENS_APP, ROUTINE_CATEGORY, ROUTINE_CHANNEL,
} from './constants';

/** A routine notification shows as a banner with sound even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: () => Promise.resolve({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * The Android channel and the category with its "Done" button, in the person's language. Run
 * again when the language changes: both carry user-facing text.
 */
export async function configureNotifications (t: TFunction): Promise<void> {
  await Notifications.setNotificationChannelAsync(ROUTINE_CHANNEL, {
    name: t('notifications.channel'),
    importance: Notifications.AndroidImportance.HIGH,
  });
  await Notifications.setNotificationCategoryAsync(ROUTINE_CATEGORY, [{
    identifier: DONE_ACTION,
    buttonTitle: t('notifications.done'),
    options: { opensAppToForeground: DONE_OPENS_APP },
  }]);
}
