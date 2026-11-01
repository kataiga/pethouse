import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

describe('Invites (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function ownHousehold (session: TestSession): Promise<number> {
    const response = await request(app.getHttpServer())
      .get('/api/households')
      .set(bearer(session.accessToken))
      .expect(200);

    return response.body[0].id;
  }

  async function createInvite (
    session: TestSession,
    householdId: number,
    body: object = {},
  ): Promise<Record<string, unknown>> {
    const response = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/invites`)
      .set(bearer(session.accessToken))
      .send(body)
      .expect(201);

    return response.body;
  }

  it('an owner creates a deep-link invite; a second account redeems it and sees the household', async () => {
    const owner = await registerAccount(app);
    const guest = await registerAccount(app);
    const householdId = await ownHousehold(owner);

    const invite = await createInvite(owner, householdId, {
      expiresInHours: 24,
      maxUses: 3,
    });
    expect(invite).toMatchObject({
      code: expect.stringMatching(/^[A-Za-z0-9_-]{12}$/),
      url: `pethouse://invite/${invite.code}`,
      maxUses: 3,
      useCount: 0,
      revokedAt: null,
      active: true,
    });

    const redeemed = await request(app.getHttpServer())
      .post(`/api/invites/${invite.code}/redeem`)
      .set(bearer(guest.accessToken))
      .expect(200);
    expect(redeemed.body).toMatchObject({
      id: householdId,
      role: 'MEMBER',
    });

    const guestHouseholds = await request(app.getHttpServer())
      .get('/api/households')
      .set(bearer(guest.accessToken))
      .expect(200);
    expect(guestHouseholds.body.map((h: { id: number }) => h.id)).toContain(householdId);

    const ownerView = await request(app.getHttpServer())
      .get(`/api/households/${householdId}/invites`)
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(ownerView.body[0]).toMatchObject({
      id: invite.id,
      useCount: 1,
    });
  });

  it('redeeming twice is a no-op that does not consume a second use', async () => {
    const owner = await registerAccount(app);
    const guest = await registerAccount(app);
    const householdId = await ownHousehold(owner);
    const invite = await createInvite(owner, householdId, { maxUses: 1 });

    await request(app.getHttpServer())
      .post(`/api/invites/${invite.code}/redeem`)
      .set(bearer(guest.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/invites/${invite.code}/redeem`)
      .set(bearer(guest.accessToken))
      .expect(200);

    const list = await request(app.getHttpServer())
      .get(`/api/households/${householdId}/invites`)
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(list.body[0].useCount).toBe(1);
  });

  it('an exhausted, a revoked and an unknown code all answer the same 404', async () => {
    const owner = await registerAccount(app);
    const first = await registerAccount(app);
    const second = await registerAccount(app);
    const householdId = await ownHousehold(owner);

    const single = await createInvite(owner, householdId, { maxUses: 1 });
    await request(app.getHttpServer())
      .post(`/api/invites/${single.code}/redeem`)
      .set(bearer(first.accessToken))
      .expect(200);
    const exhausted = await request(app.getHttpServer())
      .post(`/api/invites/${single.code}/redeem`)
      .set(bearer(second.accessToken))
      .expect(404);

    const revocable = await createInvite(owner, householdId);
    const revoked = await request(app.getHttpServer())
      .delete(`/api/households/${householdId}/invites/${revocable.id}`)
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(revoked.body).toMatchObject({
      active: false,
      revokedAt: expect.any(String),
    });
    const afterRevoke = await request(app.getHttpServer())
      .post(`/api/invites/${revocable.code}/redeem`)
      .set(bearer(second.accessToken))
      .expect(404);

    const unknown = await request(app.getHttpServer())
      .post('/api/invites/definitely-not/redeem')
      .set(bearer(second.accessToken))
      .expect(404);

    expect(new Set([exhausted.body.message, afterRevoke.body.message, unknown.body.message]).size).toBe(1);
  });

  it('only owners manage invites', async () => {
    const owner = await registerAccount(app);
    const member = await registerAccount(app);
    const householdId = await ownHousehold(owner);
    const invite = await createInvite(owner, householdId);
    await request(app.getHttpServer())
      .post(`/api/invites/${invite.code}/redeem`)
      .set(bearer(member.accessToken))
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/households/${householdId}/invites`)
      .set(bearer(member.accessToken))
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .get(`/api/households/${householdId}/invites`)
      .set(bearer(member.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/api/households/${householdId}/invites/${invite.id}`)
      .set(bearer(member.accessToken))
      .expect(403);
  });

  it('validates the invite options', async () => {
    const owner = await registerAccount(app);
    const householdId = await ownHousehold(owner);

    const response = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/invites`)
      .set(bearer(owner.accessToken))
      .send({
        expiresInHours: 0,
        maxUses: 1000,
      })
      .expect(400);
    expect(response.body.details).toEqual(expect.arrayContaining([
      expect.stringContaining('expiresInHours'),
      expect.stringContaining('maxUses'),
    ]));
  });
});
