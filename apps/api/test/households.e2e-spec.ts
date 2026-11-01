import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Language } from '../src/common/enums/language.enum';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

describe('Households (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createHousehold (session: TestSession, name = 'Test home'): Promise<number> {
    const response = await request(app.getHttpServer())
      .post('/api/households')
      .set(bearer(session.accessToken))
      .send({
        name,
        timezone: 'Europe/Paris',
      })
      .expect(201);

    return response.body.id;
  }

  async function join (householdId: number, owner: TestSession, member: TestSession): Promise<void> {
    const invite = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/invites`)
      .set(bearer(owner.accessToken))
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/invites/${invite.body.code}/redeem`)
      .set(bearer(member.accessToken))
      .expect(200);
  }

  it('gives every new account a household named in its language, with the chosen time zone', async () => {
    const french = await registerAccount(app);
    const english = await registerAccount(app, {
      preferredLanguage: Language.EN,
      timezone: 'America/Montreal',
    });

    const fr = await request(app.getHttpServer()).get('/api/households').set(bearer(french.accessToken)).expect(200);
    const en = await request(app.getHttpServer()).get('/api/households').set(bearer(english.accessToken)).expect(200);

    expect(fr.body).toEqual([expect.objectContaining({
      name: 'Mon foyer',
      timezone: 'Europe/Paris',
      role: 'OWNER',
    })]);
    expect(en.body).toEqual([expect.objectContaining({
      name: 'My household',
      timezone: 'America/Montreal',
      role: 'OWNER',
    })]);
  });

  it('rejects an unknown time zone at registration and at creation', async () => {
    const session = await registerAccount(app);

    await request(app.getHttpServer())
      .post('/api/households')
      .set(bearer(session.accessToken))
      .send({
        name: 'Nope',
        timezone: 'Mars/Olympus',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `tz-${Date.now()}@example.com`,
        password: 'correct horse battery staple',
        displayName: 'Tz',
        timezone: 'CET+1',
      })
      .expect(400);
  });

  it('hides a household from non-members with a 404, not a 403', async () => {
    const owner = await registerAccount(app);
    const stranger = await registerAccount(app);
    const householdId = await createHousehold(owner);

    await request(app.getHttpServer()).get(`/api/households/${householdId}`).set(bearer(owner.accessToken)).expect(200);
    const response = await request(app.getHttpServer())
      .get(`/api/households/${householdId}`)
      .set(bearer(stranger.accessToken))
      .expect(404);
    expect(response.body.message).toBe('Household not found');
    await request(app.getHttpServer()).get('/api/households/abc').set(bearer(stranger.accessToken)).expect(404);
  });

  it('lets owners update and forbids members', async () => {
    const owner = await registerAccount(app);
    const member = await registerAccount(app);
    const householdId = await createHousehold(owner);
    await join(householdId, owner, member);

    const updated = await request(app.getHttpServer())
      .patch(`/api/households/${householdId}`)
      .set(bearer(owner.accessToken))
      .send({
        name: 'Renamed',
        timezone: 'Europe/Brussels',
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      name: 'Renamed',
      timezone: 'Europe/Brussels',
      role: 'OWNER',
    });

    const forbidden = await request(app.getHttpServer())
      .patch(`/api/households/${householdId}`)
      .set(bearer(member.accessToken))
      .send({ name: 'Hijacked' })
      .expect(403);
    expect(forbidden.body.message).toContain('OWNER');
  });

  it('lists members with their roles, in joining order', async () => {
    const owner = await registerAccount(app, { displayName: 'Owner' });
    const member = await registerAccount(app, { displayName: 'Member' });
    const householdId = await createHousehold(owner);
    await join(householdId, owner, member);

    const response = await request(app.getHttpServer())
      .get(`/api/households/${householdId}/members`)
      .set(bearer(member.accessToken))
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        userId: owner.userId,
        displayName: 'Owner',
        email: owner.account.email,
        role: 'OWNER',
      }),
      expect.objectContaining({
        userId: member.userId,
        displayName: 'Member',
        role: 'MEMBER',
      }),
    ]);
  });

  describe('ownership rules', () => {
    it('the last owner can neither leave nor be demoted, but can delete the household', async () => {
      const owner = await registerAccount(app);
      const member = await registerAccount(app);
      const householdId = await createHousehold(owner);
      await join(householdId, owner, member);

      const leave = await request(app.getHttpServer())
        .delete(`/api/households/${householdId}/members/${owner.userId}`)
        .set(bearer(owner.accessToken))
        .expect(409);
      expect(leave.body.message).toBe('A household must keep at least one owner');

      await request(app.getHttpServer())
        .patch(`/api/households/${householdId}/members/${owner.userId}`)
        .set(bearer(owner.accessToken))
        .send({ role: 'MEMBER' })
        .expect(409);

      await request(app.getHttpServer())
        .delete(`/api/households/${householdId}`)
        .set(bearer(owner.accessToken))
        .expect(204);
      await request(app.getHttpServer())
        .get(`/api/households/${householdId}`)
        .set(bearer(owner.accessToken))
        .expect(404);
      await request(app.getHttpServer())
        .get(`/api/households/${householdId}`)
        .set(bearer(member.accessToken))
        .expect(404);
    });

    it('ownership transfers by promoting, then the former owner can step down and leave', async () => {
      const owner = await registerAccount(app);
      const member = await registerAccount(app);
      const householdId = await createHousehold(owner);
      await join(householdId, owner, member);

      const promoted = await request(app.getHttpServer())
        .patch(`/api/households/${householdId}/members/${member.userId}`)
        .set(bearer(owner.accessToken))
        .send({ role: 'OWNER' })
        .expect(200);
      expect(promoted.body).toMatchObject({
        userId: member.userId,
        role: 'OWNER',
      });

      await request(app.getHttpServer())
        .delete(`/api/households/${householdId}/members/${owner.userId}`)
        .set(bearer(owner.accessToken))
        .expect(204);

      await request(app.getHttpServer())
        .get(`/api/households/${householdId}`)
        .set(bearer(owner.accessToken))
        .expect(404);
      const remaining = await request(app.getHttpServer())
        .get(`/api/households/${householdId}/members`)
        .set(bearer(member.accessToken))
        .expect(200);
      expect(remaining.body).toHaveLength(1);
    });

    it('a member can leave, but cannot remove someone else', async () => {
      const owner = await registerAccount(app);
      const member = await registerAccount(app);
      const other = await registerAccount(app);
      const householdId = await createHousehold(owner);
      await join(householdId, owner, member);
      await join(householdId, owner, other);

      await request(app.getHttpServer())
        .delete(`/api/households/${householdId}/members/${other.userId}`)
        .set(bearer(member.accessToken))
        .expect(403);
      await request(app.getHttpServer())
        .delete(`/api/households/${householdId}/members/${member.userId}`)
        .set(bearer(member.accessToken))
        .expect(204);
      await request(app.getHttpServer())
        .get(`/api/households/${householdId}`)
        .set(bearer(member.accessToken))
        .expect(404);

      // An owner removes anyone.
      await request(app.getHttpServer())
        .delete(`/api/households/${householdId}/members/${other.userId}`)
        .set(bearer(owner.accessToken))
        .expect(204);
    });
  });
});
