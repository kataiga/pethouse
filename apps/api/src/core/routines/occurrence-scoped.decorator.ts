import {
  applyDecorators, UseGuards,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import {
  OCCURRENCE_ID_PARAM, OccurrenceAccessGuard,
} from './occurrence-access.guard';

/**
 * Guards the route with OccurrenceAccessGuard and documents the `:occurrenceId` it reads, which
 * would otherwise be missing from the spec and from the generated client.
 */
export function OccurrenceScoped (): ClassDecorator & MethodDecorator {
  return applyDecorators(
    UseGuards(OccurrenceAccessGuard),
    ApiParam({
      name: OCCURRENCE_ID_PARAM,
      type: Number,
      description: 'Occurrence id; 404 when unknown or outside the caller\'s households.',
    }),
  );
}
