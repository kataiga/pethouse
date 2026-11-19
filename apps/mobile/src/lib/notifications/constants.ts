/** Category the API puts on routine notifications; it carries the "Done" button. Same name as the API's. */
export const ROUTINE_CATEGORY = 'routine-occurrence';

/** Android channel the API sends routine notifications on. Same name as the API's. */
export const ROUTINE_CHANNEL = 'routines';

/** Identifier of the "Done" button. */
export const DONE_ACTION = 'done';

/**
 * Whether "Done" brings the app to the foreground. `docs/architecture.md` wants it ticked off
 * without opening the app; on Android, expo-notifications only hands that response to JavaScript
 * while the app process is alive (it is buffered in that process otherwise), so with the app
 * killed the tap can be lost. Kept `false`, as the architecture says, until that decision is
 * revisited; `NotificationBridge` handles a buffered response as soon as its listener attaches.
 */
export const DONE_OPENS_APP = false;

/** What `expo-notifications` reports when the notification itself was tapped. */
export const OPEN_ACTION = 'expo.modules.notifications.actions.DEFAULT';
