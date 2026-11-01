import {
  CanActivate, ExecutionContext, Injectable, NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { HouseholdMember } from '@modules/households/entity/household-member.entity';
import { HouseholdsService } from '@modules/households/service/households.service';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { TanksService } from '@modules/tanks/service/tanks.service';
import { User } from '@modules/users/entity/user.entity';

export const TANK_ID_PARAM = 'tankId';

export interface TankRequest extends Request {
  user: User;
  tank: Tank;
  membership: HouseholdMember;
}

/**
 * Resolves the `:tankId` in the route to a tank the caller may see: the tank must exist and the
 * caller must be a member of its household. Anything else is a 404, as with households, so tank
 * ids reveal nothing. Tanks keep a global id because notification deep links point at them.
 */
@Injectable()
export class TankAccessGuard implements CanActivate {
  constructor (
    private readonly tanksService: TanksService,
    private readonly householdsService: HouseholdsService,
  ) {}

  async canActivate (context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TankRequest>();
    const raw = request.params[TANK_ID_PARAM];
    const tankId = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
    const tank = Number.isInteger(tankId) ? await this.tanksService.findWithHousehold(tankId) : null;
    const membership = tank ? await this.householdsService.findMembership(tank.household.id, request.user) : null;

    if (!tank || !membership) {
      throw new NotFoundException('Tank not found');
    }

    request.tank = tank;
    request.membership = membership;

    return true;
  }
}
