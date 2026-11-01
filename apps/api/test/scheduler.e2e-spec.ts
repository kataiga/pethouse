import { INestApplication } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as request from 'supertest';
import {
  notifyJobId, ROUTINE_QUEUE,
} from '../src/core/queue/queue.constants';
import {
  MikroORM, RequestContext,
} from '@mikro-orm/core';
import { RoutineOccurrence } from '../src/modules/routines/entity/routine-occurrence.entity';
import { Routine } from '../src/modules/routines/entity/routine.entity';
import { RoutineOccurrencesService } from '../src/modules/routines/service/routine-occurrences.service';
import { NotificationSender } from '../src/modules/scheduler/notification/notification-sender';
import { RoutineSchedulerService } from '../src/modules/scheduler/service/routine-scheduler.service';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

interface OccurrenceRow {
  id: number;
  scheduledFor: string;
  status: string;
}

const MINUTE_MS = 60 * 1000;

/**
 * Drives the scheduler by hand (SCHEDULER_ENABLED is off in .env.test). The routine lives in
 * January 2020 so the global sweeps, given an instant of that month, can only reach its rows
 * while the other suites run in parallel on the same database.
 */
describe('Scheduler (e2e)', () => {
  let app: INestApplication;
  let scheduler: RoutineSchedulerService;
  let queue: Queue;
  let sent: { occurrenceId: number;
    attempt: number }[];

  beforeAll(async () => {
    app = await createTestApp();
    scheduler = app.get(RoutineSchedulerService);
    queue = app.get<Queue>(getQueueToken(ROUTINE_QUEUE));
    const sender = app.get(NotificationSender);
    jest.spyOn(sender, 'notifyOccurrence').mockImplementation((occurrence: RoutineOccurrence, attempt: number) => {
      sent.push({
        occurrenceId: occurrence.id,
        attempt,
      });

      return Promise.resolve();
    });
  });

  beforeEach(() => {
    sent = [];
  });

  afterAll(async () => {
    // Nothing else in the suites enqueues; leave the test prefix empty.
    await queue.obliterate({ force: true });
    await app.close();
  });

  async function setup (): Promise<{ owner: TestSession;
    member: TestSession;
    tankId: number;
    rows: OccurrenceRow[] }> {
    const owner = await registerAccount(app, { timezone: 'UTC' });
    const member = await registerAccount(app);
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
        name: 'Night shift',
        tankType: 'AQUARIUM',
      })
      .expect(201);
    const routine = await request(app.getHttpServer())
      .post(`/api/tanks/${tank.body.id}/routines`)
      .set(bearer(owner.accessToken))
      .send({
        name: 'Feeding',
        rrule: 'FREQ=DAILY;BYHOUR=10;BYMINUTE=0',
        dtstart: '2020-01-01T10:00',
        reminderRepeatMinutes: 30,
        reminderMaxRepeats: 1,
      })
      .expect(201);

    // Plan the routine as the scheduler would have on 1 January 2020.
    const orm = app.get(MikroORM);
    await RequestContext.create(orm.em, async () => {
      const entity = await orm.em.findOneOrFail(Routine, { id: routine.body.id });
      await app.get(RoutineOccurrencesService).reconcile(entity, 'UTC', new Date('2020-01-01T00:00:00Z'));
    });

    const rows = await request(app.getHttpServer())
      .get(`/api/tanks/${tank.body.id}/routines/${routine.body.id}/occurrences`)
      .query({
        from: '2020-01-01T00:00:00.000Z',
        to: '2020-01-05T00:00:00.000Z',
      })
      .set(bearer(owner.accessToken))
      .expect(200);

    return {
      owner,
      member,
      tankId: tank.body.id,
      rows: rows.body,
    };
  }

  it('notifies a due occurrence once across concurrent ticks, reminds, and stops once it is done', async () => {
    const { member, rows } = await setup();
    const [first] = rows;
    const due = new Date(new Date(first.scheduledFor).getTime() + MINUTE_MS);

    // Two replicas ticking at the same instant: the occurrence is claimed exactly once.
    const claims = await Promise.all([scheduler.dispatchDue(due), scheduler.dispatchDue(due)]);
    expect(claims[0] + claims[1]).toBe(1);
    expect(await queue.getJob(notifyJobId(first.id, 0))).toBeDefined();
    await expect(scheduler.dispatchDue(due)).resolves.toBe(0);

    await expect(scheduler.deliver(first.id, 0)).resolves.toBe('sent');
    expect(sent).toEqual([{
      occurrenceId: first.id,
      attempt: 0,
    }]);
    const reminder = await queue.getJob(notifyJobId(first.id, 1));
    expect(reminder?.opts.delay).toBe(30 * MINUTE_MS);
    await expect(reminder?.getState()).resolves.toBe('delayed');

    // A redelivered job does not send the reminder twice.
    await expect(scheduler.deliver(first.id, 1)).resolves.toBe('sent');
    await expect(scheduler.deliver(first.id, 1)).resolves.toBe('already-claimed');
    expect(sent.map((entry) => entry.attempt)).toEqual([0, 1]);
    // reminderMaxRepeats is 1: nothing after the first reminder.
    expect(await queue.getJob(notifyJobId(first.id, 2))).toBeUndefined();

    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/complete`)
      .set(bearer(member.accessToken))
      .expect(200);
    await expect(scheduler.deliver(first.id, 2)).resolves.toBe('settled');
    expect(sent).toHaveLength(2);
  });

  it('cancels the waiting reminder when the occurrence is completed', async () => {
    const { member, rows } = await setup();
    const [first] = rows;

    await scheduler.dispatchDue(new Date(new Date(first.scheduledFor).getTime() + MINUTE_MS));
    await scheduler.deliver(first.id, 0);
    expect(await queue.getJob(notifyJobId(first.id, 1))).toBeDefined();

    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/complete`)
      .set(bearer(member.accessToken))
      .expect(200);

    expect(await queue.getJob(notifyJobId(first.id, 1))).toBeUndefined();
  });

  it('flips an occurrence to MISSED once the next one is due, and pings nothing stale', async () => {
    const { owner, tankId, rows } = await setup();
    const [first, second, third] = rows;
    const afterThird = new Date(new Date(third.scheduledFor).getTime() + MINUTE_MS);

    await scheduler.dispatchDue(afterThird);

    const routineId = (await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/routines`)
      .set(bearer(owner.accessToken))
      .expect(200)).body[0].id;
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

    // A missed occurrence still accepts a late completion.
    await request(app.getHttpServer())
      .post(`/api/routine-occurrences/${first.id}/complete`)
      .set(bearer(owner.accessToken))
      .expect(200);
    await expect(scheduler.deliver(second.id, 0)).resolves.toBe('settled');
  });
});
