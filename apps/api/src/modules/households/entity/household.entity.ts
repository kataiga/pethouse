import {
  Collection, Entity, EntityRepositoryType, ManyToOne, OneToMany, Opt, PrimaryKey, Property,
} from '@mikro-orm/core';
import { User } from '@modules/users/entity/user.entity';
import { HouseholdRepository } from '../repository/household.repository';
import { HouseholdInvite } from './household-invite.entity';
import { HouseholdMember } from './household-member.entity';

export const DEFAULT_TIME_ZONE = 'Europe/Paris';

/** Sharing unit: every tank, routine and member belongs to a household. */
@Entity({
  tableName: 'households',
  repository: () => HouseholdRepository,
})
export class Household {
  [EntityRepositoryType]?: HouseholdRepository;

  @PrimaryKey()
  id!: number;

  @Property({ length: 80 })
  name!: string;

  /** IANA zone; every routine schedule of the household resolves against it. */
  @Property({ length: 64 })
  timezone!: string;

  @ManyToOne(() => User)
  createdBy!: User;

  @OneToMany(() => HouseholdMember, (member) => member.household)
  members = new Collection<HouseholdMember>(this);

  @OneToMany(() => HouseholdInvite, (invite) => invite.household)
  invites = new Collection<HouseholdInvite>(this);

  @Property({ onCreate: () => new Date() })
  createdAt: Date & Opt = new Date();

  @Property({
    onCreate: () => new Date(),
    onUpdate: () => new Date(),
  })
  updatedAt: Date & Opt = new Date();
}
