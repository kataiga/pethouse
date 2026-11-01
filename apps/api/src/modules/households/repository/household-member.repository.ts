import { EntityRepository } from '@mikro-orm/mysql';
import type { HouseholdMember } from '../entity/household-member.entity';
import { HouseholdRole } from '../entity/household-role.enum';

export class HouseholdMemberRepository extends EntityRepository<HouseholdMember> {
  /** The membership of a user in a household, with the household loaded. Null when not a member. */
  findMembership (householdId: number, userId: number): Promise<HouseholdMember | null> {
    return this.findOne({
      household: householdId,
      user: userId,
    }, { populate: ['household'] });
  }

  findAllForUser (userId: number): Promise<HouseholdMember[]> {
    return this.find({ user: userId }, {
      populate: ['household'],
      orderBy: { joinedAt: 'asc' },
    });
  }

  findAllForHousehold (householdId: number): Promise<HouseholdMember[]> {
    return this.find({ household: householdId }, {
      populate: ['user'],
      orderBy: { joinedAt: 'asc' },
    });
  }

  countOwners (householdId: number): Promise<number> {
    return this.count({
      household: householdId,
      role: HouseholdRole.OWNER,
    });
  }
}
