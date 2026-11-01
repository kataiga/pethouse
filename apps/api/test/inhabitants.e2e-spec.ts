import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

describe('Tank inhabitants (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTank (session: TestSession): Promise<number> {
    const households = await request(app.getHttpServer())
      .get('/api/households')
      .set(bearer(session.accessToken))
      .expect(200);
    const tank = await request(app.getHttpServer())
      .post(`/api/households/${households.body[0].id}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Community',
        tankType: 'AQUARIUM',
      })
      .expect(201);

    return tank.body.id;
  }

  async function speciesId (session: TestSession, kind: 'animal' | 'plant', search: string): Promise<number> {
    const response = await request(app.getHttpServer())
      .get(`/api/${kind}-species`)
      .query({ search })
      .set(bearer(session.accessToken))
      .expect(200);

    return response.body.data[0].id;
  }

  it('adds, updates, retires and deletes animals, keeping the history', async () => {
    const session = await registerAccount(app);
    const tankId = await createTank(session);
    const betta = await speciesId(session, 'animal', 'Betta splendens');
    const neocaridina = await speciesId(session, 'animal', 'Neocaridina');

    const added = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/animals`)
      .set(bearer(session.accessToken))
      .send({
        animalSpeciesId: betta,
        quantity: 1,
        addedAt: '2026-03-01',
        notes: 'Blue halfmoon',
      })
      .expect(201);
    expect(added.body).toMatchObject({
      species: {
        id: betta,
        scientificName: 'Betta splendens',
        commonName: expect.any(String),
        animalGroup: 'FISH',
      },
      quantity: 1,
      addedAt: '2026-03-01',
      removedAt: null,
      notes: 'Blue halfmoon',
    });
    await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/animals`)
      .set(bearer(session.accessToken))
      .send({
        animalSpeciesId: neocaridina,
        quantity: 10,
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}/animals/${added.body.id}`)
      .set(bearer(session.accessToken))
      .send({
        quantity: 2,
        removedAt: '2026-06-30',
      })
      .expect(200);
    expect(updated.body).toMatchObject({
      quantity: 2,
      removedAt: '2026-06-30',
    });

    const current = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/animals`)
      .set(bearer(session.accessToken))
      .expect(200);
    expect(current.body).toHaveLength(1);
    expect(current.body[0].species.scientificName).toBe('Neocaridina davidi');

    const history = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/animals`)
      .query({ includeRemoved: 'true' })
      .set(bearer(session.accessToken))
      .expect(200);
    expect(history.body).toHaveLength(2);

    await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}/animals/${added.body.id}`)
      .set(bearer(session.accessToken))
      .send({ removedAt: '2025-01-01' })
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/api/tanks/${tankId}/animals/${added.body.id}`)
      .set(bearer(session.accessToken))
      .expect(204);
    await request(app.getHttpServer())
      .delete(`/api/tanks/${tankId}/animals/${added.body.id}`)
      .set(bearer(session.accessToken))
      .expect(404);
  });

  it('rejects an unknown species and hides entries of other households', async () => {
    const owner = await registerAccount(app);
    const stranger = await registerAccount(app);
    const tankId = await createTank(owner);

    await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/animals`)
      .set(bearer(owner.accessToken))
      .send({
        animalSpeciesId: 999999,
        quantity: 1,
      })
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/animals`)
      .set(bearer(stranger.accessToken))
      .expect(404);
  });

  it('handles plants through their own endpoints', async () => {
    const session = await registerAccount(app);
    const tankId = await createTank(session);
    const anubias = await speciesId(session, 'plant', 'Anubias barteri var. nana');

    const added = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/plants`)
      .set(bearer(session.accessToken))
      .send({
        plantSpeciesId: anubias,
        quantity: 3,
      })
      .expect(201);
    expect(added.body).toMatchObject({
      species: {
        id: anubias,
        scientificName: 'Anubias barteri var. nana',
        placement: 'EPIPHYTE',
      },
      quantity: 3,
      removedAt: null,
    });

    await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/plants`)
      .set(bearer(session.accessToken))
      .send({
        plantSpeciesId: 999999,
        quantity: 1,
      })
      .expect(400);

    const listed = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/plants`)
      .set(bearer(session.accessToken))
      .expect(200);
    expect(listed.body).toHaveLength(1);
    const animals = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/animals`)
      .set(bearer(session.accessToken))
      .expect(200);
    expect(animals.body).toHaveLength(0);
  });
});
