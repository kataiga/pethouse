import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import {
  NotifyJobData, notifyJobId, ROUTINE_QUEUE, RoutineJob,
} from './queue.constants';
import { RoutineQueue } from './routine-queue';

@Injectable()
export class BullRoutineQueue extends RoutineQueue {
  constructor (@InjectQueue(ROUTINE_QUEUE) private readonly queue: Queue<NotifyJobData>) {
    super();
  }

  async enqueueNotification (occurrenceId: number, attempt: number, delayMs: number): Promise<void> {
    await this.queue.add(RoutineJob.NOTIFY, {
      occurrenceId,
      attempt,
    }, {
      jobId: notifyJobId(occurrenceId, attempt),
      delay: delayMs,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 10_000,
      },
      removeOnComplete: { age: 24 * 60 * 60 },
      removeOnFail: { age: 7 * 24 * 60 * 60 },
    });
  }

  async cancelNotification (occurrenceId: number, attempt: number): Promise<void> {
    // remove() refuses a job a worker holds right now; that job re-checks the status anyway.
    await this.queue.remove(notifyJobId(occurrenceId, attempt));
  }
}
