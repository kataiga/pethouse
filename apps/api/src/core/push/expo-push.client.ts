import {
  Inject, Injectable,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { pushConfig } from '@config';
import {
  ExpoPushProtocolError, parseReceipts, parseTickets,
} from './expo-push.parsing';
import type {
  ExpoPushMessage, ExpoPushReceipt, ExpoPushTicket,
} from './expo-push.types';

/** Expo's limits per request. */
const SEND_CHUNK = 100;

const RECEIPTS_CHUNK = 1000;

function chunks<T> (items: readonly T[], size: number): T[][] {
  const result: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    result.push(items.slice(start, start + size));
  }

  return result;
}

/**
 * Minimal Expo Push HTTP client: send, then fetch receipts. A transport failure or a malformed
 * answer throws, so the job that called it is retried; per-message failures come back as tickets.
 */
@Injectable()
export class ExpoPushClient {
  constructor (@Inject(pushConfig.KEY) private readonly config: ConfigType<typeof pushConfig>) {}

  async send (messages: readonly ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks(messages, SEND_CHUNK)) {
      tickets.push(...parseTickets(await this.post('/send', chunk), chunk.length));
    }

    return tickets;
  }

  async getReceipts (ticketIds: readonly string[]): Promise<Map<string, ExpoPushReceipt>> {
    const receipts = new Map<string, ExpoPushReceipt>();

    for (const chunk of chunks(ticketIds, RECEIPTS_CHUNK)) {
      for (const [id, receipt] of parseReceipts(await this.post('/getReceipts', { ids: chunk }))) {
        receipts.set(id, receipt);
      }
    }

    return receipts;
  }

  private async post (path: string, payload: unknown): Promise<unknown> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    if (this.config.expoAccessToken) {
      headers.Authorization = `Bearer ${this.config.expoAccessToken}`;
    }

    const response = await fetch(`${this.config.expoApiUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new ExpoPushProtocolError(`Expo Push answered ${response.status} on ${path}`);
    }

    return response.json();
  }
}
