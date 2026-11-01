import {
  createServer, IncomingMessage, Server,
} from 'http';
import { AddressInfo } from 'net';

export interface RecordedPush {
  to: string;
  title: string;
  body: string;
  categoryId: string;
  channelId: string;
  data: {
    url: string;
    occurrenceId: number;
    attempt: number;
  };
}

/**
 * Stands in for the Expo Push API. Tokens containing `stale` are refused at send time and tokens
 * containing `gone` fail at receipt time, both with DeviceNotRegistered, as Expo reports them.
 */
export class FakeExpo {
  readonly pushes: RecordedPush[] = [];

  readonly receiptRequests: string[][] = [];

  private readonly tokenByTicket = new Map<string, string>();

  private server: Server | null = null;

  private tickets = 0;

  async start (): Promise<string> {
    this.server = createServer((request, response) => {
      void this.handle(request).then((body) => {
        response.writeHead(200, { 'Content-Type': 'application/json' });

        return response.end(JSON.stringify(body));
      });
    });
    await new Promise<void>((resolve) => {
      this.server?.listen(0, '127.0.0.1', resolve);
    });
    const { port } = this.server.address() as AddressInfo;

    return `http://127.0.0.1:${port}`;
  }

  async stop (): Promise<void> {
    await new Promise<void>((resolve) => {
      this.server?.close(() => resolve());
    });
  }

  forOccurrence (occurrenceId: number): RecordedPush[] {
    return this.pushes.filter((push) => push.data.occurrenceId === occurrenceId);
  }

  private async handle (request: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk as Buffer);
    }
    const payload: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));

    if (request.url === '/send' && Array.isArray(payload)) {
      return { data: (payload as RecordedPush[]).map((push) => this.ticketFor(push)) };
    }

    const ids = (payload as { ids: string[] }).ids;
    this.receiptRequests.push(ids);

    return {
      data: Object.fromEntries(ids.map((id) => [id, (this.tokenByTicket.get(id) ?? '').includes('gone')
        ? {
          status: 'error',
          message: 'The recipient device is not registered with FCM.',
          details: { error: 'DeviceNotRegistered' },
        }
        : { status: 'ok' }])),
    };
  }

  private ticketFor (push: RecordedPush): unknown {
    this.pushes.push(push);

    if (push.to.includes('stale')) {
      return {
        status: 'error',
        message: `"${push.to}" is not a registered push notification recipient`,
        details: { error: 'DeviceNotRegistered' },
      };
    }

    this.tickets += 1;
    const id = `ticket-${this.tickets}`;
    this.tokenByTicket.set(id, push.to);

    return {
      status: 'ok',
      id,
    };
  }
}
