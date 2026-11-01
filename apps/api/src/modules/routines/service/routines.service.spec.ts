import {
  BadRequestException, NotFoundException,
} from '@nestjs/common';
import { Household } from '@modules/households/entity/household.entity';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { Routine } from '../entity/routine.entity';
import { RoutineRepository } from '../repository/routine.repository';
import { RoutineOccurrencesService } from './routine-occurrences.service';
import { RoutinesService } from './routines.service';

describe('RoutinesService', () => {
  const em = {
    persistAndFlush: jest.fn(),
    flush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const routines = {
    create: jest.fn((data: Partial<Routine>) => Object.assign(new Routine(), { id: 9 }, data)),
    findInTank: jest.fn(),
    findAllForTank: jest.fn(),
    getEntityManager: () => em,
  };
  const occurrencesService = { reconcile: jest.fn() };
  const tank = Object.assign(new Tank(), {
    id: 4,
    household: Object.assign(new Household(), {
      id: 2,
      timezone: 'Europe/Paris',
    }),
  });
  const user = Object.assign(new User(), {
    id: 1,
    displayName: 'Alex',
  });
  const now = new Date('2026-11-01T12:00:00Z');
  let service: RoutinesService;

  function existing (overrides: Partial<Routine> = {}): Routine {
    return Object.assign(new Routine(), {
      id: 9,
      tank,
      name: 'Water change',
      rrule: 'FREQ=WEEKLY;BYDAY=SA;BYHOUR=10;BYMINUTE=0',
      dtstart: '2026-10-03T10:00',
      isActive: true,
      createdBy: user,
      ...overrides,
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RoutinesService(
      routines as unknown as RoutineRepository,
      occurrencesService as unknown as RoutineOccurrencesService,
    );
  });

  describe('create', () => {
    it('stores the canonical rule, plans occurrences in the household zone and reports the next one', async () => {
      const view = await service.create(tank, user, {
        name: 'Feeding',
        rrule: 'RRULE:freq=daily;interval=2;byhour=19;byminute=0',
        dtstart: '2026-11-01T19:00',
      }, now);

      expect(view.routine).toMatchObject({
        rrule: 'FREQ=DAILY;INTERVAL=2;BYHOUR=19;BYMINUTE=0',
        dtstart: '2026-11-01T19:00',
        isActive: true,
        createdBy: user,
        reminderRepeatMinutes: null,
        reminderMaxRepeats: 0,
      });
      expect(em.persistAndFlush).toHaveBeenCalledWith(view.routine);
      expect(occurrencesService.reconcile).toHaveBeenCalledWith(view.routine, 'Europe/Paris', now);
      expect(view.timezone).toBe('Europe/Paris');
      expect(view.nextOccurrenceAt?.toISOString()).toBe('2026-11-01T18:00:00.000Z');
    });

    it.each([
      ['an unreadable rule', 'FREQ=SOMETIMES', '2026-11-01T19:00'],
      ['a rule finer than daily', 'FREQ=HOURLY', '2026-11-01T19:00'],
      ['a start with an offset', 'FREQ=DAILY', '2026-11-01T19:00:00Z'],
      ['an impossible start', 'FREQ=DAILY', '2026-02-30T19:00'],
      ['a rule with no occurrence', 'FREQ=DAILY;UNTIL=20250101T000000Z', '2026-11-01T19:00'],
    ])('refuses %s with a 400', async (_label, rrule, dtstart) => {
      await expect(service.create(tank, user, {
        name: 'Feeding',
        rrule,
        dtstart,
      }, now)).rejects.toThrow(BadRequestException);
      expect(em.persistAndFlush).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('does not re-plan when only the name changes', async () => {
      routines.findInTank.mockResolvedValue(existing());

      const view = await service.update(tank, 9, { name: 'Big water change' }, now);

      expect(view.routine.name).toBe('Big water change');
      expect(occurrencesService.reconcile).not.toHaveBeenCalled();
    });

    it('re-plans when the rule changes', async () => {
      routines.findInTank.mockResolvedValue(existing());

      const view = await service.update(tank, 9, { rrule: 'FREQ=WEEKLY;BYDAY=SU;BYHOUR=11;BYMINUTE=0' }, now);

      expect(view.routine.rrule).toBe('FREQ=WEEKLY;BYDAY=SU;BYHOUR=11;BYMINUTE=0');
      expect(occurrencesService.reconcile).toHaveBeenCalledWith(view.routine, 'Europe/Paris', now);
    });

    it('re-plans and reports no next occurrence once deactivated', async () => {
      routines.findInTank.mockResolvedValue(existing());

      const view = await service.update(tank, 9, { isActive: false }, now);

      expect(occurrencesService.reconcile).toHaveBeenCalled();
      expect(view.nextOccurrenceAt).toBeNull();
    });

    it('clears nullable fields with null', async () => {
      routines.findInTank.mockResolvedValue(existing({
        description: 'Twenty percent',
        reminderRepeatMinutes: 60,
      }));

      const view = await service.update(tank, 9, {
        description: null,
        reminderRepeatMinutes: null,
      }, now);

      expect(view.routine.description).toBeNull();
      expect(view.routine.reminderRepeatMinutes).toBeNull();
    });

    it('answers 404 for a routine of another tank', async () => {
      routines.findInTank.mockResolvedValue(null);

      await expect(service.update(tank, 9, { name: 'x' }, now)).rejects.toThrow(NotFoundException);
    });
  });

  it('previews the next occurrences of a draft without saving it', () => {
    const preview = service.preview(tank, {
      rrule: 'FREQ=WEEKLY;BYDAY=MO;BYHOUR=9;BYMINUTE=0',
      dtstart: '2026-11-02T09:00',
      count: 3,
    }, now);

    expect(preview).toEqual({
      timezone: 'Europe/Paris',
      occurrences: [
        new Date('2026-11-02T08:00:00Z'),
        new Date('2026-11-09T08:00:00Z'),
        new Date('2026-11-16T08:00:00Z'),
      ],
    });
    expect(em.persistAndFlush).not.toHaveBeenCalled();
  });
});
