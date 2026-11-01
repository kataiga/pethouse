import { EntityRepository } from '@mikro-orm/mysql';
import type { RefreshToken } from '../entity/refresh-token.entity';

export class RefreshTokenRepository extends EntityRepository<RefreshToken> {
  findByHash (tokenHash: string): Promise<RefreshToken | null> {
    return this.findOne({ tokenHash }, { populate: ['user'] });
  }

  /** Revokes every live token of a user; used when a token is replayed after rotation. */
  async revokeAllForUser (userId: number, at: Date): Promise<number> {
    return this.nativeUpdate({
      user: userId,
      revokedAt: null,
    }, { revokedAt: at });
  }
}
