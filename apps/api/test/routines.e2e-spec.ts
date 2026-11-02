import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

interface OccurrenceRow {
  id: number;
  scheduledFor: string;
  status: string;
  completedBy: { id: number;
    displayName: string } | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar date, `YYYY-MM-DD`, `days` from now in a zone. */
function localDate (timezone: string, days: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(Date.now() + days * DAY_MS));
}

function localHour (instant: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(instant));
}

describe('Routines (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function householdOf (session: TestSession): Promise<number> {
    const households = await request(app.getHttpServer())
      .get('/api/households')
      .set(bearer(session.accessToken))
      .expect(200);

    return households.body[0].id;
  }

  async function createTank (session: TestSession): Promise<number> {
    const householdId = await householdOf(session);
    const tank = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Scheduled',
        tankType: 'AQUARIUM',
      })
      .expect(201);

    return tank.body.id;
  }

  async function occurrencesOf (session: TestSession, tankId: number, routineId: number): Promise<OccurrenceRow[]> {
    const response = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routines/${routineId}/occurrences`)
      .set(bearer(session.accessToken))
      .expect(200);

    return response.body;
  }

  async function joinHousehold (owner: TestSession, member: TestSession): Promise<void> {
    const householdId = await householdOf(owner);
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

  it('suggests routine templates per tank type', async () => {
    const session = await registerAccount(app);

    const terrarium = await request(app.getHttpServer())
      .get('/api/routine-templates')
      .query({ tankType: 'TERRARIUM' })
      .set(bearer(session.accessToken))
      .expect(200);
    expect(terrarium.body).toHaveLength(6);
    expect(terrarium.body[0]).toEqual({
      id: expect.any(Number),
      tankType: 'TERRARIUM',
      nameKey: 'routine.misting.name',
      descriptionKey: 'routine.misting.description',
      defaultRrule: 'FREQ=DAILY;BYHOUR=8,20;BYMINUTE=0',
    });

    const all = await request(app.getHttpServer())
      .get('/api/routine-templates')
      .set(bearer(session.accessToken))
      .expect(200);
    expect(all.body).toHaveLength(20);
  });

  it('plans "every 2 days at 19:00" in the household zone and previews it the same way', async () => {
    const session = await registerAccount(app, { timezone: 'Europe/Paris' });
    const tankId = await createTank(session);
    const schedule = {
      rrule: 'RRULE:FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0',
      dtstart: `${localDate('Europe/Paris', 1)}T19:00`,
    };

    const preview = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/routines/preview`)
      .set(bearer(session.accessToken))
      .send({
        ...schedule,
        count: 3,
      })
      .expect(200);
    expect(preview.body.timezone).toBe('Europe/Paris');
    expect(preview.body.occurrences).toHaveLength(3);
    for (const instant of preview.body.occurrences as string[]) {
      expect(localHour(instant, 'Europe/Paris')).toBe('19:00');
    }
    expect(new Date(preview.body.occurrences[1]).getTime() - new Date(preview.body.occurrences[0]).getTime())
      .toBeGreaterThanOrEqual(2 * DAY_MS - 60 * 60 * 1000);

    const created = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/routines`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Feeding',
        ...schedule,
        reminderRepeatMinutes: 30,
        reminderMaxRepeats: 2,
      })
      .expect(201);
    expect(created.body).toMatchObject({
      name: 'Feeding',
      description: null,
      rrule: 'FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0',
      dtstart: schedule.dtstart,
      timezone: 'Europe/Paris',
      isActive: true,
      reminderRepeatMinutes: 30,
      reminderMaxRepeats: 2,
      nextOccurrenceAt: preview.body.occurrences[0],
      createdBy: {
        id: session.userId,
        displayName: session.account.displayName,
      },
    });

    const occurrences = await occurrencesOf(session, tankId, created.body.id);
    expect(occurrences).toHaveLength(15);
    expect(occurrences.slice(0, 3).map((row) => row.scheduledFor)).toEqual(preview.body.occurrences);
    expect(occurrences.every((row) => row.status === 'PENDING' && row.completedBy === null)).toBe(true);

    const listed = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routines`)
      .set(bearer(session.accessToken))
      .expect(200);
    // MySQL DATETIME drops the milliseconds the creation response still carries.
    expect(listed.body).toEqual([{
      ...created.body,
      createdAt: expect.any(String),
    }]);
  });

  it('lets any member complete or skip, keeps the first completion, and records who did what', async () => {
    const owner = await registerAccount(app, { timezone: 'UTC' });
    const member = await registerAccount(app);
    await joinHousehold(owner, member);
    const tankId = await createTank(owner);
    const routine = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/routines`)
      .set(bearer(owner.accessToken))
      .send({
        name: 'Water change',
        rrule: 'FREQ=DAILY;BYHOUR=10;BYMINUTE=0',
        dtstart: `${localDate('UTC', 1)}T10:00`,
      })
      .expect(201);
    const [first, second] = await occurrencesOf(owner, tankId, routine.body.id);

    const done = await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/complete`)
      .set(bearer(member.accessToken))
      .expect(200);
    expect(done.body).toMatchObject({
      id: first.id,
      routine: {
        id: routine.body.id,
        name: 'Water change',
      },
      scheduledFor: first.scheduledFor,
      status: 'DONE',
      completedBy: {
        id: member.userId,
        displayName: member.account.displayName,
      },
    });
    expect(typeof done.body.completedAt).toBe('string');

    const again = await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/complete`)
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(again.body.completedBy.id).toBe(member.userId);

    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/skip`)
      .set(bearer(owner.accessToken))
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${second.id}/skip`)
      .set(bearer(owner.accessToken))
      .expect(200);

    // Completing early does not move the schedule: the next occurrence is still the RRULE's.
    const after = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routines/${routine.body.id}`)
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(after.body.nextOccurrenceAt).toBe(first.scheduledFor);

    const history = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routine-history`)
      .query({ routineId: routine.body.id })
      .set(bearer(member.accessToken))
      .expect(200);
    expect(history.body).toMatchObject({
      total: 2,
      page: 1,
    });
    expect((history.body.data as OccurrenceRow[]).map((row) => [row.id, row.status, row.completedBy?.id])).toEqual([
      [second.id, 'SKIPPED', owner.userId],
      [first.id, 'DONE', member.userId],
    ]);

    const stranger = await registerAccount(app);
    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${second.id}/complete`)
      .set(bearer(stranger.accessToken))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routines`)
      .set(bearer(stranger.accessToken))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routine-history`)
      .set(bearer(stranger.accessToken))
      .expect(404);
  });

  it('re-plans pending occurrences on a new rule, keeps acted-on ones, and clears ahead once deactivated', async () => {
    const session = await registerAccount(app, { timezone: 'UTC' });
    const tankId = await createTank(session);
    const start = `${localDate('UTC', 1)}T19:00`;
    const routine = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/routines`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Glass cleaning',
        rrule: 'FREQ=WEEKLY;BYHOUR=19;BYMINUTE=0',
        dtstart: start,
      })
      .expect(201);
    const weekly = await occurrencesOf(session, tankId, routine.body.id);
    expect(weekly.length).toBeGreaterThanOrEqual(4);
    expect(weekly.length).toBeLessThanOrEqual(5);
    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${weekly[0].id}/complete`)
      .set(bearer(session.accessToken))
      .expect(200);

    const replannedAt = Date.now();
    await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}/routines/${routine.body.id}`)
      .set(bearer(session.accessToken))
      .send({ rrule: 'FREQ=DAILY;BYHOUR=19;BYMINUTE=0' })
      .expect(200);
    const daily = await occurrencesOf(session, tankId, routine.body.id);
    // One per day at 19:00 from the start to 30 days after the re-plan: 29 or 30 depending on
    // whether the suite runs before or after 19:00 UTC.
    const expectedDaily = Math.floor((replannedAt + 30 * DAY_MS - Date.parse(`${start}:00Z`)) / DAY_MS) + 1;
    expect(daily).toHaveLength(expectedDaily);
    expect(new Set(daily.map((row) => row.scheduledFor.slice(11))).size).toBe(1);
    expect(daily.find((row) => row.id === weekly[0].id)?.status).toBe('DONE');

    const deactivated = await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}/routines/${routine.body.id}`)
      .set(bearer(session.accessToken))
      .send({ isActive: false })
      .expect(200);
    expect(deactivated.body.nextOccurrenceAt).toBeNull();
    const kept = await occurrencesOf(session, tankId, routine.body.id);
    expect(kept.map((row) => row.status)).toEqual(['DONE']);

    await request(app.getHttpServer())
      .delete(`/api/tanks/${tankId}/routines/${routine.body.id}`)
      .set(bearer(session.accessToken))
      .expect(204);
    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${weekly[0].id}/complete`)
      .set(bearer(session.accessToken))
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routines/${routine.body.id}`)
      .set(bearer(session.accessToken))
      .expect(404);
  });

  it('validates rules, starts, reminders and preview sizes', async () => {
    const session = await registerAccount(app);
    const tankId = await createTank(session);
    const base = {
      name: 'Feeding',
      rrule: 'FREQ=DAILY;BYHOUR=8;BYMINUTE=0',
      dtstart: '2026-01-01T08:00',
    };

    for (const body of [
      {
        ...base,
        rrule: 'FREQ=HOURLY',
      },
      {
        ...base,
        rrule: 'DTSTART:20260101T080000Z\nRRULE:FREQ=DAILY',
      },
      {
        ...base,
        dtstart: '2026-01-01T08:00:00Z',
      },
      {
        ...base,
        reminderRepeatMinutes: 2,
      },
      {
        ...base,
        reminderMaxRepeats: 11,
      },
      {
        ...base,
        name: '',
      },
    ]) {
      await request(app.getHttpServer())
        .post(`/api/tanks/${tankId}/routines`)
        .set(bearer(session.accessToken))
        .send(body)
        .expect(400);
    }

    await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/routines/preview`)
      .set(bearer(session.accessToken))
      .send({
        rrule: base.rrule,
        dtstart: base.dtstart,
        count: 51,
      })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/routine-templates')
      .query({ tankType: 'POND' })
      .set(bearer(session.accessToken))
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/routine-occurrences/999999999/complete')
      .set(bearer(session.accessToken))
      .expect(404);
  });
});
