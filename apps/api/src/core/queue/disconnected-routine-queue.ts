import { Injectable } from '@nestjs/common';
import { RoutineQueue } from './routine-queue';

/** For tooling booted without Redis (the OpenAPI dump): nothing to schedule, nothing to cancel. */
@Injectable()
export class DisconnectedRoutineQueue extends RoutineQueue {
  enqueueNotification (): Promise<void> {
    return Promise.resolve();
  }

  cancelNotification (): Promise<void> {
    return Promise.resolve();
  }
}
