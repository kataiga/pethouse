import { EntityManager } from '@mikro-orm/mysql';
import { RoutineQueue } from '@core/queue/routine-queue';
import { Household } from '@modules/households/entity/household.entity';
import { OccurrenceStatus } from '@modules/routines/entity/occurrence-status.enum';
import { RoutineOccurrence } from '@modules/routines/entity/routine-occurrence.entity';
import { Routine } from '@modules/routines/entity/routine.entity';
import { RoutineOccurrenceRepository } from '@modules/routines/repository/routine-occurrence.repository';
import { RoutineRepository } from '@modules/routines/repository/routine.repository';
import { RoutineOccurrencesService } from '@modules/routines/service/routine-occurrences.service';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { NotificationSender } from '@modules/notifications/service/notification-sender';
import {
  DISPATCH_LOOKBACK_MS, RoutineSchedulerService,
} from './routine-scheduler.service';

describe('RoutineSchedulerService', () => {
  const em = {
    clear: jest.fn(),
    // CreateRequestContext forks the injected manager and runs the method inside the fork.
    fork: jest.fn(),
  };
  const routines = { findActivePage: jest.fn() };
  const occurrences = {
    markMissed: jest.fn(),
    findDispatchable: jest.fn(),
    claimNotification: jest.fn(),
    claimReminder: jest.fn(),
    findWithHousehold: jest.fn(),
  };
  const occurrencesService = { reconcile: jest.fn() };
  const queue = {
    enqueueNotification: jest.fn(),
    cancelNotification: jest.fn(),
  };
  const sender = { notifyOccurrence: jest.fn() };
  const now = new Date('2026-11-02T18:00:30Z');
  let service: RoutineSchedulerService;

  function routine (id: number, overrides: Partial<Routine> = {}): Routine {
    return Object.assign(new Routine(), {
      id,
      isActive: true,
      reminderRepeatMinutes: 30,
      reminderMaxRepeats: 2,
      tank: Object.assign(new Tank(), {
        id: 4,
        household: Object.assign(new Household(), { timezone: 'Europe/Paris' }),
      }),
      ...overrides,
    });
  }

  function pending (routineOverrides: Partial<Routine> = {}, status = OccurrenceStatus.PENDING): RoutineOccurrence {
    return Object.assign(new RoutineOccurrence(), {
      id: 31,
      status,
      routine: routine(9, routineOverrides),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    em.fork.mockReturnValue(em);
    service = new RoutineSchedulerService(
      em as unknown as EntityManager,
      routines as unknown as RoutineRepository,
      occurrences as unknown as RoutineOccurrenceRepository,
      occurrencesService as unknown as RoutineOccurrencesService,
      queue as unknown as RoutineQueue,
      sender as unknown as NotificationSender,
    );
  });

  describe('dispatchDue', () => {
    it('marks overdue occurrences missed, then enqueues only the ones this call claimed', async () => {
      occurrences.markMissed.mockResolvedValue(1);
      occurrences.findDispatchable.mockResolvedValue([31, 32]);
      occurrences.claimNotification.mockImplementation((id: number) => Promise.resolve(id === 31));

      const claimed = await service.dispatchDue(now);

      expect(claimed).toBe(1);
      expect(occurrences.markMissed).toHaveBeenCalledWith(now);
      expect(occurrences.findDispatchable)
        .toHaveBeenCalledWith(new Date(now.getTime() - DISPATCH_LOOKBACK_MS), now, expect.any(Number));
      expect(queue.enqueueNotification).toHaveBeenCalledTimes(1);
      expect(queue.enqueueNotification).toHaveBeenCalledWith(31, 0, 0);
    });
  });

  describe('deliver', () => {
    it('sends the due notification and schedules the first reminder', async () => {
      const occurrence = pending();
      occurrences.findWithHousehold.mockResolvedValue(occurrence);

      await expect(service.deliver(31, 0)).resolves.toBe('sent');

      expect(occurrences.claimReminder).not.toHaveBeenCalled();
      expect(sender.notifyOccurrence).toHaveBeenCalledWith(occurrence, 0);
      expect(queue.enqueueNotification).toHaveBeenCalledWith(31, 1, 30 * 60 * 1000);
    });

    it('claims a reminder before sending it and stops after the last one', async () => {
      occurrences.findWithHousehold.mockResolvedValue(pending());
      occurrences.claimReminder.mockResolvedValue(true);

      await expect(service.deliver(31, 2)).resolves.toBe('sent');

      expect(occurrences.claimReminder).toHaveBeenCalledWith(31, 2);
      expect(sender.notifyOccurrence).toHaveBeenCalledTimes(1);
      expect(queue.enqueueNotification).not.toHaveBeenCalled();
    });

    it('sends nothing when another worker already claimed the reminder', async () => {
      occurrences.findWithHousehold.mockResolvedValue(pending());
      occurrences.claimReminder.mockResolvedValue(false);

      await expect(service.deliver(31, 1)).resolves.toBe('already-claimed');

      expect(sender.notifyOccurrence).not.toHaveBeenCalled();
    });

    it.each([OccurrenceStatus.DONE, OccurrenceStatus.SKIPPED, OccurrenceStatus.MISSED])(
      'stops quietly once the occurrence is %s',
      async (status) => {
        occurrences.findWithHousehold.mockResolvedValue(pending({}, status));

        await expect(service.deliver(31, 1)).resolves.toBe('settled');

        expect(sender.notifyOccurrence).not.toHaveBeenCalled();
        expect(queue.enqueueNotification).not.toHaveBeenCalled();
      },
    );

    it('schedules no reminder for a routine without escalation', async () => {
      occurrences.findWithHousehold.mockResolvedValue(pending({ reminderRepeatMinutes: null }));

      await service.deliver(31, 0);

      expect(sender.notifyOccurrence).toHaveBeenCalled();
      expect(queue.enqueueNotification).not.toHaveBeenCalled();
    });

    it('lets a sending failure propagate so the job is retried, without scheduling anything', async () => {
      occurrences.findWithHousehold.mockResolvedValue(pending());
      sender.notifyOccurrence.mockRejectedValueOnce(new Error('Expo down'));

      await expect(service.deliver(31, 0)).rejects.toThrow('Expo down');

      expect(queue.enqueueNotification).not.toHaveBeenCalled();
    });

    it('ignores an occurrence deleted in the meantime', async () => {
      occurrences.findWithHousehold.mockResolvedValue(null);

      await expect(service.deliver(31, 0)).resolves.toBe('unknown');
    });
  });

  it('reconciles every active routine page by page in its household zone', async () => {
    const full = Array.from({ length: 100 }, (_value, index) => routine(index + 1));
    routines.findActivePage.mockResolvedValueOnce(full).mockResolvedValueOnce([routine(101)]);

    await expect(service.materialiseAll(now)).resolves.toBe(101);

    expect(routines.findActivePage).toHaveBeenNthCalledWith(1, 0, 100);
    expect(routines.findActivePage).toHaveBeenNthCalledWith(2, 100, 100);
    expect(occurrencesService.reconcile).toHaveBeenCalledTimes(101);
    expect(occurrencesService.reconcile).toHaveBeenCalledWith(full[0], 'Europe/Paris', now);
  });
});
