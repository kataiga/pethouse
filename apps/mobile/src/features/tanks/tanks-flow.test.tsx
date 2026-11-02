import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
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

const PICKED_SIZE = 2048;

// The storage side of an upload is the fake's: a PUT to the pre-signed URL it handed out.
jest.mock('expo-file-system', () => ({
  FileSystemUploadType: { BINARY_CONTENT: 0 },
  getInfoAsync: jest.fn(() => Promise.resolve({
    exists: true,
    size: 2048,
  })),
  uploadAsync: jest.fn((url: string, _uri: string, options: { headers: Record<string, string> }) => Promise.resolve({
    status: mockFake.tanks.receiveUpload(url, options.headers['Content-Type'], 2048),
    body: '',
    headers: {},
  })),
}));

jest.mock('expo-image-picker', () => {
  const picked = {
    canceled: false,
    assets: [{
      uri: 'file:///cache/picked.jpg',
      mimeType: 'image/jpeg',
    }],
  };

  return {
    requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    launchCameraAsync: jest.fn(() => Promise.resolve(picked)),
    launchImageLibraryAsync: jest.fn(() => Promise.resolve(picked)),
  };
});

// See the auth flow tests: the first navigation transforms the real layouts on a cold runner.
jest.setTimeout(15_000);

/** Answers every native alert with the first button whose label is listed, else the destructive one. */
function answerAlerts (...labels: string[]): void {
  jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
    const chosen = buttons?.find((button) => labels.includes(button.text ?? ''))
      ?? buttons?.find((button) => button.style === 'destructive');
    chosen?.onPress?.();
  });
}

function signIn (): number {
  mockStore.value = mockFake.seedSignedIn('Camille');

  return mockFake.householdOf('Camille').id;
}

function lastRequest (method: string, pattern: RegExp): unknown {
  return mockFake.requests.filter((request) => request.method === method && pattern.test(request.path)).at(-1)?.body;
}

