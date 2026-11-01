import type { RoutineOccurrence } from '@modules/routines/entity/routine-occurrence.entity';

/**
 * Delivers one notification of an occurrence to every member of its household. `attempt` 0 is
 * the due notification, 1 to n the reminders. The occurrence comes with its routine, tank and
 * household loaded. Implementations throw to have the job retried.
 */
export abstract class NotificationSender {
  abstract notifyOccurrence (occurrence: RoutineOccurrence, attempt: number): Promise<void>;
}
