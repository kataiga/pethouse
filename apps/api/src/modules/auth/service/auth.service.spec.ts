import {
  ConflictException, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { JwtConfig } from '@config/types';
import { User } from '@modules/users/entity/user.entity';
import { UsersService } from '@modules/users/service/users.service';
import { RefreshToken } from '../entity/refresh-token.entity';
import { RefreshTokenRepository } from '../repository/refresh-token.repository';
import {
  AuthService, hashToken,
} from './auth.service';
import { PasswordService } from './password.service';

interface SignedPayload {
  sub: number;
  jti?: string;
}

const jwt: JwtConfig = {
  accessSecret: 'access-secret',
  accessTtlSeconds: 900,
  refreshSecret: 'refresh-secret',
  refreshTtlSeconds: 2592000,
};

function makeUser (id: number): User {
  const user = new User();
  user.id = id;
  user.email = `user${id}@example.com`;
  user.passwordHash = 'hash';
  user.displayName = `User ${id}`;

  return user;
}

function makeStored (user: User, token: string, overrides: Partial<RefreshToken> = {}): RefreshToken {
  const stored = new RefreshToken();
  stored.id = 1;
  stored.user = user;
  stored.tokenHash = hashToken(token);
  stored.expiresAt = new Date(Date.now() + 60_000);
  Object.assign(stored, overrides);

  return stored;
}

describe('AuthService', () => {
  const em = {
    flush: jest.fn(),
    persist: jest.fn(),
    transactional: jest.fn(async <T>(work: () => Promise<T>): Promise<T> => work()),
  };
  const refreshTokens = {
    create: jest.fn((data: Partial<RefreshToken>) => Object.assign(new RefreshToken(), data)),
    findByHash: jest.fn(),
    revokeAllForUser: jest.fn(),
    getEntityManager: () => em,
  };
  const jwtService = {
    signAsync: jest.fn(async (payload: SignedPayload) => `token-for-${payload.sub}-${payload.jti ?? 'access'}`),
    verifyAsync: jest.fn(),
  };
  const usersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
  const passwords = {
    hash: jest.fn(async (plain: string) => `hashed:${plain}`),
    verify: jest.fn(),
  };
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      jwt,
      jwtService as unknown as JwtService,
      usersService as unknown as UsersService,
      passwords as unknown as PasswordService,
      refreshTokens as unknown as RefreshTokenRepository,
    );
  });

  describe('register', () => {
    it('refuses an email that already has an account', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser(1));

      await expect(service.register({
        email: 'user1@example.com',
        password: 'password-1',
        displayName: 'Dup',
      })).rejects.toBeInstanceOf(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('hashes the password, persists the user and issues a stored refresh token', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(() => makeUser(7));

      const result = await service.register({
        email: 'new@example.com',
        password: 'password-1',
        displayName: 'New',
      });

      expect(usersService.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'new@example.com',
        passwordHash: 'hashed:password-1',
      }));
      expect(result.tokens.accessExpiresInSeconds).toBe(900);
      expect(refreshTokens.create).toHaveBeenCalledWith(expect.objectContaining({
        tokenHash: hashToken(result.tokens.refreshToken),
      }));
      expect(em.flush).toHaveBeenCalled();
    });

    it('maps a unique-constraint race on the email to a conflict', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(() => makeUser(8));
      em.flush.mockRejectedValueOnce(new UniqueConstraintViolationException(new Error('duplicate')));

      await expect(service.register({
        email: 'race@example.com',
        password: 'password-1',
        displayName: 'Race',
      })).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('answers the same 401 for an unknown email and for a wrong password', async () => {
      usersService.findByEmail.mockResolvedValueOnce(null);
      const unknown = service.login({
        email: 'nobody@example.com',
        password: 'x',
      });
      await expect(unknown).rejects.toBeInstanceOf(UnauthorizedException);

      usersService.findByEmail.mockResolvedValueOnce(makeUser(1));
      passwords.verify.mockResolvedValueOnce(false);
      const wrong = service.login({
        email: 'user1@example.com',
        password: 'x',
      });
      await expect(wrong).rejects.toBeInstanceOf(UnauthorizedException);

      const [a, b] = await Promise.all([unknown.catch((e: Error) => e.message), wrong.catch((e: Error) => e.message)]);
      expect(a).toBe(b);
    });

    it('issues tokens when the password matches', async () => {
      usersService.findByEmail.mockResolvedValue(makeUser(1));
      passwords.verify.mockResolvedValue(true);

      const result = await service.login({
        email: 'user1@example.com',
        password: 'ok',
      });

      expect(result.user.id).toBe(1);
      expect(result.tokens.refreshToken).toBeDefined();
    });
  });

  describe('refresh', () => {
    it('rejects a token that does not verify', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad signature'));

      await expect(service.refresh('garbage')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokens.findByHash).not.toHaveBeenCalled();
    });

    it('rejects a token that verifies but was never stored', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        jti: 'x',
      });
      refreshTokens.findByHash.mockResolvedValue(null);

      await expect(service.refresh('unknown')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rotates: revokes the presented token and issues a new pair', async () => {
      const user = makeUser(1);
      const stored = makeStored(user, 'old');
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        jti: 'x',
      });
      refreshTokens.findByHash.mockResolvedValue(stored);

      const result = await service.refresh('old');

      expect(stored.revokedAt).toBeInstanceOf(Date);
      expect(result.tokens.refreshToken).not.toBe('old');
      expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('treats a replayed revoked token as a leak and revokes every session of the user', async () => {
      const user = makeUser(1);
      const stored = makeStored(user, 'replayed', { revokedAt: new Date(Date.now() - 1000) });
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        jti: 'x',
      });
      refreshTokens.findByHash.mockResolvedValue(stored);

      await expect(service.refresh('replayed')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokens.revokeAllForUser).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('rejects an expired stored token without punishing the user', async () => {
      const user = makeUser(1);
      const stored = makeStored(user, 'expired', { expiresAt: new Date(Date.now() - 1000) });
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        jti: 'x',
      });
      refreshTokens.findByHash.mockResolvedValue(stored);

      await expect(service.refresh('expired')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokens.revokeAllForUser).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes a live token', async () => {
      const stored = makeStored(makeUser(1), 'live');
      jwtService.verifyAsync.mockResolvedValue({
        sub: 1,
        jti: 'x',
      });
      refreshTokens.findByHash.mockResolvedValue(stored);

      await service.logout('live');

      expect(stored.revokedAt).toBeInstanceOf(Date);
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('is a no-op for an invalid or unknown token', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('bad'));
      await expect(service.logout('bad')).resolves.toBeUndefined();

      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 1,
        jti: 'x',
      });
      refreshTokens.findByHash.mockResolvedValueOnce(null);
      await expect(service.logout('unknown')).resolves.toBeUndefined();
      expect(em.flush).not.toHaveBeenCalled();
    });
  });
});
