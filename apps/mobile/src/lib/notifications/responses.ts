import {
  DONE_ACTION, OPEN_ACTION,
} from './constants';

/** The part of an `expo-notifications` response this module reads. */
export interface ResponseLike {
  actionIdentifier: string;
  notification: {
    request: {
      identifier: string;
      content: { data: Record<string, unknown> | null };
    };
  };
}

export type ResponseIntent = { kind: 'open';
  route: string } | { kind: 'complete';
    occurrenceId: number;
    tankId: number } | { kind: 'ignore' };

const ROUTINE_URL = /^pethouse:\/\/(tanks\/[1-9]\d*\/routines\/[1-9]\d*)$/;

/**
 * The in-app path of the deep link the API puts in the payload. Only a routine's own page is
 * accepted: a notification is a remote input and must not steer the app anywhere else.
 */
export function routeFromUrl (url: unknown): string | null {
  const match = typeof url === 'string' ? ROUTINE_URL.exec(url) : null;

  return match ? `/${match[1] ?? ''}` : null;
}

function positiveInteger (value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;

  return typeof number === 'number' && Number.isInteger(number) && number > 0 ? number : null;
}

/** A stable key for one response, so the same tap is never handled twice. */
export function responseKey (response: ResponseLike): string {
  return `${response.notification.request.identifier}:${response.actionIdentifier}`;
}

/** What to do about a tap: open the routine, complete the occurrence, or nothing we know. */
export function intentOf (response: ResponseLike): ResponseIntent {
  const data = response.notification.request.content.data ?? {};

  if (response.actionIdentifier === DONE_ACTION) {
    const occurrenceId = positiveInteger(data.occurrenceId);
    const tankId = positiveInteger(data.tankId);

    return occurrenceId === null || tankId === null
      ? { kind: 'ignore' }
      : {
        kind: 'complete',
        occurrenceId,
        tankId,
      };
  }

  if (response.actionIdentifier === OPEN_ACTION) {
    const route = routeFromUrl(data.url);

    return route === null
      ? { kind: 'ignore' }
      : {
        kind: 'open',
        route,
      };
  }

  return { kind: 'ignore' };
}
