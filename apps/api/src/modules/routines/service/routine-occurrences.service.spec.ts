import {
  BadRequestException, ConflictException,
} from '@nestjs/common';
import { User } from '@modules/users/entity/user.entity';
import { OccurrenceStatus } from '../entity/occurrence-status.enum';
import { RoutineOccurrence } from '../entity/routine-occurrence.entity';
import { Routine } from '../entity/routine.entity';
import { RoutineOccurrenceRepository } from '../repository/routine-occurrence.repository';
import { RoutineOccurrencesService } from './routine-occurrences.service';

describe('RoutineOccurrencesService', () => {
  const em = { flush: jest.fn() };
  const occurrences = {
    insertMissing: jest.fn(),
    deletePendingFrom: jest.fn(),
    findForRoutine: jest.fn(),
    findHistory: jest.fn(),
    getEntityManager: () => em,
  };
  const alex = Object.assign(new User(), {
    id: 1,
    displayName: 'Alex',
  });
  const sam = Object.assign(new User(), {
    id: 2,
    displayName: 'Sam',
  });
  const now = new Date('2026-11-01T12:00:00Z');
  let service: RoutineOccurrencesService;

  function routine (overrides: Partial<Routine> = {}): Routine {
    return Object.assign(new Routine(), {
      id: 9,
      rrule: 'FREQ=DAILY;BYHOUR=19;BYMINUTE=0',
      dtstart: '2026-10-01T19:00',
      isActive: true,
      ...overrides,
    });
  }

  function occurrence (status: OccurrenceStatus, completedBy: User | null = null): RoutineOccurrence {
    return Object.assign(new RoutineOccurrence(), {
      id: 31,
      status,
      completedBy,
      completedAt: completedBy ? new Date('2026-10-31T20:00:00Z') : null,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoutineOccurrencesService(occurrences as unknown as RoutineOccurrenceRepository);
  });

  describe('reconcile', () => {
    it('plans the next 30 days and drops pending rows the rule no longer produces', async () => {
      await service.reconcile(routine(), 'UTC', now);

      const [routineId, instants] = occurrences.insertMissing.mock.calls[0] as [number, Date[]];
      expect(routineId).toBe(9);
      expect(instants).toHaveLength(30);
      expect(instants[0].toISOString()).toBe('2026-11-01T19:00:00.000Z');
      expect(instants[29].toISOString()).toBe('2026-11-30T19:00:00.000Z');
      expect(occurrences.deletePendingFrom).toHaveBeenCalledWith(9, now, instants);
    });

    it('resolves the wall-clock time in the household zone', async () => {
      await service.reconcile(routine(), 'Europe/Paris', now);

      const [, instants] = occurrences.insertMissing.mock.calls[0] as [number, Date[]];
      expect(instants[0].toISOString()).toBe('2026-11-01T18:00:00.000Z');
    });

    it('only clears what is ahead for an inactive routine', async () => {
      await service.reconcile(routine({ isActive: false }), 'UTC', now);

      expect(occurrences.deletePendingFrom).toHaveBeenCalledWith(9, now, []);
      expect(occurrences.insertMissing).not.toHaveBeenCalled();
    });
  });

  describe('complete and skip', () => {
    it('marks a pending occurrence done by the caller', async () => {
      const result = await service.complete(occurrence(OccurrenceStatus.PENDING), sam, now);

      expect(result).toMatchObject({
        status: OccurrenceStatus.DONE,
        completedBy: sam,
        completedAt: now,
      });
      expect(em.flush).toHaveBeenCalled();
    });

    it('accepts a late completion of a missed occurrence', async () => {
      const result = await service.complete(occurrence(OccurrenceStatus.MISSED), sam, now);

      expect(result.status).toBe(OccurrenceStatus.DONE);
    });

    it('keeps the first completion when it is completed twice', async () => {
      const result = await service.complete(occurrence(OccurrenceStatus.DONE, alex), sam, now);

      expect(result.completedBy).toBe(alex);
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('refuses to complete a skipped occurrence and to skip a done one', async () => {
      await expect(service.complete(occurrence(OccurrenceStatus.SKIPPED, alex), sam, now))
        .rejects.toThrow(ConflictException);
      await expect(service.skip(occurrence(OccurrenceStatus.DONE, alex), sam, now))
        .rejects.toThrow(ConflictException);
    });

    it('skips a pending occurrence, recording who decided it', async () => {
      const result = await service.skip(occurrence(OccurrenceStatus.PENDING), alex, now);

      expect(result).toMatchObject({
        status: OccurrenceStatus.SKIPPED,
        completedBy: alex,
      });
    });
  });

  describe('listForRoutine', () => {
    it('refuses an inverted or oversized range', () => {
      expect(() => service.listForRoutine(routine(), '2026-11-10T00:00:00Z', '2026-11-01T00:00:00Z'))
        .toThrow(BadRequestException);
      expect(() => service.listForRoutine(routine(), '2026-01-01T00:00:00Z', '2026-12-01T00:00:00Z'))
        .toThrow(BadRequestException);
    });

    it('reads the requested range', async () => {
      occurrences.findForRoutine.mockResolvedValue([]);

      await service.listForRoutine(routine(), '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z');

      expect(occurrences.findForRoutine)
        .toHaveBeenCalledWith(9, new Date('2026-11-01T00:00:00Z'), new Date('2026-11-08T00:00:00Z'));
    });
  });
});
