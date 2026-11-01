import {
  applyDecorators, UseGuards,
} from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import {
  TANK_ID_PARAM, TankAccessGuard,
} from './tank-access.guard';

/**
 * Guards the route with TankAccessGuard and documents the `:tankId` it reads. The guard takes
 * the parameter from the request, not through `@Param`, so without this the spec, and the client
 * generated from it, would not know the parameter exists.
 */
export function TankScoped (): ClassDecorator & MethodDecorator {
  return applyDecorators(
    UseGuards(TankAccessGuard),
    ApiParam({
      name: TANK_ID_PARAM,
      type: Number,
      description: 'Tank id; 404 when unknown or outside the caller\'s households.',
    }),
  );
}
