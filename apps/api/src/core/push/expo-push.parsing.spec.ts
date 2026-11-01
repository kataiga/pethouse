import {
  ExpoPushProtocolError, parseReceipts, parseTickets,
} from './expo-push.parsing';

describe('Expo Push parsing', () => {
  it('reads ok and error tickets in order, with the error code from details', () => {
    expect(parseTickets({
      data: [
        {
          status: 'ok',
          id: 'ticket-1',
        },
        {
          status: 'error',
          message: '"ExponentPushToken[x]" is not a registered push notification recipient',
          details: { error: 'DeviceNotRegistered' },
        },
      ],
    }, 2)).toEqual([
      {
        status: 'ok',
        id: 'ticket-1',
      },
      {
        status: 'error',
        message: '"ExponentPushToken[x]" is not a registered push notification recipient',
        errorCode: 'DeviceNotRegistered',
      },
    ]);
  });

  it.each([
    [{ errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] }],
    [{ data: [] }],
    [{ data: [{ status: 'pending' }] }],
    ['not json'],
  ])('rejects a send response it cannot trust: %j', (body) => {
    expect(() => parseTickets(body, 1)).toThrow(ExpoPushProtocolError);
  });

  it('reads receipts by ticket id and ignores entries it does not understand', () => {
    const receipts = parseReceipts({
      data: {
        'ticket-1': { status: 'ok' },
        'ticket-2': {
          status: 'error',
          message: 'Gone',
          details: { error: 'DeviceNotRegistered' },
        },
        'ticket-3': { status: 'later' },
      },
    });

    expect([...receipts.entries()]).toEqual([
      ['ticket-1', { status: 'ok' }],
      ['ticket-2', {
        status: 'error',
        message: 'Gone',
        errorCode: 'DeviceNotRegistered',
      }],
    ]);
    expect(() => parseReceipts({ data: [] })).toThrow(ExpoPushProtocolError);
  });
});
