import {
  BadRequestException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import { CreateRoutineDto } from '../dto/create-routine.dto';
import { PreviewRoutineDto } from '../dto/preview-routine.dto';
import { UpdateRoutineDto } from '../dto/update-routine.dto';
import { Routine } from '../entity/routine.entity';
import { RoutineRepository } from '../repository/routine.repository';
import {
  hasAnyOccurrence, InvalidRecurrenceError, isLocalDateTime, nextOccurrences, normaliseRecurrence, Schedule,
} from './recurrence';
import { RoutineOccurrencesService } from './routine-occurrences.service';

export interface RoutinePreview {
  timezone: string;
  occurrences: Date[];
}

export interface RoutineView {
  routine: Routine;
  timezone: string;
  nextOccurrenceAt: Date | null;
}

@Injectable()
export class RoutinesService {
  constructor (
    private readonly routines: RoutineRepository,
    private readonly occurrencesService: RoutineOccurrencesService,
  ) {}

  async list (tank: Tank, now: Date = new Date()): Promise<RoutineView[]> {
    const routines = await this.routines.findAllForTank(tank.id);

    return routines.map((routine) => this.view(tank, routine, now));
  }

  async findOne (tank: Tank, id: number, now: Date = new Date()): Promise<RoutineView> {
    return this.view(tank, await this.require(tank, id), now);
  }

  /** Requires a routine of this tank; used by the occurrences listing too. */
  async require (tank: Tank, id: number): Promise<Routine> {
    const routine = await this.routines.findInTank(tank.id, id);

    if (!routine) {
      throw new NotFoundException('Routine not found');
    }

    return routine;
  }

  async create (tank: Tank, user: User, dto: CreateRoutineDto, now: Date = new Date()): Promise<RoutineView> {
    const schedule = this.schedule(tank, dto.rrule, dto.dtstart);
    const routine = this.routines.create({
      tank,
      name: dto.name,
      description: dto.description ?? null,
      rrule: schedule.rrule,
      dtstart: schedule.dtstart,
      isActive: dto.isActive ?? true,
      createdBy: user,
      reminderRepeatMinutes: dto.reminderRepeatMinutes ?? null,
      reminderMaxRepeats: dto.reminderMaxRepeats ?? 0,
    });
    await this.routines.getEntityManager().persistAndFlush(routine);
    await this.occurrencesService.reconcile(routine, schedule.timezone, now);

    return this.view(tank, routine, now);
  }

  async update (tank: Tank, id: number, dto: UpdateRoutineDto, now: Date = new Date()): Promise<RoutineView> {
    const routine = await this.require(tank, id);
    const scheduleChanged = dto.rrule !== undefined || dto.dtstart !== undefined
      || (dto.isActive !== undefined && dto.isActive !== routine.isActive);

    if (dto.rrule !== undefined || dto.dtstart !== undefined) {
      const schedule = this.schedule(tank, dto.rrule ?? routine.rrule, dto.dtstart ?? routine.dtstart);
      routine.rrule = schedule.rrule;
      routine.dtstart = schedule.dtstart;
    }

    if (dto.name !== undefined) {
      routine.name = dto.name;
    }

    if (dto.description !== undefined) {
      routine.description = dto.description;
    }

    if (dto.isActive !== undefined) {
      routine.isActive = dto.isActive;
    }

    if (dto.reminderRepeatMinutes !== undefined) {
      routine.reminderRepeatMinutes = dto.reminderRepeatMinutes;
    }

    if (dto.reminderMaxRepeats !== undefined) {
      routine.reminderMaxRepeats = dto.reminderMaxRepeats;
    }

    await this.routines.getEntityManager().flush();

    if (scheduleChanged) {
      await this.occurrencesService.reconcile(routine, tank.household.timezone, now);
    }

    return this.view(tank, routine, now);
  }

  async remove (tank: Tank, id: number): Promise<void> {
    await this.routines.getEntityManager().removeAndFlush(await this.require(tank, id));
  }

  /** The next occurrences a draft schedule would produce, for "next: Thursday 12 March". */
  preview (tank: Tank, dto: PreviewRoutineDto, now: Date = new Date()): RoutinePreview {
    const schedule = this.schedule(tank, dto.rrule, dto.dtstart);

    return {
      timezone: schedule.timezone,
      occurrences: nextOccurrences(schedule, now, dto.count),
    };
  }

  private view (tank: Tank, routine: Routine, now: Date): RoutineView {
    const timezone = tank.household.timezone;
    const [next] = routine.isActive
      ? nextOccurrences({
        rrule: routine.rrule,
        dtstart: routine.dtstart,
        timezone,
      }, now, 1)
      : [];

    return {
      routine,
      timezone,
      nextOccurrenceAt: next ?? null,
    };
  }

  /** Validates a schedule against the tank's household zone; every failure is a 400. */
  private schedule (tank: Tank, rrule: string, dtstart: string): Schedule {
    if (!isLocalDateTime(dtstart)) {
      throw new BadRequestException('dtstart must be a local date-time, YYYY-MM-DDTHH:mm');
    }

    let schedule: Schedule;
    try {
      schedule = {
        rrule: normaliseRecurrence(rrule),
        dtstart,
        timezone: tank.household.timezone,
      };
    } catch (error: unknown) {
      if (error instanceof InvalidRecurrenceError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    if (!hasAnyOccurrence(schedule)) {
      throw new BadRequestException('The rule produces no occurrence');
    }

    return schedule;
  }
}
