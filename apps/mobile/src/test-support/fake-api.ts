import type { Schemas } from '@pethouse/api-client';

type AuthResponse = Schemas['AuthResponseDto'];

type Role = 'OWNER' | 'MEMBER';

interface Account {
  id: number;
  email: string;
  password: string;
  displayName: string;
  preferredLanguage: 'fr' | 'en';
}

interface Household {
  id: number;
  name: string;
  timezone: string;
  members: { userId: number;
    role: Role;
    joinedAt: string }[];
}

interface Invite {
  id: number;
  householdId: number;
  code: string;
  maxUses: number;
  useCount: number;
  revokedAt: string | null;
}

const NOW = '2026-11-02T08:00:00.000Z';

function json (status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function error (status: number, message: string): Response {
  return json(status, {
    statusCode: status,
    message,
  });
}

/**
 * An in-memory Pethouse API for screen and session tests. It follows the real API's rules and
 * status codes: a default household per account, 404 for strangers, 403 for members acting as
 * owners, 409 when the last owner would leave, invites with counted uses. Every request is
 * recorded so tests can assert what the app sent.
 */
export class FakeApi {
  readonly requests: { method: string;
    path: string;
    authorization: string | null;
    body: unknown }[] = [];

  /** Simulates a server or network outage. */
  offline = false;

  readonly accounts: Account[] = [];

  readonly households: Household[] = [];

  readonly invites: Invite[] = [];

  private readonly refreshTokens = new Map<string, number>();

  private readonly accessTokens = new Map<string, number>();

  private counter = 0;

  /** Memberships get increasing join times, like the real ones. */
  private clock = Date.parse(NOW);

  /** Back to an empty server; tests call it first so no account leaks from one to the next. */
  reset (): void {
    this.requests.length = 0;
    this.offline = false;
    this.accounts.length = 0;
    this.households.length = 0;
    this.invites.length = 0;
    this.refreshTokens.clear();
    this.accessTokens.clear();
  }

  /** Seeds an account with its default household; returns a refresh token for it. */
  seedSignedIn (displayName = 'Camille'): string {
    const account = this.addAccount(`${displayName.toLowerCase()}@example.com`, 'correct horse battery', displayName);

    return this.issue(account).tokens.refreshToken;
  }

  accountNamed (displayName: string): Account {
    const account = this.accounts.find((candidate) => candidate.displayName === displayName);

    if (!account) {
      throw new Error(`No account ${displayName}`);
    }

    return account;
  }

  householdOf (displayName: string): Household {
    const { id } = this.accountNamed(displayName);
    const household = this.households.find((candidate) => candidate.members.some((member) => member.userId === id));

    if (!household) {
      throw new Error(`${displayName} has no household`);
    }

    return household;
  }

  /** Adds an account directly as a member of a household, as if it had redeemed an invite. */
  addMember (household: Household, displayName: string, role: Role = 'MEMBER'): Account {
    const account = this.addAccount(`${displayName.toLowerCase()}@example.com`, 'correct horse battery', displayName);
    household.members.push({
      userId: account.id,
      role,
      joinedAt: this.tick(),
    });

    return account;
  }

  readonly fetch = async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const text = request.method === 'GET' ? '' : await request.text();
    const body: unknown = text ? JSON.parse(text) : undefined;
    this.requests.push({
      method: request.method,
      path: url.pathname,
      authorization: request.headers.get('Authorization'),
      body,
    });

    if (this.offline) {
      throw new TypeError('Network request failed');
    }

    return this.route(request.method, url.pathname, (body ?? {}) as Record<string, string | number>, request);
  };

  private route (method: string, path: string, fields: Record<string, string | number>, request: Request): Response {
    const auth = this.routeAuth(method, path, fields);

    if (auth) {
      return auth;
    }

    const userId = this.accessTokens.get((request.headers.get('Authorization') ?? '').replace('Bearer ', ''));
    const account = this.accounts.find((candidate) => candidate.id === userId);

    if (!account) {
      return error(401, 'Unauthorized');
    }

    if (path === '/api/users/me') {
      if (method === 'PATCH') {
        if (fields.displayName !== undefined) {
          account.displayName = String(fields.displayName);
        }
        if (fields.preferredLanguage === 'fr' || fields.preferredLanguage === 'en') {
          account.preferredLanguage = fields.preferredLanguage;
        }
      }

      return json(200, this.user(account));
    }

    if (method === 'GET' && path === '/api/households') {
      // Ordered by the caller's join date, oldest first, as the API does.
      const joined = (household: Household): string => household.members
        .find((member) => member.userId === account.id)?.joinedAt ?? '';

      return json(200, this.households
        .filter((household) => household.members.some((member) => member.userId === account.id))
        .sort((a, b) => joined(a).localeCompare(joined(b)))
        .map((household) => this.householdView(household, account.id)));
    }

    const redeem = /^\/api\/invites\/([^/]+)\/redeem$/.exec(path);

    if (method === 'POST' && redeem) {
      return this.redeem(decodeURIComponent(redeem[1] ?? ''), account);
    }

    const match = /^\/api\/households\/(\d+)(\/.*)?$/.exec(path);

    if (!match) {
      return error(404, 'Not found');
    }

    return this.routeHousehold(method, Number(match[1]), match[2] ?? '', fields, account);
  }

  private routeAuth (method: string, path: string, fields: Record<string, string | number>): Response | null {
    if (method === 'POST' && path === '/api/auth/register') {
      if (this.accounts.some((account) => account.email === fields.email)) {
        return error(409, 'An account already exists for this email');
      }

      const account = this.addAccount(
        String(fields.email ?? ''),
        String(fields.password ?? ''),
        String(fields.displayName ?? ''),
      );
      account.preferredLanguage = fields.preferredLanguage === 'en' ? 'en' : 'fr';

      return json(201, this.issue(account));
    }

    if (method === 'POST' && path === '/api/auth/login') {
      const account = this.accounts.find(
        (candidate) => candidate.email === fields.email && candidate.password === fields.password,
      );

      return account ? json(200, this.issue(account)) : error(401, 'Invalid email or password');
    }

    if (method === 'POST' && path === '/api/auth/refresh') {
      const accountId = this.refreshTokens.get(String(fields.refreshToken ?? ''));
      const account = this.accounts.find((candidate) => candidate.id === accountId);
      this.refreshTokens.delete(String(fields.refreshToken ?? ''));

      return account ? json(200, this.issue(account)) : error(401, 'Invalid refresh token');
    }

    if (method === 'POST' && path === '/api/auth/logout') {
      this.refreshTokens.delete(String(fields.refreshToken ?? ''));

      return json(204);
    }

    return null;
  }

  private routeHousehold (
    method: string,
    householdId: number,
    rest: string,
    fields: Record<string, string | number>,
    account: Account,
  ): Response {
    const household = this.households.find((candidate) => candidate.id === householdId);
    const membership = household?.members.find((member) => member.userId === account.id);

    if (!household || !membership) {
      return error(404, 'Household not found');
    }

    const owner = membership.role === 'OWNER';
    const owners = (): number => household.members.filter((member) => member.role === 'OWNER').length;

    if (rest === '' && method === 'PATCH') {
      if (!owner) {
        return error(403, 'Only owners can do this');
      }
      household.name = String(fields.name ?? household.name);

      return json(200, this.householdView(household, account.id));
    }

    if (rest === '/members' && method === 'GET') {
      return json(200, household.members.map((member) => {
        const person = this.accounts.find((candidate) => candidate.id === member.userId);

        return {
          userId: member.userId,
          displayName: person?.displayName ?? '',
          email: person?.email ?? '',
          role: member.role,
          joinedAt: member.joinedAt,
        };
      }));
    }

    const member = /^\/members\/(\d+)$/.exec(rest);

    if (member) {
      const target = household.members.find((candidate) => candidate.userId === Number(member[1]));

      if (!target) {
        return error(404, 'Member not found');
      }

      if (method === 'PATCH') {
        if (!owner) {
          return error(403, 'Only owners can do this');
        }
        if (target.role === 'OWNER' && fields.role === 'MEMBER' && owners() === 1) {
          return error(409, 'A household must keep at least one owner');
        }
        target.role = fields.role === 'OWNER' ? 'OWNER' : 'MEMBER';

        return json(200, {
          userId: target.userId,
          role: target.role,
        });
      }

      if (method === 'DELETE') {
        if (!owner && target.userId !== account.id) {
          return error(403, 'Only owners can do this');
        }
        if (target.role === 'OWNER' && owners() === 1) {
          return error(409, 'A household must keep at least one owner');
        }
        household.members = household.members.filter((candidate) => candidate !== target);

        return json(204);
      }
    }

    if (rest === '/invites') {
      if (!owner) {
        return error(403, 'Only owners can do this');
      }

      if (method === 'POST') {
        this.counter += 1;
        const invite: Invite = {
          id: this.counter,
          householdId,
          code: `CODE${this.counter}abcdefgh`.slice(0, 12),
          maxUses: Number(fields.maxUses ?? 10),
          useCount: 0,
          revokedAt: null,
        };
        this.invites.push(invite);

        return json(201, this.inviteView(invite));
      }

      return json(200, this.invites
        .filter((invite) => invite.householdId === householdId)
        .map((invite) => this.inviteView(invite)));
    }

    const invite = /^\/invites\/(\d+)$/.exec(rest);

    if (invite && method === 'DELETE') {
      if (!owner) {
        return error(403, 'Only owners can do this');
      }
      const found = this.invites.find(
        (candidate) => candidate.id === Number(invite[1]) && candidate.householdId === householdId,
      );

      if (!found) {
        return error(404, 'Invite not found');
      }
      found.revokedAt = NOW;

      return json(204);
    }

    return error(404, 'Not found');
  }

  private redeem (code: string, account: Account): Response {
    const invite = this.invites.find((candidate) => candidate.code === code);
    const household = this.households.find((candidate) => candidate.id === invite?.householdId);

    if (!invite || !household || invite.revokedAt !== null || invite.useCount >= invite.maxUses) {
      return error(404, 'Invite not found or no longer valid');
    }

    if (!household.members.some((member) => member.userId === account.id)) {
      invite.useCount += 1;
      household.members.push({
        userId: account.id,
        role: 'MEMBER',
        joinedAt: this.tick(),
      });
    }

    return json(200, this.householdView(household, account.id));
  }

  private addAccount (email: string, password: string, displayName: string): Account {
    this.counter += 1;
    const account: Account = {
      id: this.counter,
      email,
      password,
      displayName,
      preferredLanguage: 'fr',
    };
    this.accounts.push(account);
    this.counter += 1;
    this.households.push({
      id: this.counter,
      name: 'Mon foyer',
      timezone: 'Europe/Paris',
      members: [{
        userId: account.id,
        role: 'OWNER',
        joinedAt: this.tick(),
      }],
    });

    return account;
  }

  private tick (): string {
    this.clock += 1000;

    return new Date(this.clock).toISOString();
  }

  private householdView (household: Household, userId: number): Schemas['HouseholdResponseDto'] {
    return {
      id: household.id,
      name: household.name,
      timezone: household.timezone,
      role: household.members.find((member) => member.userId === userId)?.role ?? 'MEMBER',
      createdAt: NOW,
    };
  }

  private inviteView (invite: Invite): Schemas['InviteResponseDto'] {
    const active = invite.revokedAt === null && invite.useCount < invite.maxUses;

    return {
      id: invite.id,
      code: invite.code,
      url: `pethouse://invite/${invite.code}`,
      expiresAt: '2026-11-09T08:00:00.000Z',
      maxUses: invite.maxUses,
      useCount: invite.useCount,
      revokedAt: invite.revokedAt,
      active,
      createdAt: NOW,
    };
  }

  private user (account: Account): Schemas['UserResponseDto'] {
    return {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      preferredLanguage: account.preferredLanguage,
      createdAt: NOW,
    };
  }

  private issue (account: Account): AuthResponse {
    this.counter += 1;
    const accessToken = `access-${this.counter}`;
    const refreshToken = `refresh-${this.counter}`;
    this.accessTokens.set(accessToken, account.id);
    this.refreshTokens.set(refreshToken, account.id);

    return {
      user: this.user(account),
      tokens: {
        accessToken,
        accessExpiresInSeconds: 900,
        refreshToken,
        refreshExpiresInSeconds: 30 * 24 * 60 * 60,
      },
    };
  }
}

/** A TokenStore in memory, inspectable by tests. */
export class MemoryTokenStore {
  value: string | null = null;

  read (): Promise<string | null> {
    return Promise.resolve(this.value);
  }

  write (refreshToken: string): Promise<void> {
    this.value = refreshToken;

    return Promise.resolve();
  }

  clear (): Promise<void> {
    this.value = null;

    return Promise.resolve();
  }
}
