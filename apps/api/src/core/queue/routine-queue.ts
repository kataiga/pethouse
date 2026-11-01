/** What the domain needs from the queue; the scheduler and the routines module share it. */
export abstract class RoutineQueue {
  /** Enqueues one notification of an occurrence, after `delayMs`. Idempotent per attempt. */
  abstract enqueueNotification (occurrenceId: number, attempt: number, delayMs: number): Promise<void>;

  /** Drops a scheduled notification that has not run yet; nothing happens if there is none. */
  abstract cancelNotification (occurrenceId: number, attempt: number): Promise<void>;
}
