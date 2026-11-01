import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

interface ResolvedRow {
  definition: { slug: string };
  latest: { value: number;
    measuredAt: string } | null;
}

describe('Measurements (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function setup (session: TestSession): Promise<{ tankId: number;
    ph: number;
    tds: number }> {
    const households = await request(app.getHttpServer())
      .get('/api/households')
      .set(bearer(session.accessToken))
      .expect(200);
    const tank = await request(app.getHttpServer())
      .post(`/api/households/${households.body[0].id}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Measured',
        tankType: 'AQUARIUM',
      })
      .expect(201);
    const definitions = await request(app.getHttpServer())
      .get('/api/parameter-definitions')
      .set(bearer(session.accessToken))
      .expect(200);
    const byslug = new Map((definitions.body as { id: number;
      slug: string }[]).map((row) => [row.slug, row.id]));

    return {
      tankId: tank.body.id,
      ph: byslug.get('ph') ?? -1,
      tds: byslug.get('tds') ?? -1,
    };
  }

  async function record (
    session: TestSession,
    tankId: number,
    definitionId: number,
    value: number,
    measuredAt: string,
  ): Promise<number> {
    const response = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/measurements`)
      .set(bearer(session.accessToken))
      .send({
        parameterDefinitionId: definitionId,
        value,
        measuredAt,
      })
      .expect(201);

    return response.body.id;
  }

  it('records readings, lists them newest first with the definition, and exposes the latest on the tank', async () => {
    const session = await registerAccount(app, { displayName: 'Tester' });
    const { tankId, ph } = await setup(session);

    await record(session, tankId, ph, 7.0, '2026-03-01T08:00:00.000Z');
    const latestId = await record(session, tankId, ph, 7.4, '2026-03-02T08:00:00.000Z');
    const created = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/measurements`)
      .set(bearer(session.accessToken))
      .send({
        parameterDefinitionId: ph,
        value: 6.9,
        measuredAt: '2026-03-01T20:00:00.000Z',
        note: 'After water change',
      })
      .expect(201);
    expect(created.body).toMatchObject({
      definition: {
        slug: 'ph',
        unit: '',
        decimals: 1,
      },
      value: 6.9,
      measuredAt: '2026-03-01T20:00:00.000Z',
      recordedBy: {
        id: session.userId,
        displayName: 'Tester',
      },
      note: 'After water change',
    });

    const listed = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/measurements`)
      .query({ parameterDefinitionId: ph })
      .set(bearer(session.accessToken))
      .expect(200);
    expect(listed.body.total).toBe(3);
    expect(listed.body.data.map((row: { value: number }) => row.value)).toEqual([7.4, 6.9, 7.0]);

    const parameters = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/parameters`)
      .set(bearer(session.accessToken))
      .expect(200);
    const bySlug = (rows: ResolvedRow[], slug: string): ResolvedRow | undefined =>
      rows.find((row) => row.definition.slug === slug);
    expect(bySlug(parameters.body, 'ph')?.latest).toEqual({
      value: 7.4,
      measuredAt: '2026-03-02T08:00:00.000Z',
    });
    expect(bySlug(parameters.body, 'kh')?.latest).toBeNull();

    await request(app.getHttpServer())
      .delete(`/api/tanks/${tankId}/measurements/${latestId}`)
      .set(bearer(session.accessToken))
      .expect(204);
    const after = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/parameters`)
      .set(bearer(session.accessToken))
      .expect(200);
    expect(bySlug(after.body, 'ph')?.latest?.value).toBe(6.9);
  });

  it('refuses a reading for a parameter the tank does not track, and hides tanks of others', async () => {
    const session = await registerAccount(app);
    const stranger = await registerAccount(app);
    const { tankId, tds } = await setup(session);

    const refused = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/measurements`)
      .set(bearer(session.accessToken))
      .send({
        parameterDefinitionId: tds,
        value: 180,
      })
      .expect(400);
    expect(refused.body.message).toContain('not tracked');

    await request(app.getHttpServer())
      .put(`/api/tanks/${tankId}/parameters/${tds}`)
      .set(bearer(session.accessToken))
      .send({ enabled: true })
      .expect(200);
    await record(session, tankId, tds, 180, '2026-03-01T08:00:00.000Z');

    await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/measurements`)
      .set(bearer(stranger.accessToken))
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/measurements`)
      .set(bearer(session.accessToken))
      .send({
        parameterDefinitionId: 999999,
        value: 1,
      })
      .expect(404);
  });

  it('aggregates the history per day with thresholds for the band, still readable once disabled', async () => {
    const session = await registerAccount(app);
    const { tankId, ph } = await setup(session);
    await record(session, tankId, ph, 7.0, '2026-03-01T08:00:00.000Z');
    await record(session, tankId, ph, 7.4, '2026-03-01T20:00:00.000Z');
    await record(session, tankId, ph, 6.8, '2026-03-03T09:00:00.000Z');

    const history = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/measurements/history`)
      .query({
        parameterDefinitionId: ph,
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-05T00:00:00.000Z',
        bucket: 'day',
      })
      .set(bearer(session.accessToken))
      .expect(200);
    expect(history.body).toMatchObject({
      definition: { slug: 'ph' },
      bucket: 'day',
      minThreshold: 6.5,
      maxThreshold: 7.5,
    });
    expect(history.body.points).toEqual([
      {
        bucketStart: '2026-03-01T00:00:00.000Z',
        count: 2,
        min: 7,
        max: 7.4,
        avg: 7.2,
        last: 7.4,
      },
      {
        bucketStart: '2026-03-03T00:00:00.000Z',
        count: 1,
        min: 6.8,
        max: 6.8,
        avg: 6.8,
        last: 6.8,
      },
    ]);

    const weekly = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/measurements/history`)
      .query({
        parameterDefinitionId: ph,
        from: '2026-03-01T00:00:00.000Z',
        to: '2026-03-05T00:00:00.000Z',
        bucket: 'week',
      })
      .set(bearer(session.accessToken))
      .expect(200);
    // Weeks start on Monday: Sunday 1 March belongs to the week of 23 February.
    expect(weekly.body.points).toEqual([
      expect.objectContaining({
        bucketStart: '2026-02-23T00:00:00.000Z',
        count: 2,
        last: 7.4,
      }),
      expect.objectContaining({
        bucketStart: '2026-03-02T00:00:00.000Z',
        count: 1,
        last: 6.8,
      }),
    ]);

    await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/measurements/history`)
      .query({
        parameterDefinitionId: ph,
        from: '2026-03-05T00:00:00.000Z',
        to: '2026-03-01T00:00:00.000Z',
      })
      .set(bearer(session.accessToken))
      .expect(400);

    await request(app.getHttpServer())
      .put(`/api/tanks/${tankId}/parameters/${ph}`)
      .set(bearer(session.accessToken))
      .send({ enabled: false })
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/measurements/history`)
      .query({ parameterDefinitionId: ph })
      .set(bearer(session.accessToken))
      .expect(200);
  });

  it('corrects a reading', async () => {
    const session = await registerAccount(app);
    const { tankId, ph } = await setup(session);
    const id = await record(session, tankId, ph, 7.0, '2026-03-01T08:00:00.000Z');

    const patched = await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}/measurements/${id}`)
      .set(bearer(session.accessToken))
      .send({
        value: 7.1,
        note: 'typo',
      })
      .expect(200);
    expect(patched.body).toMatchObject({
      value: 7.1,
      note: 'typo',
    });
    await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}/measurements/999999`)
      .set(bearer(session.accessToken))
      .send({ value: 1 })
      .expect(404);
  });
});
