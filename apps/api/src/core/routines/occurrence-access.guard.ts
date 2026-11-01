import {
  CanActivate, ExecutionContext, Injectable, NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { HouseholdsService } from '@modules/households/service/households.service';
import { RoutineOccurrence } from '@modules/routines/entity/routine-occurrence.entity';
import { RoutineOccurrencesService } from '@modules/routines/service/routine-occurrences.service';
import { User } from '@modules/users/entity/user.entity';

export const OCCURRENCE_ID_PARAM = 'occurrenceId';

export interface OccurrenceRequest extends Request {
  user: User;
  occurrence: RoutineOccurrence;
}

/**
 * Resolves `:occurrenceId` to an occurrence of a routine whose tank belongs to a household of the
 * caller; anything else is a 404. Occurrences keep a global id because the "Done" action of a
 * notification completes one without knowing its tank.
 */
@Injectable()
export class OccurrenceAccessGuard implements CanActivate {
  constructor (
    private readonly occurrencesService: RoutineOccurrencesService,
    private readonly householdsService: HouseholdsService,
  ) {}

  async canActivate (context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OccurrenceRequest>();
    const raw = request.params[OCCURRENCE_ID_PARAM];
    const id = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
    const occurrence = Number.isInteger(id) ? await this.occurrencesService.findWithHousehold(id) : null;
    const membership = occurrence
      ? await this.householdsService.findMembership(occurrence.routine.tank.household.id, request.user)
      : null;

    if (!occurrence || !membership) {
      throw new NotFoundException('Occurrence not found');
    }

    request.occurrence = occurrence;

    return true;
  }
}
