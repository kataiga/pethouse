import {
  InjectQueue, Processor, WorkerHost,
} from '@nestjs/bullmq';
import {
  Inject, Logger, OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  Job, Queue,
} from 'bullmq';
import { schedulerConfig } from '@config';
import {
  NotifyJobData, ROUTINE_QUEUE, RoutineJob,
} from '@core/queue/queue.constants';
import { RoutineSchedulerService } from '../service/routine-scheduler.service';

export const DISPATCH_EVERY_MS = 60 * 1000;

export const MATERIALISE_EVERY_MS = 60 * 60 * 1000;

function isNotifyData (data: unknown): data is NotifyJobData {
  return typeof data === 'object' && data !== null
    && 'occurrenceId' in data && typeof data.occurrenceId === 'number'
    && 'attempt' in data && typeof data.attempt === 'number';
}

/**
 * Worker of the routines queue. It starts only when SCHEDULER_ENABLED is on; it then also
 * upserts the two recurring jobs, which BullMQ keeps unique per id across every replica.
 */
@Processor(ROUTINE_QUEUE, { autorun: false })
export class RoutineJobsProcessor extends WorkerHost implements OnApplicationBootstrap {
  private readonly logger = new Logger(RoutineJobsProcessor.name);

  constructor (
    private readonly scheduler: RoutineSchedulerService,
    @InjectQueue(ROUTINE_QUEUE) private readonly queue: Queue,
    @Inject(schedulerConfig.KEY) private readonly config: ConfigType<typeof schedulerConfig>,
  ) {
    super();
  }

  async onApplicationBootstrap (): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    await this.queue.upsertJobScheduler(RoutineJob.DISPATCH, {
      every: DISPATCH_EVERY_MS,
    }, { name: RoutineJob.DISPATCH });
    await this.queue.upsertJobScheduler(RoutineJob.MATERIALISE, {
      every: MATERIALISE_EVERY_MS,
      immediately: true,
    }, { name: RoutineJob.MATERIALISE });
    this.worker.run().catch((error: unknown) => {
      this.logger.error(`Routine worker stopped: ${String(error)}`);
    });
  }

  async process (job: Job): Promise<unknown> {
    switch (job.name) {
      case RoutineJob.DISPATCH:
        return this.scheduler.dispatchDue();
      case RoutineJob.MATERIALISE:
        return this.scheduler.materialiseAll();
      case RoutineJob.NOTIFY:
        if (!isNotifyData(job.data)) {
          throw new Error(`Malformed ${job.name} job ${job.id ?? ''}`);
        }

        return this.scheduler.deliver(job.data.occurrenceId, job.data.attempt);
      default:
        throw new Error(`Unknown job ${job.name}`);
    }
  }
}
