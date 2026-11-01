import {
  Injectable, Logger,
} from '@nestjs/common';
import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/mysql';
import { RoutineQueue } from '@core/queue/routine-queue';
import { OccurrenceStatus } from '@modules/routines/entity/occurrence-status.enum';
import { RoutineOccurrenceRepository } from '@modules/routines/repository/routine-occurrence.repository';
import { RoutineRepository } from '@modules/routines/repository/routine.repository';
import { RoutineOccurrencesService } from '@modules/routines/service/routine-occurrences.service';
import { NotificationSender } from '@modules/notifications/service/notification-sender';

/** Due occurrences older than this when first seen (downtime) are left to turn MISSED, not pinged. */
export const DISPATCH_LOOKBACK_MS = 12 * 60 * 60 * 1000;

const DISPATCH_BATCH = 500;

const MATERIALISE_PAGE = 100;

export type DeliveryOutcome = 'sent' | 'settled' | 'already-claimed' | 'unknown';

/**
 * The scheduler's work, independent of BullMQ so it can be driven by hand. Every step is safe to
 * run concurrently on several replicas: rows are claimed with conditional updates, notification
 * jobs have deterministic ids, and materialisation is idempotent.
 *
 * Each entry point runs in its own MikroORM context: jobs run outside any HTTP request.
 */
@Injectable()
export class RoutineSchedulerService {
  private readonly logger = new Logger(RoutineSchedulerService.name);

  constructor (
    private readonly em: EntityManager,
    private readonly routines: RoutineRepository,
    private readonly occurrences: RoutineOccurrenceRepository,
    private readonly occurrencesService: RoutineOccurrencesService,
    private readonly queue: RoutineQueue,
    private readonly sender: NotificationSender,
  ) {}

  /** Keeps 30 days of occurrences ahead of every active routine. Returns the routines visited. */
  materialiseAll (now: Date = new Date()): Promise<number> {
    return RequestContext.create(this.em, () => this.materialiseAllInContext(now));
  }

  private async materialiseAllInContext (now: Date): Promise<number> {
    let afterId = 0;
    let visited = 0;

    for (;;) {
      const page = await this.routines.findActivePage(afterId, MATERIALISE_PAGE);

      for (const routine of page) {
        await this.occurrencesService.reconcile(routine, routine.tank.household.timezone, now);
      }

      visited += page.length;

      if (page.length < MATERIALISE_PAGE) {
        return visited;
      }

      afterId = page[page.length - 1].id;
      this.em.clear();
    }
  }

  /**
   * One tick: overdue occurrences turn MISSED first, then every occurrence that came due is
   * claimed and its notification enqueued. Returns how many this call claimed.
   */
  dispatchDue (now: Date = new Date()): Promise<number> {
    return RequestContext.create(this.em, () => this.dispatchDueInContext(now));
  }

  private async dispatchDueInContext (now: Date): Promise<number> {
    const missed = await this.occurrences.markMissed(now);

    if (missed > 0) {
      this.logger.log(`${missed} occurrence(s) missed`);
    }

    const since = new Date(now.getTime() - DISPATCH_LOOKBACK_MS);
    const candidates = await this.occurrences.findDispatchable(since, now, DISPATCH_BATCH);
    let claimed = 0;

    for (const id of candidates) {
      if (await this.occurrences.claimNotification(id, now)) {
        await this.queue.enqueueNotification(id, 0, 0);
        claimed += 1;
      }
    }

    return claimed;
  }

  /**
   * Sends notification `attempt` of an occurrence, then schedules the next reminder if the
   * routine asks for one. Stops quietly once the occurrence is no longer pending: completing it
   * is what cancels its reminders.
   */
  deliver (occurrenceId: number, attempt: number): Promise<DeliveryOutcome> {
    return RequestContext.create(this.em, () => this.deliverInContext(occurrenceId, attempt));
  }

  private async deliverInContext (occurrenceId: number, attempt: number): Promise<DeliveryOutcome> {
    const occurrence = await this.occurrences.findWithHousehold(occurrenceId);

    if (!occurrence) {
      return 'unknown';
    }

    if (occurrence.status !== OccurrenceStatus.PENDING) {
      return 'settled';
    }

    if (attempt > 0 && !await this.occurrences.claimReminder(occurrenceId, attempt)) {
      return 'already-claimed';
    }

    await this.sender.notifyOccurrence(occurrence, attempt);

    const { routine } = occurrence;
    const repeatMinutes = routine.reminderRepeatMinutes ?? null;

    if (repeatMinutes !== null && attempt < routine.reminderMaxRepeats) {
      await this.queue.enqueueNotification(occurrenceId, attempt + 1, repeatMinutes * 60 * 1000);
    }

    return 'sent';
  }
}
