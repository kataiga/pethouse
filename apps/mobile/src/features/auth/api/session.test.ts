import { createApiClient } from '@pethouse/api-client';
import {
  FakeApi, MemoryTokenStore,
} from '@/test-support/fake-api';
import { Session } from './session';

describe('Session', () => {
  let fake: FakeApi;
  let store: MemoryTokenStore;
  let clock: number;
  let session: Session;

  beforeEach(() => {
    fake = new FakeApi();
    store = new MemoryTokenStore();
    clock = Date.parse('2026-11-02T08:00:00Z');
    session = new Session(createApiClient({
      baseUrl: 'http://api.test',
      fetch: fake.fetch,
    }), store, () => clock);
  });

  it('starts signed out when nothing is stored, without calling the server', async () => {
    await expect(session.restore()).resolves.toEqual({ status: 'signedOut' });
    expect(fake.requests).toEqual([]);
  });

  it('resumes from the stored refresh token and rotates it', async () => {
    const stored = fake.seedSignedIn('Camille');
    store.value = stored;

    const state = await session.restore();

    expect(state).toMatchObject({
      status: 'signedIn',
      user: { displayName: 'Camille' },
    });
    expect(store.value).not.toBe(stored);
    expect(await session.accessTokenForRequest()).toMatch(/^access-/);
  });

  it('forgets a refresh token the server refuses', async () => {
    store.value = 'refresh-unknown';

    await expect(session.restore()).resolves.toEqual({ status: 'signedOut' });
    expect(store.value).toBeNull();
  });

  it('keeps the stored token when the server cannot be reached at launch, and retries', async () => {
    store.value = fake.seedSignedIn();
    fake.offline = true;

    await expect(session.restore()).resolves.toEqual({ status: 'unreachable' });
    expect(store.value).not.toBeNull();

    fake.offline = false;
    const seen: string[] = [];
    session.subscribe((state) => seen.push(state.status));
    await expect(session.restore()).resolves.toMatchObject({ status: 'signedIn' });
    // A retry never goes back through `restoring`.
    expect(seen).toEqual(['signedIn']);
  });

  it('renews shortly before expiry, once for concurrent requests', async () => {
    store.value = fake.seedSignedIn();
    await session.restore();
    const first = await session.accessTokenForRequest();
    const refreshesBefore = fake.requests.filter((request) => request.path === '/api/auth/refresh').length;

    clock += 14 * 60 * 1000 + 30 * 1000;
    const [a, b, c] = await Promise.all([
      session.accessTokenForRequest(),
      session.accessTokenForRequest(),
      session.accessTokenForRequest(),
    ]);

    expect(a).not.toBe(first);
    expect(new Set([a, b, c]).size).toBe(1);
    expect(fake.requests.filter((request) => request.path === '/api/auth/refresh').length).toBe(refreshesBefore + 1);
  });

  it('serves the same access token while it is fresh', async () => {
    store.value = fake.seedSignedIn();
    await session.restore();

    expect(await session.accessTokenForRequest()).toBe(await session.accessTokenForRequest());
  });

  it('signs out on the server and locally, and notifies listeners', async () => {
    store.value = fake.seedSignedIn();
    await session.restore();
    const seen: string[] = [];
    session.subscribe((state) => seen.push(state.status));
    const refreshToken = store.value;

    await session.signOut();

    expect(fake.requests.at(-1)).toMatchObject({
      method: 'POST',
      path: '/api/auth/logout',
      body: { refreshToken },
    });
    expect(store.value).toBeNull();
    expect(seen).toEqual(['signedOut']);
    expect(await session.accessTokenForRequest()).toBeNull();
  });

  it('still signs out locally when the server cannot be reached', async () => {
    store.value = fake.seedSignedIn();
    await session.restore();
    fake.offline = true;

    await session.signOut();

    expect(session.getState()).toEqual({ status: 'signedOut' });
    expect(store.value).toBeNull();
  });
});
