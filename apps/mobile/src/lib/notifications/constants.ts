/** Category the API puts on routine notifications; it carries the "Done" button. Same name as the API's. */
export const ROUTINE_CATEGORY = 'routine-occurrence';

/** Android channel the API sends routine notifications on. Same name as the API's. */
export const ROUTINE_CHANNEL = 'routines';

/** Identifier of the "Done" button. */
export const DONE_ACTION = 'done';

/**
 * "Done" brings the app to the foreground, briefly: on Android, expo-notifications hands an action
 * response to JavaScript only while the app process is alive, so with the app killed a "Done"
 * that stayed in the background would be lost without a word. Opened, the app receives the tap
 * (at a cold start through `getLastNotificationResponseAsync`) and completes the occurrence.
 * See `docs/architecture.md`, Push delivery.
 */
export const DONE_OPENS_APP = true;

/** What `expo-notifications` reports when the notification itself was tapped. */
export const OPEN_ACTION = 'expo.modules.notifications.actions.DEFAULT';
