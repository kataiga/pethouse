import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

interface SubtypeRow {
  id: number;
  tankType: string;
  slug: string;
  isSystem: boolean;
}

describe('Tanks (e2e)', () => {
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

  async function subtypes (session: TestSession, tankType?: string): Promise<SubtypeRow[]> {
    const response = await request(app.getHttpServer())
      .get('/api/tank-subtypes')
      .query(tankType ? { tankType } : {})
      .set(bearer(session.accessToken))
      .expect(200);

    return response.body;
  }

  it('lists the seeded subtypes, filtered by tank type', async () => {
    const session = await registerAccount(app);

    const all = await subtypes(session);
    const aquarium = await subtypes(session, 'AQUARIUM');

    expect(all.length).toBeGreaterThanOrEqual(17);
    expect(all.every((row) => row.isSystem)).toBe(true);
    expect(aquarium.map((row) => row.slug)).toEqual(expect.arrayContaining(['freshwater', 'planted', 'reef']));
    expect(aquarium.every((row) => row.tankType === 'AQUARIUM')).toBe(true);
    await request(app.getHttpServer())
      .get('/api/tank-subtypes')
      .query({ tankType: 'POND' })
      .set(bearer(session.accessToken))
      .expect(400);
  });

  it('creates a tank with a system subtype and returns the full shape', async () => {
    const session = await registerAccount(app);
    const householdId = await ownHousehold(session);
    const planted = (await subtypes(session, 'AQUARIUM')).find((row) => row.slug === 'planted');

    const response = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Living room',
        tankType: 'AQUARIUM',
        subtypeId: planted?.id,
        volumeLiters: 120.5,
        widthCm: 100,
        startedAt: '2026-01-15',
      })
      .expect(201);

    expect(response.body).toEqual({
      id: expect.any(Number),
      householdId,
      name: 'Living room',
      tankType: 'AQUARIUM',
      subtype: expect.objectContaining({
        slug: 'planted',
        isSystem: true,
      }),
      volumeLiters: 120.5,
      widthCm: 100,
      heightCm: null,
      depthCm: null,
      substrate: null,
      startedAt: '2026-01-15',
      description: null,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });

    const listed = await request(app.getHttpServer())
      .get(`/api/households/${householdId}/tanks`)
      .set(bearer(session.accessToken))
      .expect(200);
    expect(listed.body).toHaveLength(1);
    expect(listed.body[0].startedAt).toBe('2026-01-15');
  });

  it('refuses a subtype of another tank type and validates the body', async () => {
    const session = await registerAccount(app);
    const householdId = await ownHousehold(session);
    const desert = (await subtypes(session, 'TERRARIUM')).find((row) => row.slug === 'desert');

    const mismatch = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Wrong',
        tankType: 'AQUARIUM',
        subtypeId: desert?.id,
      })
      .expect(400);
    expect(mismatch.body.message).toContain('subtype');

    const invalid = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: '',
        tankType: 'POND',
        volumeLiters: -1,
        startedAt: '15/01/2026',
      })
      .expect(400);
    expect(invalid.body.details).toEqual(expect.arrayContaining([
      expect.stringContaining('name'),
      expect.stringContaining('tankType'),
      expect.stringContaining('volumeLiters'),
      expect.stringContaining('startedAt'),
    ]));
  });

  it('hides tanks of other households behind a 404', async () => {
    const owner = await registerAccount(app);
    const stranger = await registerAccount(app);
    const householdId = await ownHousehold(owner);
    const created = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/tanks`)
      .set(bearer(owner.accessToken))
      .send({
        name: 'Private',
        tankType: 'TERRARIUM',
      })
      .expect(201);

    await request(app.getHttpServer()).get(`/api/tanks/${created.body.id}`).set(bearer(owner.accessToken)).expect(200);
    const hidden = await request(app.getHttpServer())
      .get(`/api/tanks/${created.body.id}`)
      .set(bearer(stranger.accessToken))
      .expect(404);
    expect(hidden.body.message).toBe('Tank not found');
    await request(app.getHttpServer())
      .get(`/api/households/${householdId}/tanks`)
      .set(bearer(stranger.accessToken))
      .expect(404);
    await request(app.getHttpServer()).get('/api/tanks/999999').set(bearer(owner.accessToken)).expect(404);
  });

  it('updates a tank, clears fields with null, and deletes it', async () => {
    const session = await registerAccount(app);
    const householdId = await ownHousehold(session);
    const reef = (await subtypes(session, 'AQUARIUM')).find((row) => row.slug === 'reef');
    const created = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Nano',
        tankType: 'AQUARIUM',
        subtypeId: reef?.id,
        substrate: 'Sand',
        volumeLiters: 30,
      })
      .expect(201);
    const tankId: number = created.body.id;

    const updated = await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Nano reef',
        subtypeId: null,
        substrate: null,
        heightCm: 35,
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      name: 'Nano reef',
      subtype: null,
      substrate: null,
      volumeLiters: 30,
      heightCm: 35,
    });

    await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}`)
      .set(bearer(session.accessToken))
      .send({ tankType: 'TERRARIUM' })
      .expect(400);

    await request(app.getHttpServer()).delete(`/api/tanks/${tankId}`).set(bearer(session.accessToken)).expect(204);
    await request(app.getHttpServer()).get(`/api/tanks/${tankId}`).set(bearer(session.accessToken)).expect(404);
  });

  describe('custom subtypes', () => {
    it('are scoped to their household, usable by its tanks, and refused elsewhere', async () => {
      const alice = await registerAccount(app);
      const bob = await registerAccount(app);
      const aliceHousehold = await ownHousehold(alice);
      const bobHousehold = await ownHousehold(bob);

      const custom = await request(app.getHttpServer())
        .post(`/api/households/${aliceHousehold}/subtypes`)
        .set(bearer(alice.accessToken))
        .send({
          tankType: 'AQUARIUM',
          name: 'Eau noire',
        })
        .expect(201);
      expect(custom.body).toMatchObject({
        slug: 'eau-noire',
        name: 'Eau noire',
        isSystem: false,
      });

      expect((await subtypes(alice)).some((row) => row.id === custom.body.id)).toBe(true);
      expect((await subtypes(bob)).some((row) => row.id === custom.body.id)).toBe(false);

      await request(app.getHttpServer())
        .post(`/api/households/${aliceHousehold}/tanks`)
        .set(bearer(alice.accessToken))
        .send({
          name: 'Blackwater',
          tankType: 'AQUARIUM',
          subtypeId: custom.body.id,
        })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/households/${bobHousehold}/tanks`)
        .set(bearer(bob.accessToken))
        .send({
          name: 'Stolen',
          tankType: 'AQUARIUM',
          subtypeId: custom.body.id,
        })
        .expect(400);
    });

    it('refuse a name clashing with a system subtype, and only custom ones can be deleted', async () => {
      const session = await registerAccount(app);
      const householdId = await ownHousehold(session);
      const planted = (await subtypes(session, 'AQUARIUM')).find((row) => row.slug === 'planted');

      await request(app.getHttpServer())
        .post(`/api/households/${householdId}/subtypes`)
        .set(bearer(session.accessToken))
        .send({
          tankType: 'AQUARIUM',
          name: 'Planted',
        })
        .expect(409);
      await request(app.getHttpServer())
        .delete(`/api/households/${householdId}/subtypes/${planted?.id}`)
        .set(bearer(session.accessToken))
        .expect(404);

      const custom = await request(app.getHttpServer())
        .post(`/api/households/${householdId}/subtypes`)
        .set(bearer(session.accessToken))
        .send({
          tankType: 'TERRARIUM',
          name: 'Savannah',
        })
        .expect(201);
      const tank = await request(app.getHttpServer())
        .post(`/api/households/${householdId}/tanks`)
        .set(bearer(session.accessToken))
        .send({
          name: 'Gecko',
          tankType: 'TERRARIUM',
          subtypeId: custom.body.id,
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/api/households/${householdId}/subtypes/${custom.body.id}`)
        .set(bearer(session.accessToken))
        .expect(204);
      const after = await request(app.getHttpServer())
        .get(`/api/tanks/${tank.body.id}`)
        .set(bearer(session.accessToken))
        .expect(200);
      expect(after.body.subtype).toBeNull();
    });
  });
});
