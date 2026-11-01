import type {
  ExpoPushReceipt, ExpoPushTicket,
} from './expo-push.types';

export class ExpoPushProtocolError extends Error {}

function isRecord (value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCodeOf (entry: Record<string, unknown>): string | null {
  const { details } = entry;

  return isRecord(details) && typeof details.error === 'string' ? details.error : null;
}

function messageOf (entry: Record<string, unknown>): string {
  return typeof entry.message === 'string' ? entry.message : 'Unknown Expo Push error';
}

/** `{ data: [ticket, …] }`, one ticket per message, in order. */
export function parseTickets (body: unknown, expected: number): ExpoPushTicket[] {
  if (!isRecord(body) || !Array.isArray(body.data) || body.data.length !== expected) {
    throw new ExpoPushProtocolError('Unexpected Expo Push send response');
  }

  return body.data.map((entry: unknown): ExpoPushTicket => {
    if (isRecord(entry) && entry.status === 'ok' && typeof entry.id === 'string') {
      return {
        status: 'ok',
        id: entry.id,
      };
    }

    if (isRecord(entry) && entry.status === 'error') {
      return {
        status: 'error',
        message: messageOf(entry),
        errorCode: errorCodeOf(entry),
      };
    }

    throw new ExpoPushProtocolError('Unexpected Expo Push ticket');
  });
}

/** `{ data: { [ticketId]: receipt } }`; tickets without a receipt yet are simply absent. */
export function parseReceipts (body: unknown): Map<string, ExpoPushReceipt> {
  if (!isRecord(body) || !isRecord(body.data)) {
    throw new ExpoPushProtocolError('Unexpected Expo Push receipts response');
  }

  const receipts = new Map<string, ExpoPushReceipt>();

  for (const [id, entry] of Object.entries(body.data)) {
    if (isRecord(entry) && entry.status === 'ok') {
      receipts.set(id, { status: 'ok' });
    } else if (isRecord(entry) && entry.status === 'error') {
      receipts.set(id, {
        status: 'error',
        message: messageOf(entry),
        errorCode: errorCodeOf(entry),
      });
    }
  }

  return receipts;
}
