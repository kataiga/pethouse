import {
  fireEvent, renderRouter, screen, waitFor,
} from 'expo-router/testing-library';
import { changeLanguage } from '@/lib/i18n';
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

/** A routine whose own schedule plans nothing soon, so each test places its occurrences itself. */
function routineOn (tankId: number, name: string, userId: number): ReturnType<typeof mockFake.routines.addRoutine> {
  return mockFake.routines.addRoutine(tankId, {
    name,
    rrule: 'FREQ=YEARLY;BYHOUR=9;BYMINUTE=0',
    dtstart: `${new Date(Date.now() + 200 * 24 * HOUR_MS).toISOString().slice(0, 10)}T09:00`,
    createdBy: userId,
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

describe('Today', () => {
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

  it('lists what is overdue and coming up across tanks, and closes tasks from the list', async () => {
    const { householdId, userId } = signIn();
    const salon = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const nano = mockFake.tanks.addTank(householdId, { name: 'Nano' });
    const feeding = routineOn(salon.id, 'Nourrissage', userId);
    const misting = routineOn(nano.id, 'Brumisation', userId);
    const missed = mockFake.routines.addOccurrence(feeding, new Date(Date.now() - 26 * HOUR_MS), 'MISSED');
    const later = mockFake.routines.addOccurrence(misting, new Date(Date.now() + 50 * HOUR_MS), 'PENDING');
    const nextWeek = mockFake.routines.addOccurrence(feeding, new Date(Date.now() + 120 * HOUR_MS), 'PENDING');
    mockFake.routines.addOccurrence(feeding, new Date(Date.now() - 50 * HOUR_MS), 'DONE', userId);
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByTestId('today-overdue')).toBeTruthy();
    expect(screen.getByText('Bonjour Camille')).toBeTruthy();
    expect(screen.getByText('En retard')).toBeTruthy();
    expect(screen.getAllByText(/ · Salon$/).length).toBe(2);
    expect(screen.getAllByText(/ · Nano$/).length).toBe(1);
    expect(screen.getByText('À venir')).toBeTruthy();
    expect(screen.getByTestId(`today-${later.id}`)).toBeTruthy();
    expect(screen.getByTestId(`today-${nextWeek.id}`)).toBeTruthy();
    // Done ones are not to do any more.
    expect(screen.getAllByText('Nourrissage').length).toBe(2);

    fireEvent.press(screen.getByTestId(`today-${missed.id}-done`));
    await waitFor(() => expect(screen.queryByTestId('today-overdue') === null).toBe(true));
    expect(missed).toMatchObject({
      status: 'DONE',
      completedBy: userId,
    });

    fireEvent.press(screen.getByTestId(`today-${later.id}-skip`));
    await waitFor(() => expect(screen.queryByTestId(`today-${later.id}`) === null).toBe(true));
    expect(later.status).toBe('SKIPPED');

    fireEvent.press(screen.getByTestId(`today-${nextWeek.id}-open`));
    await waitFor(() => expect(screen).toHavePathname(`/tanks/${salon.id}/routines/${feeding.id}`));
  });

  it('says when someone else was faster, and when there is nothing to do', async () => {
    const { householdId, userId } = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const routine = routineOn(tank.id, 'Nourrissage', userId);
    const occurrence = mockFake.routines.addOccurrence(routine, new Date(Date.now() - 2 * HOUR_MS), 'MISSED');
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByTestId(`today-${occurrence.id}`)).toBeTruthy();
    // Closed from a notification on another phone before this list refreshed.
    occurrence.status = 'DONE';
    occurrence.completedBy = userId;
    fireEvent.press(screen.getByTestId(`today-${occurrence.id}-skip`));

    expect(await screen.findByText('Quelqu’un d’autre s’en est déjà occupé.')).toBeTruthy();
    expect(await screen.findByText('Rien à faire pour l’instant.')).toBeTruthy();
  });

  it('offers a retry when the tasks cannot be loaded', async () => {
    signIn();
    mockFake.failing = /\/occurrences$/;
    renderRouter('./app', { initialUrl: '/' });

    expect(await screen.findByText('Impossible de charger les tâches.', {}, { timeout: 4000 })).toBeTruthy();
    mockFake.failing = null;
    fireEvent.press(screen.getByText('Réessayer'));

    expect(await screen.findByTestId('today-empty')).toBeTruthy();
  });
});
