import {
  Injectable, Logger,
} from '@nestjs/common';
import type { RoutineOccurrence } from '@modules/routines/entity/routine-occurrence.entity';
import { NotificationSender } from './notification-sender';

/** Placeholder until Expo Push delivery lands: records what would have been sent. */
@Injectable()
export class LoggingNotificationSender extends NotificationSender {
  private readonly logger = new Logger(LoggingNotificationSender.name);

  notifyOccurrence (occurrence: RoutineOccurrence, attempt: number): Promise<void> {
    this.logger.log(`Occurrence ${occurrence.id} of routine ${occurrence.routine.id}: notification ${attempt}`);

    return Promise.resolve();
  }
}