describe('Tanks', () => {
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

  it('creates a tank in three steps and lands on its page', async () => {
    signIn();
    renderRouter('./app', { initialUrl: '/tanks' });

    expect(await screen.findByText('Ajoute ton premier bac pour suivre son entretien.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tanks-add'));

    fireEvent.press(await screen.findByTestId('tank-type-AQUARIUM'));
    fireEvent.press(await screen.findByTestId('subtype-planted'));
    expect(screen.getByText('Planté')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tank-create-next'));

    fireEvent.changeText(await screen.findByTestId('tank-name'), '  Salon  ');
    fireEvent.changeText(screen.getByTestId('tank-widthCm'), '100');
    fireEvent.changeText(screen.getByTestId('tank-depthCm'), '30');
    fireEvent.changeText(screen.getByTestId('tank-heightCm'), '40');
    expect(screen.getByTestId('tank-volume').props.value).toBe('120');
    expect(screen.getByTestId('tank-volume-suggested')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tank-started-at'));
    fireEvent.press(screen.getByTestId('tank-started-at-picker'));
    expect(screen.getByText('15 janvier 2026')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tank-create-submit'));

    expect(await screen.findByText('Démarré le 15 janvier 2026')).toBeTruthy();
    const tank = mockFake.tanks.tanks[0];
    expect(screen).toHavePathname(`/tanks/${tank?.id ?? 0}`);
    expect(lastRequest('POST', /\/tanks$/)).toEqual({
      name: 'Salon',
      tankType: 'AQUARIUM',
      subtypeId: tank?.subtypeId,
      volumeLiters: 120,
      widthCm: 100,
      heightCm: 40,
      depthCm: 30,
      startedAt: '2026-01-15',
    });
    expect(screen.getByText('Aquarium · Planté')).toBeTruthy();
    expect(screen.getByText('100 × 30 × 40 cm')).toBeTruthy();
    expect(screen.getByText('Aucun animal pour l’instant.')).toBeTruthy();
    expect(screen.getByText('Aucune plante pour l’instant.')).toBeTruthy();
  });

  it('keeps an invalid tank on the form, and adds a style of the household’s own', async () => {
    signIn();
    renderRouter('./app', { initialUrl: '/tanks/new' });

    fireEvent.press(await screen.findByTestId('tank-type-TERRARIUM'));
    expect(await screen.findByText('Désertique')).toBeTruthy();
    expect(screen.queryByText('Planté')).toBeNull();
    fireEvent.changeText(screen.getByTestId('subtype-custom'), 'Forêt de nuages');
    fireEvent.press(screen.getByTestId('subtype-custom-add'));
    await waitFor(() => {
      expect(screen.getByLabelText('Forêt de nuages').props.accessibilityState).toEqual({ checked: true });
    });
    fireEvent.press(screen.getByTestId('tank-create-next'));

    fireEvent.changeText(await screen.findByTestId('tank-widthCm'), 'large');
    fireEvent.press(screen.getByTestId('tank-create-submit'));

    expect(await screen.findByText('Le nom est obligatoire.')).toBeTruthy();
    expect(screen.getByText('Ce n’est pas un nombre valide.')).toBeTruthy();
    expect(lastRequest('POST', /\/tanks$/)).toBeUndefined();
  });

  it('edits a tank, clearing what was emptied', async () => {
    const householdId = signIn();
    const tank = mockFake.tanks.addTank(householdId, {
      name: 'Nano',
      substrate: 'Sable',
      volumeLiters: 30,
    });
    renderRouter('./app', { initialUrl: '/tanks' });

    fireEvent.press(await screen.findByTestId(`tank-${tank.id}`));
    expect(await screen.findByText('Substrat : Sable')).toBeTruthy();
    answerAlerts('Modifier');
    fireEvent.press(screen.getByTestId('tank-actions'));

    fireEvent.changeText(await screen.findByTestId('tank-name'), 'Nano cube');
    fireEvent.changeText(screen.getByTestId('tank-substrate'), '');
    fireEvent.press(screen.getByTestId('tank-edit-save'));

    expect(await screen.findByText('Nano cube')).toBeTruthy();
    expect(screen).toHavePathname(`/tanks/${tank.id}`);
    expect(screen.queryByText('Substrat : Sable')).toBeNull();
    expect(lastRequest('PATCH', /\/tanks\/\d+$/)).toMatchObject({
      name: 'Nano cube',
      substrate: null,
      volumeLiters: 30,
    });
  });

  it('deletes a tank after confirmation and takes it off the list', async () => {
    const householdId = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Ancien bac' });
    mockFake.tanks.addTank(householdId, { name: 'Bac gardé' });
    renderRouter('./app', { initialUrl: '/tanks' });

    fireEvent.press(await screen.findByTestId(`tank-${tank.id}`));
    expect(await screen.findByTestId('tank-specs')).toBeTruthy();
    answerAlerts();
    fireEvent.press(screen.getByTestId('tank-actions'));

    expect(await screen.findByText('Bac gardé')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Ancien bac')).toBeNull());
    expect(screen).toHavePathname('/tanks');
    expect(mockFake.tanks.tanks.map((remaining) => remaining.name)).toEqual(['Bac gardé']);
  });

  it('uploads a photo through a pre-signed URL and makes it the cover', async () => {
    const householdId = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}` });

    expect(await screen.findByText('Pas encore de photo.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('photos-add'));
    answerAlerts('Galerie');
    fireEvent.press(await screen.findByTestId('gallery-add'));

    const photo = await waitFor(() => {
      const uploaded = mockFake.tanks.photos[0];
      expect(uploaded).toBeDefined();

      return uploaded;
    });
    expect(lastRequest('POST', /\/photos\/upload-url$/)).toEqual({
      contentType: 'image/jpeg',
      sizeBytes: PICKED_SIZE,
    });
    expect(FileSystem.uploadAsync).toHaveBeenCalledWith(expect.stringContaining('http://storage.test/'), 'file:///cache/picked.jpg', {
      httpMethod: 'PUT',
      uploadType: 0,
      headers: { 'Content-Type': 'image/jpeg' },
    });

    fireEvent.press(await screen.findByTestId(`gallery-photo-${photo?.id ?? 0}`));
    expect(await screen.findByText('Ajoutée par Camille le 2 novembre 2026')).toBeTruthy();
    fireEvent.press(screen.getByTestId('photo-set-cover'));
    expect(await screen.findByText('Photo de couverture')).toBeTruthy();
    expect(mockFake.tanks.tanks[0]?.coverPhotoId).toBe(photo?.id);

    fireEvent.changeText(screen.getByTestId('photo-caption'), 'Après le rescape');
    fireEvent.press(screen.getByTestId('photo-caption-save'));
    await waitFor(() => expect(mockFake.tanks.photos[0]?.caption).toBe('Après le rescape'));
  });

  it('says why an upload failed, and retries the same picture', async () => {
    const householdId = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    jest.mocked(FileSystem.uploadAsync).mockResolvedValueOnce({
      status: 500,
      body: '',
      headers: {},
      mimeType: null,
    });
    answerAlerts('Galerie');
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}/photos` });

    fireEvent.press(await screen.findByTestId('gallery-add'));
    expect(await screen.findByText('L’envoi a échoué. Vérifie ta connexion et réessaie.')).toBeTruthy();
    expect(mockFake.tanks.photos).toHaveLength(0);

    fireEvent.press(screen.getByTestId('gallery-upload-retry'));
    await waitFor(() => expect(mockFake.tanks.photos).toHaveLength(1));
    expect(screen.queryByTestId('gallery-upload-error')).toBeNull();
  });

  it('deletes a photo, which clears the cover', async () => {
    const householdId = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    const photo = mockFake.tanks.addPhoto(tank.id, mockFake.accountNamed('Camille').id);
    tank.coverPhotoId = photo.id;
    answerAlerts();
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}` });

    fireEvent.press(await screen.findByTestId(`strip-photo-${photo.id}`));
    fireEvent.press(await screen.findByTestId('photo-delete'));

    expect(await screen.findByText('Pas encore de photo.')).toBeTruthy();
    expect(mockFake.tanks.tanks[0]?.coverPhotoId).toBeNull();
  });

  it('adds an animal from the catalogue, then takes it out keeping the history', async () => {
    const householdId = signIn();
    const tank = mockFake.tanks.addTank(householdId, { name: 'Salon' });
    mockFake.tanks.addEntry(tank.id, 'plants', 'Microsorum pteropus', 3);
    renderRouter('./app', { initialUrl: `/tanks/${tank.id}` });

    expect(await screen.findByText('Fougère de Java')).toBeTruthy();
    expect(screen.getByText('Aucun animal pour l’instant.')).toBeTruthy();
    fireEvent.press(screen.getByTestId('animals-add'));

    fireEvent.press(await screen.findByTestId('group-INVERTEBRATE'));
    // The previous results stay up while the filtered ones load.
    await waitFor(() => expect(screen.queryByText('Combattant')).toBeNull());
    expect(screen.getByText('Crevette red cherry')).toBeTruthy();
    fireEvent.press(screen.getByTestId('group-all'));
    fireEvent.changeText(screen.getByTestId('species-search'), 'néon');
    await waitFor(() => expect(screen.queryByText('Combattant')).toBeNull());
    const neon = mockFake.tanks.species.find((species) => species.commonName === 'Néon bleu');
    fireEvent.press(screen.getByTestId(`species-${neon?.id ?? 0}`));
    fireEvent.changeText(screen.getByTestId('inhabitant-quantity'), '0');
    expect(screen.getByText('Indique un nombre entier entre 1 et 10 000.')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('inhabitant-quantity'), '12');
    fireEvent.press(screen.getByTestId('inhabitant-submit'));

    await waitFor(() => expect(screen).toHavePathname(`/tanks/${tank.id}`));
    expect(await screen.findByText('× 12')).toBeTruthy();
    expect(screen.getByText('Néon bleu')).toBeTruthy();
    const entry = mockFake.tanks.entries.find((candidate) => candidate.kind === 'animals');
    expect(entry).toMatchObject({
      speciesId: neon?.id,
      quantity: 12,
    });

    fireEvent.press(screen.getByTestId(`inhabitant-${entry?.id ?? 0}-toggle`));
    fireEvent.press(screen.getByTestId(`inhabitant-${entry?.id ?? 0}-remove`));
    expect(await screen.findByText('Aucun animal pour l’instant.')).toBeTruthy();
    expect(entry?.removedAt).toEqual(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));

    fireEvent.press(screen.getByTestId('animals-show-removed'));
    expect(await screen.findByText(/^Retiré le /)).toBeTruthy();
    expect(screen.getByText('Néon bleu')).toBeTruthy();
  });

  it('says so when a tank no longer exists', async () => {
    signIn();
    renderRouter('./app', { initialUrl: '/tanks/999' });

    expect(await screen.findByText('Ce bac n’existe plus.')).toBeTruthy();
  });

  it('offers a retry when the tanks cannot be loaded', async () => {
    signIn();
    mockFake.failing = /\/tanks$/;
    renderRouter('./app', { initialUrl: '/tanks' });

    // One automatic retry first, a second apart.
    expect(await screen.findByText('Impossible de charger tes bacs.', {}, { timeout: 4000 })).toBeTruthy();
    mockFake.failing = null;
    fireEvent.press(screen.getByText('Réessayer'));

    expect(await screen.findByTestId('tanks-empty')).toBeTruthy();
  });
});
