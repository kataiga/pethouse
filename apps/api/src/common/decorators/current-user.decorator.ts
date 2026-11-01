import {
  createParamDecorator, ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import { User } from '@modules/users/entity/user.entity';

interface AuthenticatedRequest extends Request {
  user: User;
}

/** The user loaded by the JWT strategy for the current request. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().user;
});
