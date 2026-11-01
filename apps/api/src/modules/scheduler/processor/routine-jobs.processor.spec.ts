import { Job } from 'bullmq';
import { Queue } from 'bullmq';
import { RoutineJob } from '@core/queue/queue.constants';
import { PushReceiptsService } from '@modules/notifications/service/push-receipts.service';
import { RoutineSchedulerService } from '../service/routine-scheduler.service';
import {
  DISPATCH_EVERY_MS, MATERIALISE_EVERY_MS, RECEIPTS_EVERY_MS, RoutineJobsProcessor,
} from './routine-jobs.processor';

describe('RoutineJobsProcessor', () => {
  const scheduler = {
    dispatchDue: jest.fn(),
    materialiseAll: jest.fn(),
    deliver: jest.fn(),
  };
  const receipts = { poll: jest.fn() };
  const queue = { upsertJobScheduler: jest.fn() };

  function processor (enabled: boolean): RoutineJobsProcessor {
    return new RoutineJobsProcessor(
      scheduler as unknown as RoutineSchedulerService,
      receipts as unknown as PushReceiptsService,
      queue as unknown as Queue,
      { enabled },
    );
  }

  function job (name: string, data: unknown = {}): Job {
    return {
      name,
      data,
      id: '1',
    } as unknown as Job;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes each job to the scheduler', async () => {
    const worker = processor(false);

    await worker.process(job(RoutineJob.DISPATCH));
    await worker.process(job(RoutineJob.MATERIALISE));
    await worker.process(job(RoutineJob.RECEIPTS));
    await worker.process(job(RoutineJob.NOTIFY, {
      occurrenceId: 31,
      attempt: 1,
    }));

    expect(scheduler.dispatchDue).toHaveBeenCalled();
    expect(scheduler.materialiseAll).toHaveBeenCalled();
    expect(receipts.poll).toHaveBeenCalled();
    expect(scheduler.deliver).toHaveBeenCalledWith(31, 1);
  });

  it('fails malformed and unknown jobs', async () => {
    const worker = processor(false);

    await expect(worker.process(job(RoutineJob.NOTIFY, { occurrenceId: '31' }))).rejects.toThrow('Malformed');
    await expect(worker.process(job('cleanup'))).rejects.toThrow('Unknown job');
  });

  it('registers nothing and starts no worker when the scheduler is disabled', async () => {
    await processor(false).onApplicationBootstrap();

    expect(queue.upsertJobScheduler).not.toHaveBeenCalled();
  });

  it('upserts the recurring jobs when enabled', async () => {
    const worker = processor(true);
    const run = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(worker, 'worker', 'get').mockReturnValue({ run } as unknown as RoutineJobsProcessor['worker']);

    await worker.onApplicationBootstrap();

    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(RoutineJob.DISPATCH, { every: DISPATCH_EVERY_MS }, {
      name: RoutineJob.DISPATCH,
    });
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(RoutineJob.MATERIALISE, {
      every: MATERIALISE_EVERY_MS,
      immediately: true,
    }, { name: RoutineJob.MATERIALISE });
    expect(queue.upsertJobScheduler).toHaveBeenCalledWith(RoutineJob.RECEIPTS, { every: RECEIPTS_EVERY_MS }, {
      name: RoutineJob.RECEIPTS,
    });
    expect(run).toHaveBeenCalled();
  });
});
