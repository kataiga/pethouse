import {
  createParamDecorator, ExecutionContext,
} from '@nestjs/common';
import { HouseholdMember } from '@modules/households/entity/household-member.entity';
import { HouseholdRequest } from './household-member.guard';

/** The caller's membership loaded by HouseholdMemberGuard, with `household` populated. */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): HouseholdMember =>
    context.switchToHttp().getRequest<HouseholdRequest>().membership,
);
