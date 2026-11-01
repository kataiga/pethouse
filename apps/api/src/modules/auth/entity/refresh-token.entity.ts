import {
  Entity, EntityRepositoryType, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { User } from '@modules/users/entity/user.entity';
import { RefreshTokenRepository } from '../repository/refresh-token.repository';

/**
 * One row per issued refresh token, keyed by the SHA-256 of the token itself. Rotation revokes
 * the row and issues a new one; a revoked row showing up again means the token leaked.
 */
@Entity({
  tableName: 'refresh_tokens',
  repository: () => RefreshTokenRepository,
})
export class RefreshToken {
  [EntityRepositoryType]?: RefreshTokenRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property({
    length: 64,
    unique: true,
  })
  tokenHash!: string;

  @Property()
  expiresAt!: Date;

  /** MikroORM hydrates a NULL column to `null`; the `?` keeps it optional on create. */
  @Property({ nullable: true })
  revokedAt?: Date | null = null;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  /** A method rather than a getter: MikroORM would otherwise count a getter as a column on create. */
  isActive (): boolean {
    return (this.revokedAt ?? null) === null && this.expiresAt.getTime() > Date.now();
  }
}
