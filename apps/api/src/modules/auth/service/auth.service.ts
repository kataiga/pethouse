import {
  createHash, randomUUID, 
} from 'crypto';
import {
  ConflictException, Inject, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { jwtConfig } from '@config';
import {
  AccessTokenPayload, RefreshTokenPayload,
} from '@core/auth/jwt-payload';
import { HouseholdsService } from '@modules/households/service/households.service';
import { User } from '@modules/users/entity/user.entity';
import { UsersService } from '@modules/users/service/users.service';
import { IssuedTokens } from '../dto/auth-tokens-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { RefreshToken } from '../entity/refresh-token.entity';
import { RefreshTokenRepository } from '../repository/refresh-token.repository';
import { PasswordService } from './password.service';

export interface AuthResult {
  user: User;
  tokens: IssuedTokens;
}

const INVALID_CREDENTIALS = 'Invalid email or password';
const INVALID_REFRESH_TOKEN = 'Invalid refresh token';

/** Stored instead of the token so a database leak does not hand out live sessions. */
export function hashToken (token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor (
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly householdsService: HouseholdsService,
    private readonly passwords: PasswordService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async register (dto: RegisterDto): Promise<AuthResult> {
    if (await this.usersService.findByEmail(dto.email)) {
      throw new ConflictException('An account already exists for this email');
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const em = this.refreshTokens.getEntityManager();

    try {
      return await em.transactional(async () => {
        const user = this.usersService.create({
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          preferredLanguage: dto.preferredLanguage,
        });
        // Every account starts with a household of its own: sharing needs somewhere to share.
        this.householdsService.createDefaultFor(user, dto.timezone);
        await em.flush();

        return {
          user,
          tokens: await this.issueTokens(user),
        };
      });
    } catch (error: unknown) {
      // Two registrations racing on the same email: the unique index is the source of truth.
      if (error instanceof UniqueConstraintViolationException) {
        throw new ConflictException('An account already exists for this email');
      }

      throw error;
    }
  }

  async login (dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmail(dto.email);

    // Same answer whether the email is unknown or the password wrong.
    if (!user || !(await this.passwords.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    return {
      user,
      tokens: await this.issueTokens(user),
    };
  }

  /** Rotates the refresh token: the presented one is revoked, a fresh pair is issued. */
  async refresh (refreshToken: string): Promise<AuthResult> {
    await this.verifyRefreshToken(refreshToken, false);
    const stored = await this.refreshTokens.findByHash(hashToken(refreshToken));

    if (!stored) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    if (!stored.isActive()) {
      if ((stored.revokedAt ?? null) !== null) {
        // A rotated-out token coming back means it was copied: cut every session of the user.
        await this.refreshTokens.revokeAllForUser(stored.user.id, new Date());
      }

      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    const em = this.refreshTokens.getEntityManager();

    return em.transactional(async () => {
      stored.revokedAt = new Date();

      return {
        user: stored.user,
        tokens: await this.issueTokens(stored.user),
      };
    });
  }

  /** Revokes the presented refresh token. Idempotent: unknown or dead tokens are a no-op. */
  async logout (refreshToken: string): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken, true).catch(() => null);

    if (!payload) {
      return;
    }

    const stored = await this.refreshTokens.findByHash(hashToken(refreshToken));

    if (stored?.isActive()) {
      stored.revokedAt = new Date();
      await this.refreshTokens.getEntityManager().flush();
    }
  }

  private async issueTokens (user: User): Promise<IssuedTokens> {
    const accessPayload: AccessTokenPayload = { sub: user.id };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      jti: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.jwt.accessSecret,
        expiresIn: this.jwt.accessTtlSeconds,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.jwt.refreshSecret,
        expiresIn: this.jwt.refreshTtlSeconds,
      }),
    ]);

    const em = this.refreshTokens.getEntityManager();
    em.persist(this.refreshTokens.create({
      user,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + this.jwt.refreshTtlSeconds * 1000),
    }));
    await em.flush();

    return {
      accessToken,
      accessExpiresInSeconds: this.jwt.accessTtlSeconds,
      refreshToken,
      refreshExpiresInSeconds: this.jwt.refreshTtlSeconds,
    };
  }

  private async verifyRefreshToken (token: string, ignoreExpiration: boolean): Promise<RefreshTokenPayload> {
    try {
      return await this.jwtService.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.jwt.refreshSecret,
        ignoreExpiration,
      });
    } catch {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }
  }
}
