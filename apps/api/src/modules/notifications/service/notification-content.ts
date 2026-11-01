import { Language } from '@common/enums/language.enum';

/** Category the app registers with a "Done" action; the action completes the occurrence. */
export const ROUTINE_NOTIFICATION_CATEGORY = 'routine-occurrence';

/** Android channel the app creates for routine notifications. */
export const ROUTINE_NOTIFICATION_CHANNEL = 'routines';

export interface NotificationTarget {
  occurrenceId: number;
  routineId: number;
  routineName: string;
  tankId: number;
  tankName: string;
}

export interface NotificationContent {
  title: string;
  body: string;
  data: Record<string, string | number>;
}

const BODIES: Record<Language, { due: (tank: string) => string;
  reminder: (tank: string) => string; }> = {
  [Language.FR]: {
    due: (tank) => `À faire maintenant · ${tank}`,
    reminder: (tank) => `Rappel : toujours à faire · ${tank}`,
  },
  [Language.EN]: {
    due: (tank) => `Due now · ${tank}`,
    reminder: (tank) => `Reminder: still to do · ${tank}`,
  },
};

/** Text in the recipient's language, and the deep link the app opens on tap. */
export function notificationContent (
  target: NotificationTarget,
  attempt: number,
  language: Language,
): NotificationContent {
  const bodies = BODIES[language];

  return {
    title: target.routineName,
    body: attempt === 0 ? bodies.due(target.tankName) : bodies.reminder(target.tankName),
    data: {
      url: `pethouse://tanks/${target.tankId}/routines/${target.routineId}`,
      occurrenceId: target.occurrenceId,
      routineId: target.routineId,
      tankId: target.tankId,
      attempt,
    },
  };
}
