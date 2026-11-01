import {
  createParamDecorator, ExecutionContext,
} from '@nestjs/common';
import { RoutineOccurrence } from '@modules/routines/entity/routine-occurrence.entity';
import { OccurrenceRequest } from './occurrence-access.guard';

/** The occurrence loaded by OccurrenceAccessGuard, with its routine, tank and household. */
export const CurrentOccurrence = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RoutineOccurrence => context
    .switchToHttp()
    .getRequest<OccurrenceRequest>()
    .occurrence,
);
