import { Alert } from 'react-native';
import {
  fireEvent, renderRouter, screen, waitFor,
} from 'expo-router/testing-library';
import { changeLanguage } from '@/lib/i18n';
import { todayCalendarDate } from '@/lib/i18n/format';
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

const DAY_MS = 86_400_000;

/** Answers every native alert with the first listed button, else the destructive one. */
function answerAlerts (...labels: string[]): void {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    const chosen = buttons?.find((button) => labels.includes(button.text ?? ''))
      ?? buttons?.find((button) => button.style === 'destructive');
    chosen?.onPress?.();
  });
}

function signIn (): { householdId: number;
  userId: number } {
  mockStore.value = mockFake.seedSignedIn('Camille');

  return {
    householdId: mockFake.householdOf('Camille').id,
    userId: mockFake.accountNamed('Camille').id,
  };
}

function lastBody (method: string, pattern: RegExp): unknown {
  return mockFake.requests.filter((request) => request.method === method && pattern.test(request.path)).at(-1)?.body;
}

/** A local `YYYY-MM-DDTHH:mm` some days back, as the fake reads starts in UTC. */
function startDaysAgo (days: number, time: string): string {
  return `${new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10)}T${time}`;
}

describe('Routines', () => {
  beforeAll(() => {
    renderRouter({ index: () => null }).unmount();
  }, 60_000);

  beforeEach(async () => {
    jest.restoreAllMocks();
    mockFake.reset();
    mockStore.value = null;
    jest.requireMock<{ mockRebuild: () => void }>('@/lib/api/client').mockRebuild();
    await changeLanguage('fr');
  });

  it('creates a routine from a template, adjusting its days, times and reminders', async () => {
    const { householdId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}` });

    expect(await screen.findByText('Aucune routine pour ce bac.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('routines-add'));
    expect(await screen.findByText('Changement d’eau')).toBeTruthy();
    expect(screen.getByText('Chaque semaine le samedi à 10:00')).toBeTruthy();
    expect(screen.getByText('Tous les jours à 08:00')).toBeTruthy();
    fireEvent.press(screen.getByTestId('template-1'));

    expect(await screen.findByTestId('routine-name')).toBeTruthy();
    expect(screen.getByTestId('routine-name').props.value).toBe('Changement d’eau');
    expect(screen.getByTestId('recurrence-summary').props.children).toBe('Chaque semaine le samedi à 10:00');
    expect((await screen.findAllByText(/^sam\. .* 10:00$/)).length).toBe(5);

    fireEvent.press(screen.getByTestId('weekday-WE'));
    fireEvent.press(screen.getByTestId('time-add'));
    fireEvent.press(screen.getByTestId('time-picker'));
    expect(screen.getByTestId('recurrence-summary').props.children)
      .toBe('Chaque semaine le mercredi et samedi à 00:00 et 10:00');
    fireEvent(screen.getByTestId('reminders-enabled'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('reminders-every-30'));
    fireEvent.press(screen.getByTestId('reminders-more'));
    expect(screen.getByTestId('reminders-max').props.children).toBe('4');
    fireEvent.press(screen.getByTestId('routine-submit'));

    const routine = await waitFor(() => {
      const created = mockFake.routines.routines[0];
      expect(created).toBeDefined();

      return created;
    });
    await waitFor(() => expect(screen).toHavePathname(`/tanks/${tank.id}/routines/${routine?.id ?? 0}`));
    expect(lastBody('POST', /\/routines$/)).toEqual({
      name: 'Changement d’eau',
      description: 'Remplacer une partie de l’eau par une eau à la bonne température.',
      rrule: 'FREQ=WEEKLY;BYDAY=WE,SA;BYHOUR=0,10;BYMINUTE=0',
      dtstart: `${todayCalendarDate()}T00:00`,
      reminderRepeatMinutes: 30,
      reminderMaxRepeats: 4,
    });
    expect(await screen.findByText('Relance toutes les 30 min, 4 fois au plus')).toBeTruthy();
    expect((await screen.findAllByTestId(/^occurrence-\d+-done$/)).length).toBeGreaterThan(0);
  });

  it('shows why a rule cannot be saved, and reads monthly rules aloud', async () => {
    const { householdId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}/routines/new` });

    fireEvent.press(await screen.findByTestId('template-scratch'));
    for (const day of ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']) {
      const toggle = screen.getByTestId(`weekday-${day}`);

      if (toggle.props.accessibilityState?.checked === true) {
        fireEvent.press(toggle);
      }
    }
    fireEvent.press(screen.getByTestId('routine-submit'));
    expect(await screen.findByText('Le nom est obligatoire.')).toBeTruthy();
    expect(screen.getByText('Choisis au moins un jour.')).toBeTruthy();

    fireEvent.press(screen.getByTestId('frequency-MONTHLY'));
    fireEvent.press(screen.getByTestId('monthly-kind-weekdayOfMonth'));
    fireEvent.press(screen.getByTestId('ordinal--1'));
    fireEvent.press(screen.getByTestId('month-weekday-SU'));
    expect(screen.getByTestId('recurrence-summary').props.children).toBe('Chaque mois le dernier dimanche à 09:00');
    fireEvent.changeText(screen.getByTestId('interval'), '0');
    expect(screen.getByText('Indique un nombre entier entre 1 et 99.')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('interval'), '3');
    expect(screen.getByTestId('recurrence-summary').props.children).toBe('Tous les 3 mois le dernier dimanche à 09:00');
    expect(lastBody('POST', /\/routines$/)).toBeUndefined();
  });

  it('ticks occurrences off from the deep-linked routine, and says when someone was faster', async () => {
    const { householdId, userId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const routine = mockFake.routines.addRoutine(tank.id, {
      name: 'Nourrissage',
      rrule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
      dtstart: startDaysAgo(10, '08:00'),
      createdBy: userId,
    });
    const missed = mockFake.routines.addOccurrence(routine, new Date(Date.now() - DAY_MS), 'MISSED');
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}/routines/${routine.id}` });

    expect(await screen.findByText('Tous les jours à 08:00')).toBeTruthy();
    expect(await screen.findByText('En retard')).toBeTruthy();
    fireEvent.press(screen.getByTestId(`occurrence-${missed.id}-done`));
    await waitFor(() => expect(screen.queryByTestId(`occurrence-${missed.id}`) === null).toBe(true));
    expect(await screen.findByText(/^Fait par Camille · /)).toBeTruthy();
    expect(missed).toMatchObject({
      status: 'DONE',
      completedBy: userId,
    });

    const [next, after] = mockFake.routines.occurrences
      .filter((occurrence) => occurrence.status === 'PENDING')
      .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));
    fireEvent.press(screen.getByTestId(`occurrence-${next?.id ?? 0}-skip`));
    expect(await screen.findByText(/^Passé par Camille · /)).toBeTruthy();

    // Someone else does the next one from a notification before this screen refreshes.
    if (after) {
      after.status = 'DONE';
      after.completedBy = userId;
    }
    fireEvent.press(screen.getByTestId(`occurrence-${after?.id ?? 0}-skip`));
    expect(await screen.findByText('Quelqu’un d’autre s’en est déjà occupé.')).toBeTruthy();
  });

  it('pauses, edits and deletes a routine', async () => {
    const { householdId, userId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const routine = mockFake.routines.addRoutine(tank.id, {
      name: 'Vitres',
      rrule: 'FREQ=WEEKLY;BYDAY=WE;BYHOUR=19;BYMINUTE=0',
      dtstart: startDaysAgo(3, '19:00'),
      createdBy: userId,
    });
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}` });

    expect(await screen.findByText(/^Prochaine : mer\. /)).toBeTruthy();
    fireEvent.press(screen.getByTestId(`routine-${routine.id}`));
    fireEvent(await screen.findByTestId('routine-active'), 'valueChange', false);
    expect(await screen.findByText('En pause : plus d’échéance ni de rappel, l’historique reste.')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('routine-upcoming') === null).toBe(true));
    expect(routine.isActive).toBe(false);
    expect(mockFake.routines.occurrences.filter((occurrence) => occurrence.status === 'PENDING')).toHaveLength(0);

    answerAlerts('Modifier');
    fireEvent.press(screen.getByTestId('routine-actions'));
    fireEvent.changeText(await screen.findByTestId('routine-name'), 'Vitres et couvercle');
    fireEvent.press(screen.getByTestId('routine-submit'));
    expect(await screen.findByText('Vitres et couvercle')).toBeTruthy();
    expect(screen).toHavePathname(`/tanks/${tank.id}/routines/${routine.id}`);
    expect(lastBody('PATCH', /\/routines\/\d+$/)).toMatchObject({
      name: 'Vitres et couvercle',
      rrule: 'FREQ=WEEKLY;BYDAY=WE;BYHOUR=19;BYMINUTE=0',
    });

    answerAlerts();
    fireEvent.press(screen.getByTestId('routine-actions'));
    expect(await screen.findByText('Aucune routine pour ce bac.')).toBeTruthy();
    expect(screen).toHavePathname(`/tanks/${tank.id}`);
    expect(mockFake.routines.routines).toHaveLength(0);
  });

  it('keeps a rule made elsewhere as it is, until it is replaced on purpose', async () => {
    const { householdId, userId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const rule = 'FREQ=DAILY;COUNT=30;BYHOUR=7;BYMINUTE=15';
    const routine = mockFake.routines.addRoutine(tank.id, {
      name: 'Cure',
      rrule: rule,
      dtstart: startDaysAgo(1, '07:15'),
      createdBy: userId,
    });
    const view = renderRouter('./app', { initialUrl: `/tanks/${tank.id}/routines/${routine.id}/edit` });

    expect(await screen.findByText(`Règle personnalisée : ${rule}`)).toBeTruthy();
    fireEvent.press(screen.getByTestId('routine-submit'));
    await waitFor(() => expect(lastBody('PATCH', /\/routines\/\d+$/)).toMatchObject({ rrule: rule }));
    // Nothing to go back to from a link: the routine opens instead.
    await waitFor(() => expect(screen).toHavePathname(`/tanks/${tank.id}/routines/${routine.id}`));

    view.unmount();
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}/routines/${routine.id}/edit` });
    fireEvent.press(await screen.findByTestId('recurrence-replace'));
    expect(await screen.findByTestId('recurrence-summary')).toBeTruthy();
    expect(screen.queryByText(`Règle personnalisée : ${rule}`)).toBeNull();
  });

  it('lists who did what across the tank’s routines, newest first, page by page', async () => {
    const { householdId, userId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const feeding = mockFake.routines.addRoutine(tank.id, {
      name: 'Nourrissage',
      rrule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
      dtstart: startDaysAgo(40, '08:00'),
      isActive: false,
      createdBy: userId,
    });
    const test = mockFake.routines.addRoutine(tank.id, {
      name: 'Test de l’eau',
      rrule: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=9;BYMINUTE=30',
      dtstart: startDaysAgo(40, '09:30'),
      isActive: false,
      createdBy: userId,
    });
    for (let day = 1; day <= 22; day += 1) {
      mockFake.routines.addOccurrence(feeding, new Date(Date.now() - day * DAY_MS), 'DONE', userId);
    }
    mockFake.routines.addOccurrence(test, new Date(Date.now() - 2.5 * DAY_MS), 'SKIPPED', userId);
    mockFake.routines.addOccurrence(test, new Date(Date.now() - 9.5 * DAY_MS), 'MISSED');
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}/routines/history` });

    expect(await screen.findByText(/^Passé par Camille · /)).toBeTruthy();
    // First page: 18 feedings, with the skipped and the missed test in between.
    expect(screen.getAllByText('Nourrissage').length).toBe(18);
    fireEvent.press(screen.getByTestId('history-more'));
    await waitFor(() => expect(screen.getAllByText('Nourrissage').length).toBe(22));
    expect(screen.getByText(/^Manqué · prévu le /)).toBeTruthy();
    expect(screen.queryByTestId('history-more') === null).toBe(true);
  });
});
