import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

interface ResolvedRow {
  definition: { id: number;
    slug: string;
    isSystem: boolean };
  enabled: boolean;
  minThreshold: number | null;
  maxThreshold: number | null;
  source: string;
  overridden: boolean;
}

describe('Parameters (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function householdId (session: TestSession): Promise<number> {
    const response = await request(app.getHttpServer())
      .get('/api/households')
      .set(bearer(session.accessToken))
      .expect(200);

    return response.body[0].id;
  }

  async function createTank (session: TestSession, tankType = 'AQUARIUM'): Promise<number> {
    const response = await request(app.getHttpServer())
      .post(`/api/households/${await householdId(session)}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: `${tankType} tank`,
        tankType,
      })
      .expect(201);

    return response.body.id;
  }

  async function resolved (session: TestSession, tankId: number): Promise<Map<string, ResolvedRow>> {
    const response = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/parameters`)
      .set(bearer(session.accessToken))
      .expect(200);

    return new Map((response.body as ResolvedRow[]).map((row) => [row.definition.slug, row]));
  }

  async function definitionId (session: TestSession, slug: string): Promise<number> {
    const response = await request(app.getHttpServer())
      .get('/api/parameter-definitions')
      .set(bearer(session.accessToken))
      .expect(200);

    return (response.body as { id: number;
      slug: string }[]).find((row) => row.slug === slug)?.id ?? -1;
  }

  it('seeds the definitions and applies sensible defaults per tank type', async () => {
    const session = await registerAccount(app);
    const aquarium = await resolved(session, await createTank(session));
    const terrarium = await resolved(session, await createTank(session, 'TERRARIUM'));

    expect([...aquarium.keys()]).toEqual(expect.arrayContaining([
      'temperature', 'ph', 'kh', 'gh', 'no2', 'no3', 'nh4', 'tds',
    ]));
    expect(aquarium.get('ph')).toMatchObject({
      enabled: true,
      minThreshold: 6.5,
      maxThreshold: 7.5,
      source: 'default',
      overridden: false,
    });
    expect(aquarium.get('humidity')?.enabled).toBe(false);
    expect(terrarium.get('humidity')).toMatchObject({
      enabled: true,
      minThreshold: 40,
      maxThreshold: 80,
    });
    expect(terrarium.get('ph')?.enabled).toBe(false);

    const settings = await request(app.getHttpServer())
      .get('/api/users/me/parameter-settings/AQUARIUM')
      .set(bearer(session.accessToken))
      .expect(200);
    expect(settings.body.every((row: { customised: boolean }) => row.customised === false)).toBe(true);
    await request(app.getHttpServer())
      .get('/api/users/me/parameter-settings/POND')
      .set(bearer(session.accessToken))
      .expect(400);
  });

  it('propagates an account setting to every tank that never deviated, and not to the one that did', async () => {
    const session = await registerAccount(app);
    const plain = await createTank(session);
    const deviating = await createTank(session);
    const tds = await definitionId(session, 'tds');
    const ph = await definitionId(session, 'ph');

    // The deviating tank enables TDS on its own, with a ceiling.
    await request(app.getHttpServer())
      .put(`/api/tanks/${deviating}/parameters/${tds}`)
      .set(bearer(session.accessToken))
      .send({
        enabled: true,
        maxThreshold: 250,
      })
      .expect(200);
    expect((await resolved(session, plain)).get('tds')?.enabled).toBe(false);
    expect((await resolved(session, deviating)).get('tds')).toMatchObject({
      enabled: true,
      maxThreshold: 250,
      source: 'tank',
      overridden: true,
    });

    // The account tightens pH and disables TDS for every aquarium.
    const updated = await request(app.getHttpServer())
      .put('/api/users/me/parameter-settings/AQUARIUM')
      .set(bearer(session.accessToken))
      .send({
        settings: [
          {
            parameterDefinitionId: ph,
            enabled: true,
            minThreshold: 6.8,
            maxThreshold: 7.2,
          },
          {
            parameterDefinitionId: tds,
            enabled: false,
          },
        ],
      })
      .expect(200);
    expect(updated.body.find((row: { definition: { slug: string } }) => row.definition.slug === 'ph')).toMatchObject({
      customised: true,
      minThreshold: 6.8,
    });

    // Both tanks follow the account on pH; only the deviating tank keeps TDS on.
    expect((await resolved(session, plain)).get('ph')).toMatchObject({
      minThreshold: 6.8,
      maxThreshold: 7.2,
      source: 'account',
    });
    expect((await resolved(session, deviating)).get('ph')).toMatchObject({
      minThreshold: 6.8,
      source: 'account',
    });
    expect((await resolved(session, plain)).get('tds')?.enabled).toBe(false);
    expect((await resolved(session, deviating)).get('tds')?.enabled).toBe(true);

    // Dropping the deviation puts the tank back under the account setting.
    await request(app.getHttpServer())
      .delete(`/api/tanks/${deviating}/parameters/${tds}`)
      .set(bearer(session.accessToken))
      .expect(204);
    expect((await resolved(session, deviating)).get('tds')).toMatchObject({
      enabled: false,
      overridden: false,
    });
  });

  it('settings are per account: two members of a household can see a tank differently', async () => {
    const owner = await registerAccount(app);
    const member = await registerAccount(app);
    const tankId = await createTank(owner);
    const hh = await householdId(owner);
    const invite = await request(app.getHttpServer())
      .post(`/api/households/${hh}/invites`)
      .set(bearer(owner.accessToken))
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/invites/${invite.body.code}/redeem`)
      .set(bearer(member.accessToken))
      .expect(200);

    const kh = await definitionId(member, 'kh');
    await request(app.getHttpServer())
      .put('/api/users/me/parameter-settings/AQUARIUM')
      .set(bearer(member.accessToken))
      .send({
        settings: [{
          parameterDefinitionId: kh,
          enabled: false,
        }],
      })
      .expect(200);

    expect((await resolved(owner, tankId)).get('kh')?.enabled).toBe(true);
    expect((await resolved(member, tankId)).get('kh')?.enabled).toBe(false);
  });

  it('supports custom definitions scoped to a household and validates thresholds', async () => {
    const session = await registerAccount(app);
    const stranger = await registerAccount(app);
    const hh = await householdId(session);
    const tankId = await createTank(session);

    const redox = await request(app.getHttpServer())
      .post(`/api/households/${hh}/parameter-definitions`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Redox potential',
        unit: 'mV',
        decimals: 0,
      })
      .expect(201);
    expect(redox.body).toMatchObject({
      slug: 'redox-potential',
      isSystem: false,
    });
    await request(app.getHttpServer())
      .post(`/api/households/${hh}/parameter-definitions`)
      .set(bearer(session.accessToken))
      .send({
        name: 'pH',
        unit: '',
        decimals: 1,
      })
      .expect(409);

    expect((await resolved(session, tankId)).get('redox-potential')?.enabled).toBe(false);
    expect((await definitionId(stranger, 'redox-potential'))).toBe(-1);

    await request(app.getHttpServer())
      .put(`/api/tanks/${tankId}/parameters/${redox.body.id}`)
      .set(bearer(session.accessToken))
      .send({
        enabled: true,
        minThreshold: 400,
        maxThreshold: 300,
      })
      .expect(400);
    await request(app.getHttpServer())
      .put(`/api/tanks/${tankId}/parameters/999999`)
      .set(bearer(session.accessToken))
      .send({ enabled: true })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/households/${hh}/parameter-definitions/${redox.body.id}`)
      .set(bearer(session.accessToken))
      .expect(204);
    const ph = await definitionId(session, 'ph');
    await request(app.getHttpServer())
      .delete(`/api/households/${hh}/parameter-definitions/${ph}`)
      .set(bearer(session.accessToken))
      .expect(404);
  });
});
