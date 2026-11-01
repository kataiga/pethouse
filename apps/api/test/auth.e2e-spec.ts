import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount, uniqueAccount,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('creates the account and returns the user with a token pair', async () => {
      const account = uniqueAccount({ email: 'Mixed.Case@Example.com' });
      const response = await request(app.getHttpServer()).post('/api/auth/register').send(account).expect(201);

      expect(response.body.user).toEqual({
        id: expect.any(Number),
        email: 'mixed.case@example.com',
        displayName: account.displayName,
        preferredLanguage: 'fr',
        createdAt: expect.any(String),
      });
      expect(response.body.user).not.toHaveProperty('passwordHash');
      expect(response.body.tokens).toEqual({
        accessToken: expect.any(String),
        accessExpiresInSeconds: expect.any(Number),
        refreshToken: expect.any(String),
        refreshExpiresInSeconds: expect.any(Number),
      });
    });

    it('rejects a duplicate email with 409, whatever the case', async () => {
      const { account } = await registerAccount(app);

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          ...account,
          email: account.email.toUpperCase(),
        })
        .expect(409);

      expect(response.body.error).toBe('Conflict');
    });

    it('validates the body', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'short',
          displayName: '',
          preferredLanguage: 'de',
          admin: true,
        })
        .expect(400);

      expect(response.body.message).toBe('Validation failed');
      expect(response.body.details).toEqual(expect.arrayContaining([
        expect.stringContaining('email'),
        expect.stringContaining('password'),
        expect.stringContaining('displayName'),
        expect.stringContaining('preferredLanguage'),
        'property admin should not exist',
      ]));
    });
  });

  describe('POST /api/auth/login', () => {
    it('opens a session with the right password', async () => {
      const { account } = await registerAccount(app);

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: account.email,
          password: account.password,
        })
        .expect(200);

      expect(response.body.user.email).toBe(account.email);
      expect(response.body.tokens.accessToken).toEqual(expect.any(String));
    });

    it('answers 401 with the same message for a wrong password and an unknown email', async () => {
      const { account } = await registerAccount(app);

      const wrong = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: account.email,
          password: 'nope nope nope',
        })
        .expect(401);
      const unknown = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nobody@example.com',
          password: 'nope nope nope',
        })
        .expect(401);

      expect(wrong.body.message).toBe(unknown.body.message);
    });
  });

  describe('access token', () => {
    it('is required on protected routes', async () => {
      const response = await request(app.getHttpServer()).get('/api/users/me').expect(401);

      expect(response.body).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
        path: '/api/users/me',
      });
    });

    it('is rejected when malformed', async () => {
      await request(app.getHttpServer()).get('/api/users/me').set(bearer('not.a.jwt')).expect(401);
    });

    it('is not required on public routes', async () => {
      await request(app.getHttpServer()).get('/api/health').expect(200);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates the pair: the new one works, the old one is dead', async () => {
      const session = await registerAccount(app);

      const rotated = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      expect(rotated.body.tokens.refreshToken).not.toBe(session.refreshToken);
      await request(app.getHttpServer()).get('/api/users/me').set(bearer(rotated.body.tokens.accessToken)).expect(200);
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);
    });

    it('revokes every session when a rotated-out token is replayed', async () => {
      const session = await registerAccount(app);
      const rotated = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(200);

      // Replay of the old token: detected as a leak.
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: session.refreshToken })
        .expect(401);

      // The legitimately rotated token is now dead too.
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: rotated.body.tokens.refreshToken })
        .expect(401);
    });

    it('rejects a token signed with the access secret', async () => {
      const session = await registerAccount(app);

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: session.accessToken })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes the refresh token and answers 204, even twice', async () => {
      const session = await registerAccount(app);

      const body = { refreshToken: session.refreshToken };

      await request(app.getHttpServer()).post('/api/auth/logout').send(body).expect(204);
      await request(app.getHttpServer()).post('/api/auth/refresh').send(body).expect(401);
      await request(app.getHttpServer()).post('/api/auth/logout').send(body).expect(204);
    });

    it('answers 204 for garbage', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .send({ refreshToken: 'definitely-not-a-token' })
        .expect(204);
    });
  });
});
