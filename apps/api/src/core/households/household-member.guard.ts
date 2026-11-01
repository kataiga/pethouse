import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { HouseholdMember } from '@modules/households/entity/household-member.entity';
import { HouseholdRole } from '@modules/households/entity/household-role.enum';
import { HouseholdsService } from '@modules/households/service/households.service';
import { User } from '@modules/users/entity/user.entity';
import { HOUSEHOLD_ROLE_KEY } from './household-role.decorator';

export const HOUSEHOLD_ID_PARAM = 'householdId';

export interface HouseholdRequest extends Request {
  user: User;
  membership: HouseholdMember;
}

/**
 * Loads the caller's membership of the `:householdId` in the route. A non-member gets a 404, not
 * a 403: the existence of other households is not disclosed. Runs after the global JWT guard,
 * so `request.user` is set. With `@RequireHouseholdRole`, a member of another role gets a 403.
 */
@Injectable()
export class HouseholdMemberGuard implements CanActivate {
  constructor (
    private readonly reflector: Reflector,
    private readonly householdsService: HouseholdsService,
  ) {}

  async canActivate (context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HouseholdRequest>();
    const raw = request.params[HOUSEHOLD_ID_PARAM];
    const householdId = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
    const membership = Number.isInteger(householdId)
      ? await this.householdsService.findMembership(householdId, request.user)
      : null;

    if (!membership) {
      throw new NotFoundException('Household not found');
    }

    const required = this.reflector.getAllAndOverride<HouseholdRole | undefined>(HOUSEHOLD_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (required !== undefined && membership.role !== required) {
      throw new ForbiddenException(`This action requires the ${required} role`);
    }

    request.membership = membership;

    return true;
  }
}
