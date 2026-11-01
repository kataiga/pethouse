import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import {
  MikroORM, RequestContext,
} from '@mikro-orm/core';
import { Queue } from 'bullmq';
import * as request from 'supertest';
import {
  notifyJobId, ROUTINE_QUEUE,
} from '../src/core/queue/queue.constants';
import { Language } from '../src/common/enums/language.enum';
import { PushReceiptsService } from '../src/modules/notifications/service/push-receipts.service';
import { Routine } from '../src/modules/routines/entity/routine.entity';
import { RoutineOccurrencesService } from '../src/modules/routines/service/routine-occurrences.service';
import { RoutineSchedulerService } from '../src/modules/scheduler/service/routine-scheduler.service';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';
import { FakeExpo } from './support/fake-expo';

interface OccurrenceRow {
  id: number;
  scheduledFor: string;
  status: string;
}

interface Setup {
  owner: TestSession;
  member: TestSession;
  tankId: number;
  routineId: number;
  rows: OccurrenceRow[];
}

const MINUTE_MS = 60 * 1000;

/**
 * Drives the scheduler and the push delivery by hand (SCHEDULER_ENABLED is off in .env.test)
 * against real MySQL and Redis, with Expo replaced by a local fake. The sweeps are global, so
 * every test that runs them lives in this file, and its routines live in January 2020: given an
 * instant of that month, the sweeps cannot reach the rows of the suites running in parallel.
 */
