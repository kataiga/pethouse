import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import {
  useEffect, useRef,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import {
  OccurrenceError, useActOnOccurrence,
} from '@/features/routines/hooks/use-occurrences';
import {
  intentOf, responseKey, type ResponseLike,
} from '@/lib/notifications/responses';
import { configureNotifications } from '@/lib/notifications/setup';
import {
  pushKey, usePushRegistration,
} from '../hooks/use-push';

/** Responses already acted on in this process: the listener and the launch read can both see one. */
const handled = new Set<string>();

/**
 * Everything notifications need while someone is signed in, and nothing on screen: the channel
 * and the "Done" button in the current language, the device registration, and what to do when a
 * notification is tapped — in the foreground, from the background, or at a cold start.
 */
export function NotificationBridge (): null {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const act = useActOnOccurrence();
  usePushRegistration();

  // The handlers outlive renders: they read the latest mutation and translations through a ref.
  const latest = useRef({
    act,
    t,
  });
  latest.current = {
    act,
    t,
  };

  // The channel name and the button title follow the language: `t` changes with it.
  useEffect(() => {
    void configureNotifications(t);
  }, [t]);

  useEffect(() => {
    const subscription = Notifications.addPushTokenListener(() => {
      void queryClient.invalidateQueries({ queryKey: pushKey });
    });

    return () => subscription.remove();
  }, [queryClient]);

  useEffect(() => {
    const handle = (response: ResponseLike): void => {
      const key = responseKey(response);

      if (handled.has(key)) {
        return;
      }
      handled.add(key);

      const intent = intentOf(response);

      if (intent.kind === 'open') {
        router.push(intent.route);
      }

      if (intent.kind === 'complete') {
        const identifier = response.notification.request.identifier;
        void latest.current.act.mutateAsync({
          occurrenceId: intent.occurrenceId,
          tankId: intent.tankId,
          action: 'complete',
        }).then(
          () => Notifications.dismissNotificationAsync(identifier),
          (error: unknown) => {
            // Somebody else closed it meanwhile: nothing left to do, the notification can go.
            if (error instanceof OccurrenceError && error.failure === 'conflict') {
              return Notifications.dismissNotificationAsync(identifier);
            }
            Alert.alert(latest.current.t('notifications.doneFailed'));

            return undefined;
          },
        );
      }
    };
    const subscription = Notifications.addNotificationResponseReceivedListener(handle);

    // Launched by a tap: the listener came too late for it.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handle(response);
      }
    });

    return () => subscription.remove();
  }, []);

  return null;
}
