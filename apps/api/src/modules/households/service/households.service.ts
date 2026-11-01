import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Language } from '@common/enums/language.enum';
import { User } from '@modules/users/entity/user.entity';
import { CreateHouseholdDto } from '../dto/create-household.dto';
import { UpdateHouseholdDto } from '../dto/update-household.dto';
import { HouseholdMember } from '../entity/household-member.entity';
import { HouseholdRole } from '../entity/household-role.enum';
import {
  DEFAULT_TIME_ZONE, Household,
} from '../entity/household.entity';
import { HouseholdMemberRepository } from '../repository/household-member.repository';
import { HouseholdRepository } from '../repository/household.repository';

const DEFAULT_NAMES: Record<Language, string> = {
  [Language.FR]: 'Mon foyer',
  [Language.EN]: 'My household',
};

function defaultHouseholdName (language: Language): string {
  return DEFAULT_NAMES[language];
}

export const LAST_OWNER_MESSAGE = 'A household must keep at least one owner';

@Injectable()
export class HouseholdsService {
  constructor (
    @InjectRepository(Household)
    private readonly households: HouseholdRepository,
    @InjectRepository(HouseholdMember)
    private readonly members: HouseholdMemberRepository,
  ) {}

  /** Creates the household and its first owner. Persists without flushing; the caller flushes. */
  create (owner: User, dto: CreateHouseholdDto): HouseholdMember {
    const household = this.households.create({
      name: dto.name,
      timezone: dto.timezone,
      createdBy: owner,
    });
    const membership = this.members.create({
      household,
      user: owner,
      role: HouseholdRole.OWNER,
    });
    this.members.getEntityManager().persist([household, membership]);

    return membership;
  }

  /** The household every new account starts with: named after the UI language, default zone. */
  createDefaultFor (owner: User, timezone: string = DEFAULT_TIME_ZONE): HouseholdMember {
    return this.create(owner, {
      name: defaultHouseholdName(owner.preferredLanguage),
      timezone,
    });
  }

  flush (): Promise<void> {
    return this.members.getEntityManager().flush();
  }

  /** Loads the `user` relation of a membership fetched without it. */
  async populateUser (member: HouseholdMember): Promise<void> {
    await this.members.populate(member, ['user']);
  }

  listForUser (user: User): Promise<HouseholdMember[]> {
    return this.members.findAllForUser(user.id);
  }

  findMembership (householdId: number, user: User): Promise<HouseholdMember | null> {
    return this.members.findMembership(householdId, user.id);
  }

  async update (household: Household, changes: UpdateHouseholdDto): Promise<Household> {
    if (changes.name !== undefined) {
      household.name = changes.name;
    }

    if (changes.timezone !== undefined) {
      household.timezone = changes.timezone;
    }

    await this.households.getEntityManager().flush();

    return household;
  }

  /** Members and invites go with it through the foreign keys. */
  async delete (household: Household): Promise<void> {
    await this.households.getEntityManager().removeAndFlush(household);
  }

  listMembers (household: Household): Promise<HouseholdMember[]> {
    return this.members.findAllForHousehold(household.id);
  }

  async changeRole (household: Household, userId: number, role: HouseholdRole): Promise<HouseholdMember> {
    const member = await this.requireMember(household, userId);

    if (member.role === role) {
      return member;
    }

    if (member.isOwner()) {
      await this.assertNotLastOwner(household);
    }

    member.role = role;
    await this.members.getEntityManager().flush();

    return member;
  }

  /**
   * Removes a member, whether an owner removes someone or a member leaves. The last owner cannot
   * go: deleting the household is the exit, so no household is ever left without an owner.
   */
  async removeMember (household: Household, userId: number): Promise<void> {
    const member = await this.requireMember(household, userId);

    if (member.isOwner()) {
      await this.assertNotLastOwner(household);
    }

    await this.members.getEntityManager().removeAndFlush(member);
  }

  private async requireMember (household: Household, userId: number): Promise<HouseholdMember> {
    const member = await this.members.findMembership(household.id, userId);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  private async assertNotLastOwner (household: Household): Promise<void> {
    if (await this.members.countOwners(household.id) <= 1) {
      throw new ConflictException(LAST_OWNER_MESSAGE);
    }
  }
}
