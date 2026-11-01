import {
  applyDecorators, UseGuards,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import {
  HOUSEHOLD_ID_PARAM, HouseholdMemberGuard,
} from './household-member.guard';

/**
 * Guards the route with HouseholdMemberGuard and documents the `:householdId` it reads, which
 * would otherwise be missing from the spec and from the generated client.
 */
export function HouseholdScoped (): ClassDecorator & MethodDecorator {
  return applyDecorators(
    UseGuards(HouseholdMemberGuard),
    ApiParam({
      name: HOUSEHOLD_ID_PARAM,
      type: Number,
      description: 'Household id; 404 when the caller is not a member.',
    }),
  );
}
