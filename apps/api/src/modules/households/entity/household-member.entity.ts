import {
  Entity, EntityRepositoryType, Enum, ManyToOne, Opt, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';
import { User } from '@modules/users/entity/user.entity';
import { HouseholdMemberRepository } from '../repository/household-member.repository';
import { HouseholdRole } from './household-role.enum';
import { Household } from './household.entity';

@Entity({
  tableName: 'household_members',
  repository: () => HouseholdMemberRepository,
})
@Unique({ properties: ['household', 'user'] })
export class HouseholdMember {
  [EntityRepositoryType]?: HouseholdMemberRepository;

  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Household, { deleteRule: 'cascade' })
  household!: Household;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Enum(() => HouseholdRole)
  role!: HouseholdRole;

  @Property({ onCreate: () => new Date() })
  joinedAt: Date & Opt = new Date();

  isOwner (): boolean {
    return this.role === HouseholdRole.OWNER;
  }
}
