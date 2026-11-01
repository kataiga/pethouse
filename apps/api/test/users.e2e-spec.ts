import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

describe('Users (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/users/me returns the authenticated user', async () => {
    const session = await registerAccount(app, { displayName: 'Alex' });

    const response = await request(app.getHttpServer())
      .get('/api/users/me')
      .set(bearer(session.accessToken))
      .expect(200);

    expect(response.body).toEqual({
      id: session.userId,
      email: session.account.email,
      displayName: 'Alex',
      preferredLanguage: 'fr',
      createdAt: expect.any(String),
    });
  });

  it('PATCH /api/users/me updates the profile and the change is visible afterwards', async () => {
    const session = await registerAccount(app);

    const patched = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set(bearer(session.accessToken))
      .send({
        displayName: 'Renamed',
        preferredLanguage: 'en',
      })
      .expect(200);
    expect(patched.body).toMatchObject({
      displayName: 'Renamed',
      preferredLanguage: 'en',
    });

    const me = await request(app.getHttpServer()).get('/api/users/me').set(bearer(session.accessToken)).expect(200);
    expect(me.body.displayName).toBe('Renamed');
  });

  it('PATCH /api/users/me rejects an unknown language and unknown fields', async () => {
    const session = await registerAccount(app);

    const response = await request(app.getHttpServer())
      .patch('/api/users/me')
      .set(bearer(session.accessToken))
      .send({
        preferredLanguage: 'de',
        email: 'new@example.com',
      })
      .expect(400);

    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.stringContaining('preferredLanguage'),
      'property email should not exist',
    ]));
  });
});
