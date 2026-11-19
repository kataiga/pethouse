import {
  DONE_ACTION, OPEN_ACTION,
} from './constants';
import {
  intentOf, responseKey, type ResponseLike, routeFromUrl,
} from './responses';

function response (actionIdentifier: string, data: Record<string, unknown> | null): ResponseLike {
  return {
    actionIdentifier,
    notification: {
      request: {
        identifier: 'notification-1',
        content: { data },
      },
    },
  };
}

const PAYLOAD = {
  url: 'pethouse://tanks/42/routines/7',
  occurrenceId: 311,
  routineId: 7,
  tankId: 42,
  attempt: 0,
};

describe('routeFromUrl', () => {
  it.each([
    ['pethouse://tanks/42/routines/7', '/tanks/42/routines/7'],
    ['pethouse://tanks/42', null],
    ['pethouse://account', null],
    ['https://evil.example/tanks/1/routines/2', null],
    ['pethouse://tanks/0/routines/7', null],
    ['pethouse://tanks/42/routines/7?x=1', null],
    [42, null],
  ])('reads %p', (url, expected) => {
    expect(routeFromUrl(url)).toBe(expected);
  });
});

describe('intentOf', () => {
  it('opens the routine when the notification itself is tapped', () => {
    expect(intentOf(response(OPEN_ACTION, PAYLOAD))).toEqual({
      kind: 'open',
      route: '/tanks/42/routines/7',
    });
  });

  it('completes the occurrence from the Done button, ids sent as numbers or strings', () => {
    expect(intentOf(response(DONE_ACTION, PAYLOAD))).toEqual({
      kind: 'complete',
      occurrenceId: 311,
      tankId: 42,
    });
    expect(intentOf(response(DONE_ACTION, {
      occurrenceId: '311',
      tankId: '42',
    }))).toMatchObject({
      kind: 'complete',
      occurrenceId: 311,
    });
  });

  it('ignores what it cannot act on', () => {
    expect(intentOf(response(OPEN_ACTION, null))).toEqual({ kind: 'ignore' });
    expect(intentOf(response(OPEN_ACTION, { url: 'https://example.com' }))).toEqual({ kind: 'ignore' });
    expect(intentOf(response(DONE_ACTION, { occurrenceId: 'x' }))).toEqual({ kind: 'ignore' });
    expect(intentOf(response('something-else', PAYLOAD))).toEqual({ kind: 'ignore' });
  });

  it('keys a response by notification and action', () => {
    expect(responseKey(response(DONE_ACTION, PAYLOAD))).toBe('notification-1:done');
  });
});
