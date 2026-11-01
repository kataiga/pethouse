import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Language } from '../../src/common/enums/language.enum';

export interface TestAccount {
  email: string;
  password: string;
  displayName: string;
  preferredLanguage?: Language;
  timezone?: string;
}

export interface TestSession {
  account: TestAccount;
  userId: number;
  accessToken: string;
  refreshToken: string;
}

let counter = 0;

export function uniqueAccount (overrides: Partial<TestAccount> = {}): TestAccount {
  counter += 1;

  return {
    // Jest workers run in parallel with their own counter: only a UUID keeps emails unique.
    email: `user-${randomUUID()}@example.com`,
    password: 'correct horse battery staple',
    displayName: `User ${counter}`,
    ...overrides,
  };
}

/** Registers a fresh account through the real endpoint and returns its tokens. */
export async function registerAccount (
  app: INestApplication,
  overrides: Partial<TestAccount> = {},
): Promise<TestSession> {
  const account = uniqueAccount(overrides);
  const response = await request(app.getHttpServer()).post('/api/auth/register').send(account).expect(201);

  return {
    account,
    userId: response.body.user.id,
    accessToken: response.body.tokens.accessToken,
    refreshToken: response.body.tokens.refreshToken,
  };
}

export function bearer (token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
