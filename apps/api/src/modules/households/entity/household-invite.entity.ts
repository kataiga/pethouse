import {
  Entity, EntityRepositoryType, ManyToOne, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { User } from '@modules/users/entity/user.entity';
import { HouseholdInviteRepository } from '../repository/household-invite.repository';
import { Household } from './household.entity';

/** Code-based invitation, shared as `pethouse://invite/<code>`. No email involved. */
@Entity({
  tableName: 'household_invites',
  repository: () => HouseholdInviteRepository,
})
export class HouseholdInvite {
  [EntityRepositoryType]?: HouseholdInviteRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Household, { deleteRule: 'cascade' })
  household!: Household;

  @Property({
    length: 16,
    unique: true,
  })
  code!: string;

  @ManyToOne(() => User)
  createdBy!: User;

  @Property()
  expiresAt!: Date;

  @Property({ unsigned: true })
  maxUses!: number;

  @Property({
    unsigned: true,
    default: 0,
  })
  useCount: number & Opt = 0;

  /** MikroORM hydrates a NULL column to `null`; the `?` keeps it optional on create. */
  @Property({ nullable: true })
  revokedAt?: Date | null = null;

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  isRedeemable (at: Date = new Date()): boolean {
    return (this.revokedAt ?? null) === null && this.expiresAt.getTime() > at.getTime() && this.useCount < this.maxUses;
  }
}
