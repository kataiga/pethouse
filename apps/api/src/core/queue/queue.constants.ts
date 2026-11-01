export const ROUTINE_QUEUE = 'routines';

export enum RoutineJob {
  /** Recurring: re-plans the rolling window of every active routine. */
  MATERIALISE = 'materialise',
  /** Recurring: flips overdue occurrences to MISSED and claims the ones that came due. */
  DISPATCH = 'dispatch',
  /** One per notification: the due one (attempt 0) and each reminder (attempt 1 to n). */
  NOTIFY = 'notify',
  /** Recurring: reads Expo Push receipts and revokes the tokens Expo reports as unregistered. */
  RECEIPTS = 'receipts',
}

export interface NotifyJobData {
  occurrenceId: number;
  attempt: number;
}

/** Deterministic id: enqueueing the same notification twice is a no-op in BullMQ. */
export function notifyJobId (occurrenceId: number, attempt: number): string {
  return `notify-${occurrenceId}-${attempt}`;
}
