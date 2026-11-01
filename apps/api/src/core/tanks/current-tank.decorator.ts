import {
  createParamDecorator, ExecutionContext,
} from '@nestjs/common';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { TankRequest } from './tank-access.guard';

/** The tank loaded by TankAccessGuard, with its household and subtype populated. */
export const CurrentTank = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Tank => context.switchToHttp().getRequest<TankRequest>().tank,
);