describe('Scheduler and push delivery (e2e)', () => {
  const expo = new FakeExpo();
  const previousExpoUrl = process.env.EXPO_PUSH_URL;
  let app: INestApplication;
  let scheduler: RoutineSchedulerService;
  let queue: Queue;
  let devices = 0;

  beforeAll(async () => {
    process.env.EXPO_PUSH_URL = await expo.start();
    app = await createTestApp();
    scheduler = app.get(RoutineSchedulerService);
    queue = app.get<Queue>(getQueueToken(ROUTINE_QUEUE));
  });

  afterAll(async () => {
    // Nothing else in the suites enqueues; leave the test prefix empty.
    await queue.obliterate({ force: true });
    await app.close();
    await expo.stop();
    process.env.EXPO_PUSH_URL = previousExpoUrl;
  });

  async function registerDevice (session: TestSession, kind = 'device'): Promise<string> {
    devices += 1;
    const token = `ExponentPushToken[${kind}-${Date.now()}-${devices}]`;
    await request(app.getHttpServer())
      .put('/api/users/me/devices')
      .set(bearer(session.accessToken))
      .send({
        expoPushToken: token,
        platform: 'ANDROID',
      })
      .expect(200);

    return token;
  }

  async function setup (routine: Record<string, unknown> = {}): Promise<Setup> {
    const owner = await registerAccount(app, {
      timezone: 'UTC',
      preferredLanguage: Language.FR,
    });
    const member = await registerAccount(app, { preferredLanguage: Language.EN });
    const households = await request(app.getHttpServer())
      .get('/api/households')
      .set(bearer(owner.accessToken))
      .expect(200);
    const householdId = households.body[0].id;
    const invite = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/invites`)
      .set(bearer(owner.accessToken))
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/invites/${invite.body.code}/redeem`)
      .set(bearer(member.accessToken))
      .expect(200);
    const tank = await request(app.getHttpServer())
      .post(`/api/households/${householdId}/tanks`)
      .set(bearer(owner.accessToken))
      .send({
        name: 'Living room',
        tankType: 'AQUARIUM',
      })
      .expect(201);
    const created = await request(app.getHttpServer())
      .post(`/api/tanks/${tank.body.id}/routines`)
      .set(bearer(owner.accessToken))
      .send({
        name: 'Feeding',
        rrule: 'FREQ=DAILY;BYHOUR=10;BYMINUTE=0',
        dtstart: '2020-01-01T10:00',
        reminderRepeatMinutes: 30,
        reminderMaxRepeats: 1,
        ...routine,
      })
      .expect(201);

    // Plan the routine as the scheduler would have on 1 January 2020.
    const orm = app.get(MikroORM);
    await RequestContext.create(orm.em, async () => {
      const entity = await orm.em.findOneOrFail(Routine, { id: created.body.id });
      await app.get(RoutineOccurrencesService).reconcile(entity, 'UTC', new Date('2020-01-01T00:00:00Z'));
    });

    const rows = await request(app.getHttpServer())
      .get(`/api/tanks/${tank.body.id}/routines/${created.body.id}/occurrences`)
      .query({
        from: '2020-01-01T00:00:00.000Z',
        to: '2020-01-08T00:00:00.000Z',
      })
      .set(bearer(owner.accessToken))
      .expect(200);

    return {
      owner,
      member,
      tankId: tank.body.id,
      routineId: created.body.id,
      rows: rows.body,
    };
  }

  function justAfter (row: OccurrenceRow): Date {
    return new Date(new Date(row.scheduledFor).getTime() + MINUTE_MS);
  }

  it('pushes "every 2 days at 19:00" to every member in their language, escalates, and "Done" settles it', async () => {
    const {
      owner, member, tankId, routineId, rows,
    } = await setup({
      name: 'Water change',
      rrule: 'FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0',
      dtstart: '2020-01-01T19:00',
    });
    expect(rows.map((row) => row.scheduledFor)).toEqual([
      '2020-01-01T19:00:00.000Z',
      '2020-01-03T19:00:00.000Z',
      '2020-01-05T19:00:00.000Z',
      '2020-01-07T19:00:00.000Z',
    ]);
    const [first] = rows;
    const ownerToken = await registerDevice(owner);
    const memberToken = await registerDevice(member);

    await expect(scheduler.dispatchDue(justAfter(first))).resolves.toBeGreaterThanOrEqual(1);
    await expect(scheduler.deliver(first.id, 0)).resolves.toBe('sent');

    const due = expo.forOccurrence(first.id);
    expect(due.map((push) => [push.to, push.body])).toEqual([
      [ownerToken, 'À faire maintenant · Living room'],
      [memberToken, 'Due now · Living room'],
    ]);
    expect(due[0]).toMatchObject({
      title: 'Water change',
      categoryId: 'routine-occurrence',
      channelId: 'routines',
      data: {
        url: `pethouse://tanks/${tankId}/routines/${routineId}`,
        occurrenceId: first.id,
        attempt: 0,
      },
    });

    // Nobody acts: the reminder is a delayed job, then reaches both members again.
    const reminder = await queue.getJob(notifyJobId(first.id, 1));
    expect(reminder?.opts.delay).toBe(30 * MINUTE_MS);
    await expect(reminder?.getState()).resolves.toBe('delayed');
    await expect(scheduler.deliver(first.id, 1)).resolves.toBe('sent');
    expect(expo.forOccurrence(first.id).slice(2).map((push) => [push.to, push.body])).toEqual([
      [ownerToken, 'Rappel : toujours à faire · Living room'],
      [memberToken, 'Reminder: still to do · Living room'],
    ]);

    // The notification "Done" action is this call; the history shows who did it.
    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/complete`)
      .set(bearer(member.accessToken))
      .expect(200);
    await expect(scheduler.deliver(first.id, 2)).resolves.toBe('settled');
    expect(expo.forOccurrence(first.id)).toHaveLength(4);
    const history = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routine-history`)
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(history.body.data[0]).toMatchObject({
      id: first.id,
      status: 'DONE',
      completedBy: { id: member.userId },
    });
  });

  it('claims a due occurrence once across concurrent ticks and never sends a reminder twice', async () => {
    const { owner, rows } = await setup();
    const [first] = rows;
    await registerDevice(owner);

    // Two replicas ticking at the same instant: the occurrence is claimed exactly once.
    const tick = justAfter(first);
    const claims = await Promise.all([scheduler.dispatchDue(tick), scheduler.dispatchDue(tick)]);
    expect(claims[0] + claims[1]).toBeGreaterThanOrEqual(1);
    expect(await queue.getJob(notifyJobId(first.id, 0))).toBeDefined();
    await expect(scheduler.dispatchDue(justAfter(first))).resolves.toBe(0);

    await scheduler.deliver(first.id, 0);
    // A redelivered job does not send the reminder twice.
    await expect(scheduler.deliver(first.id, 1)).resolves.toBe('sent');
    await expect(scheduler.deliver(first.id, 1)).resolves.toBe('already-claimed');
    expect(expo.forOccurrence(first.id).map((push) => push.data.attempt)).toEqual([0, 1]);
    // reminderMaxRepeats is 1: nothing after the first reminder.
    expect(await queue.getJob(notifyJobId(first.id, 2))).toBeUndefined();
  });

  it('cancels the waiting reminder when the occurrence is completed', async () => {
    const { member, rows } = await setup();
    const [first] = rows;

    await scheduler.dispatchDue(justAfter(first));
    await scheduler.deliver(first.id, 0);
    expect(await queue.getJob(notifyJobId(first.id, 1))).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/complete`)
      .set(bearer(member.accessToken))
      .expect(200);

    expect(await queue.getJob(notifyJobId(first.id, 1))).toBeUndefined();
  });

  it('flips an occurrence to MISSED once the next one is due', async () => {
    const {
      owner, tankId, routineId, rows,
    } = await setup();
    const [first, second, third] = rows;

    await scheduler.dispatchDue(justAfter(third));

    const after = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routines/${routineId}/occurrences`)
      .query({
        from: '2020-01-01T00:00:00.000Z',
        to: '2020-01-04T00:00:00.000Z',
      })
      .set(bearer(owner.accessToken))
      .expect(200);
    expect((after.body as OccurrenceRow[]).map((row) => [row.id, row.status])).toEqual([
      [first.id, 'MISSED'],
      [second.id, 'MISSED'],
      [third.id, 'PENDING'],
    ]);

    // A missed occurrence still accepts a late completion, and is never pushed.
    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/complete`)
      .set(bearer(owner.accessToken))
      .expect(200);
    await expect(scheduler.deliver(second.id, 0)).resolves.toBe('settled');
  });

  it('prunes tokens Expo reports unregistered, at send time and from receipts', async () => {
    const { owner, member, rows } = await setup();
    const [first] = rows;
    const kept = await registerDevice(member);
    await registerDevice(member, 'stale');
    await registerDevice(owner, 'gone');

    await scheduler.dispatchDue(justAfter(first));
    await scheduler.deliver(first.id, 0);
    expect(expo.forOccurrence(first.id)).toHaveLength(3);

    // Refused at send time: revoked at once.
    const memberDevices = await request(app.getHttpServer())
      .get('/api/users/me/devices')
      .set(bearer(member.accessToken))
      .expect(200);
    expect((memberDevices.body as { expoPushToken: string }[]).map((device) => device.expoPushToken)).toEqual([kept]);

    // Accepted, then reported unregistered by its receipt fifteen minutes later.
    const result = await app.get(PushReceiptsService).poll(new Date(Date.now() + 16 * MINUTE_MS));
    expect(result.revoked).toBeGreaterThanOrEqual(1);
    const ownerDevices = await request(app.getHttpServer())
      .get('/api/users/me/devices')
      .set(bearer(owner.accessToken))
      .expect(200);
    expect(ownerDevices.body).toEqual([]);

    // The next reminder only reaches the device left.
    await scheduler.deliver(first.id, 1);
    expect(expo.forOccurrence(first.id).slice(3).map((push) => push.to)).toEqual([kept]);
  });
});
