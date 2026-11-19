import { createApiClient } from '@pethouse/api-client';
import {
  type PushPlatform, registerDevice, unregisterDevice,
} from './registration';

describe('device registration', () => {
  const calls: { method: string;
    path: string;
    body: unknown }[] = [];
  let status = 200;
  const api = createApiClient({
    baseUrl: 'http://api.test',
    fetch: async (request: Request) => {
      const text = request.method === 'DELETE' ? '' : await request.text();
      calls.push({
        method: request.method,
        path: new URL(request.url).pathname,
        body: text === '' ? undefined : JSON.parse(text),
      });

      return new Response(status === 204 ? null : JSON.stringify({
        id: 5,
        expoPushToken: 'ExponentPushToken[abc]',
        platform: 'ANDROID',
        lastSeenAt: '2026-11-19T08:00:00.000Z',
      }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    },
  });

  function phone (overrides: Partial<PushPlatform> = {}): PushPlatform & { asked: jest.Mock } {
    const asked = jest.fn(() => Promise.resolve({ granted: true }));

    return {
      platform: 'ANDROID',
      canReceivePush: true,
      projectId: 'project-1',
      permission: () => Promise.resolve({
        granted: false,
        canAskAgain: true,
      }),
      requestPermission: asked,
      expoPushToken: () => Promise.resolve('ExponentPushToken[abc]'),
      ...overrides,
      asked,
    };
  }

  beforeEach(() => {
    calls.length = 0;
    status = 200;
  });

  it('never asks on its own: an undecided phone stays undetermined', async () => {
    const undecided = phone();

    await expect(registerDevice(api, undecided, false)).resolves.toEqual({
      status: 'undetermined',
      deviceId: null,
    });
    expect(undecided.asked).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('asks when told to, then registers the token for this platform', async () => {
    const undecided = phone();

    await expect(registerDevice(api, undecided, true)).resolves.toEqual({
      status: 'granted',
      deviceId: 5,
    });
    expect(undecided.asked).toHaveBeenCalledTimes(1);
    expect(calls).toEqual([{
      method: 'PUT',
      path: '/api/users/me/devices',
      body: {
        expoPushToken: 'ExponentPushToken[abc]',
        platform: 'ANDROID',
      },
    }]);
  });

  it('refreshes the registration silently once permission was given', async () => {
    const allowed = phone({
      permission: () => Promise.resolve({
        granted: true,
        canAskAgain: true,
      }),
    });

    await expect(registerDevice(api, allowed, false)).resolves.toMatchObject({ status: 'granted' });
    expect(calls).toHaveLength(1);
  });

  it('reports a refusal the app can no longer overturn', async () => {
    const refused = phone({
      permission: () => Promise.resolve({
        granted: false,
        canAskAgain: false,
      }),
    });

    await expect(registerDevice(api, refused, true)).resolves.toMatchObject({ status: 'denied' });
    expect(refused.asked).not.toHaveBeenCalled();

    const refusedNow = phone({ requestPermission: () => Promise.resolve({ granted: false }) });
    await expect(registerDevice(api, refusedNow, true)).resolves.toMatchObject({ status: 'denied' });
  });

  it('tells a build without push configuration apart from a refusal', async () => {
    const allowed = {
      permission: () => Promise.resolve({
        granted: true,
        canAskAgain: true,
      }),
    };

    await expect(registerDevice(api, phone({
      ...allowed,
      projectId: null,
    }), false)).resolves.toMatchObject({ status: 'unconfigured' });
    await expect(registerDevice(api, phone({
      ...allowed,
      expoPushToken: () => Promise.reject(new Error('Default FirebaseApp is not initialized')),
    }), false)).resolves.toMatchObject({ status: 'unconfigured' });
    await expect(registerDevice(api, phone({ canReceivePush: false }), true)).resolves.toMatchObject({
      status: 'unsupported',
    });
    expect(calls).toEqual([]);

    status = 500;
    await expect(registerDevice(api, phone(allowed), false)).resolves.toEqual({
      status: 'failed',
      deviceId: null,
    });
  });

  it('removes this device on sign-out, and does nothing without one', async () => {
    status = 204;

    await unregisterDevice(api, 5);
    await unregisterDevice(api, null);

    expect(calls).toEqual([{
      method: 'DELETE',
      path: '/api/users/me/devices/5',
      body: undefined,
    }]);
  });
});
