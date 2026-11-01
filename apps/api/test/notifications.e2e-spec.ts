import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

describe('Devices (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, refreshes, moves and revokes Expo push tokens', async () => {
    const alex = await registerAccount(app);
    const sam = await registerAccount(app);
    const token = `ExponentPushToken[devices-${Date.now()}]`;

    const registered = await request(app.getHttpServer())
      .put('/api/users/me/devices')
      .set(bearer(alex.accessToken))
      .send({
        expoPushToken: token,
        platform: 'IOS',
      })
      .expect(200);
    expect(registered.body).toEqual({
      id: expect.any(Number),
      expoPushToken: token,
      platform: 'IOS',
      lastSeenAt: expect.any(String),
    });

    const refreshed = await request(app.getHttpServer())
      .put('/api/users/me/devices')
      .set(bearer(alex.accessToken))
      .send({
        expoPushToken: token,
        platform: 'IOS',
      })
      .expect(200);
    expect(refreshed.body.id).toBe(registered.body.id);

    // The same installation signs in with another account: the token follows it.
    await request(app.getHttpServer())
      .put('/api/users/me/devices')
      .set(bearer(sam.accessToken))
      .send({
        expoPushToken: token,
        platform: 'IOS',
      })
      .expect(200);
    const alexDevices = await request(app.getHttpServer())
      .get('/api/users/me/devices')
      .set(bearer(alex.accessToken))
      .expect(200);
    expect(alexDevices.body).toEqual([]);
    await request(app.getHttpServer())
      .delete(`/api/users/me/devices/${registered.body.id}`)
      .set(bearer(alex.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/users/me/devices/${registered.body.id}`)
      .set(bearer(sam.accessToken))
      .expect(204);
    const samDevices = await request(app.getHttpServer())
      .get('/api/users/me/devices')
      .set(bearer(sam.accessToken))
      .expect(200);
    expect(samDevices.body).toEqual([]);
  });

  it('refuses anything that is not an Expo push token or a known platform', async () => {
    const session = await registerAccount(app);

    for (const body of [
      {
        expoPushToken: 'fcm-token-abc',
        platform: 'ANDROID',
      },
      {
        expoPushToken: 'ExponentPushToken[]',
        platform: 'ANDROID',
      },
      {
        expoPushToken: 'ExponentPushToken[abc]',
        platform: 'WINDOWS',
      },
    ]) {
      await request(app.getHttpServer())
        .put('/api/users/me/devices')
        .set(bearer(session.accessToken))
        .send(body)
        .expect(400);
    }

    await request(app.getHttpServer())
      .put('/api/users/me/devices')
      .send({
        expoPushToken: 'ExponentPushToken[abc]',
        platform: 'ANDROID',
      })
      .expect(401);
  });
});
