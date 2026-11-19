import * as Notifications from 'expo-notifications';
import { Alert } from 'react-native';
import {
  act, fireEvent, renderRouter, screen, waitFor,
} from 'expo-router/testing-library';
import { changeLanguage } from '@/lib/i18n';
import {
  DONE_ACTION, OPEN_ACTION,
} from '@/lib/notifications/constants';
import { nativePushPlatform } from '@/lib/notifications/native-platform';
import type { ResponseLike } from '@/lib/notifications/responses';
import {
  FakeApi, MemoryTokenStore,
} from '@/test-support/fake-api';

const mockFake = new FakeApi();
const mockStore = new MemoryTokenStore();

jest.mock('@/lib/api/client', () => jest.requireActual<typeof import('@/test-support/mock-client')>(
  '@/test-support/mock-client',
).mockClientModule(mockFake, mockStore));

// See the auth flow tests: the first navigation transforms the real layouts on a cold runner.
jest.setTimeout(15_000);

const HOUR_MS = 3_600_000;

let notificationId = 0;

/** A response as expo-notifications hands it over, with the payload the API sends. */
function response (actionIdentifier: string, tankId: number, routineId: number, occurrenceId: number): ResponseLike {
  notificationId += 1;

  return {
    actionIdentifier,
    notification: {
      request: {
        identifier: `notification-${notificationId}`,
        content: {
          data: {
            url: `pethouse://tanks/${tankId}/routines/${routineId}`,
            occurrenceId,
            routineId,
            tankId,
            attempt: 0,
          },
        },
      },
    },
  };
}

/** The listener the app registered for taps, as the native module would call it. */
function tapListener (): (tap: ResponseLike) => void {
  const calls = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls;
  const listener = calls.at(-1)?.[0];

  if (!listener) {
    throw new Error('No response listener registered');
  }

  return (tap) => listener(tap as Notifications.NotificationResponse);
}

function seed (): { tankId: number;
  routineId: number;
  occurrenceId: number } {
  mockStore.value = mockFake.seedSignedIn('Camille');
  const householdId = mockFake.householdOf('Camille').id;
  const userId = mockFake.accountNamed('Camille').id;
  const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
  const routine = mockFake.routines.addRoutine(tank.id, {
    name: 'Nourrissage',
    rrule: 'FREQ=YEARLY;BYHOUR=9;BYMINUTE=0',
    dtstart: `${new Date(Date.now() + 200 * 24 * HOUR_MS).toISOString().slice(0, 10)}T09:00`,
    createdBy: userId,
  });
  const occurrence = mockFake.routines.addOccurrence(routine, new Date(Date.now() - HOUR_MS), 'PENDING');

  return {
    tankId: tank.id,
    routineId: routine.id,
    occurrenceId: occurrence.id,
  };
}

describe('Notifications', () => {
  beforeAll(() => {
    renderRouter({ index: () => null }).unmount();
  }, 60_000);

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockFake.reset();
    mockStore.value = null;
    jest.requireMock<{ mockRebuild: () => void }>('@/lib/api/client').mockRebuild();
    await changeLanguage('fr');
  });

  it('asks only on a tap, registers this phone, and unregisters it on sign-out', async () => {
    seed();
    jest.spyOn(nativePushPlatform, 'projectId', 'get').mockReturnValue('eas-project');
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByTestId('push-enable')).toBeTruthy();
    expect(screen.getByText(/^Active les notifications pour recevoir les rappels de routines/)).toBeTruthy();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockFake.devices).toHaveLength(0);
    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith('routine-occurrence', [{
      identifier: DONE_ACTION,
      buttonTitle: 'Fait',
      options: { opensAppToForeground: true },
    }]);

    // The system prompt answers « Allow ».
    fireEvent.press(screen.getByTestId('push-enable'));

    await waitFor(() => expect(screen.queryByTestId('push-banner') === null).toBe(true));
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'eas-project' });
    expect(mockFake.devices.map((device) => device.expoPushToken)).toEqual(['ExponentPushToken[jest]']);

    fireEvent.press(screen.getByText('Compte'));
    expect(await screen.findByText('Activées sur ce téléphone.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('sign-out'));

    expect(await screen.findByText('Connexion')).toBeTruthy();
    expect(mockFake.devices).toHaveLength(0);
  });

  it('says so when this build cannot get a push token, and when the phone refused', async () => {
    seed();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: true,
      canAskAgain: true,
      status: Notifications.PermissionStatus.GRANTED,
      expires: 'never',
    });
    const view = renderRouter('./app', { initialUrl: '/account' });

    // No EAS project in the test build.
    expect(await screen.findByText(/^Cette version de l’app n’est pas encore configurée/)).toBeTruthy();

    view.unmount();
    jest.requireMock<{ mockRebuild: () => void }>('@/lib/api/client').mockRebuild();
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      canAskAgain: false,
      status: Notifications.PermissionStatus.DENIED,
      expires: 'never',
    });
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByText(/^Les notifications sont désactivées/)).toBeTruthy();
    expect(screen.getByTestId('push-settings')).toBeTruthy();
  });

  it('opens the routine of a notification that launched the app', async () => {
    const { tankId, routineId, occurrenceId } = seed();
    const launch = response(OPEN_ACTION, tankId, routineId, occurrenceId);
    jest.mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(launch as Notifications.NotificationResponse);
    renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => expect(screen).toHavePathname(`/tanks/${tankId}/routines/${routineId}`));
    expect(await screen.findByText('Nourrissage')).toBeTruthy();
  });

  it('ticks the occurrence off from the Done button, once, and dismisses the notification', async () => {
    const { tankId, routineId, occurrenceId } = seed();
    renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId(`today-${occurrenceId}`)).toBeTruthy();
    const tap = response(DONE_ACTION, tankId, routineId, occurrenceId);

    await act(async () => {
      tapListener()(tap);
      tapListener()(tap);
    });

    await waitFor(() => {
      expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(tap.notification.request.identifier);
    });
    expect(mockFake.routines.occurrences.find((occurrence) => occurrence.id === occurrenceId)?.status).toBe('DONE');
    expect(mockFake.requests.filter((request) => request.path.endsWith('/complete'))).toHaveLength(1);
    // Still on the Today tab, which drops the closed task.
    expect(screen).toHavePathname('/');
    await waitFor(() => expect(screen.queryByTestId(`today-${occurrenceId}`) === null).toBe(true));
  });

  it('completes the occurrence when Done launched the app from a killed state', async () => {
    const { tankId, routineId, occurrenceId } = seed();
    const launch = response(DONE_ACTION, tankId, routineId, occurrenceId);
    jest.mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(launch as Notifications.NotificationResponse);
    renderRouter('./app', { initialUrl: '/' });

    await waitFor(() => {
      expect(Notifications.dismissNotificationAsync).toHaveBeenCalledWith(launch.notification.request.identifier);
    });
    expect(mockFake.routines.occurrences.find((occurrence) => occurrence.id === occurrenceId)?.status).toBe('DONE');
    expect(await screen.findByText('Rien à faire pour l’instant.')).toBeTruthy();
  });

  it('warns when Done could not be recorded', async () => {
    const { tankId, routineId } = seed();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    renderRouter('./app', { initialUrl: '/' });
    expect(await screen.findByTestId('today-screen')).toBeTruthy();

    await act(async () => {
      tapListener()(response(DONE_ACTION, tankId, routineId, 999_999));
    });

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith('La tâche n’a pas pu être marquée comme faite. Réessaie depuis l’app.');
    });
    expect(Notifications.dismissNotificationAsync).not.toHaveBeenCalled();
  });
});
