import {
  ConflictException, NotFoundException,
} from '@nestjs/common';
import { Language } from '@common/enums/language.enum';
import { User } from '@modules/users/entity/user.entity';
import { HouseholdMember } from '../entity/household-member.entity';
import { HouseholdRole } from '../entity/household-role.enum';
import { Household } from '../entity/household.entity';
import { HouseholdMemberRepository } from '../repository/household-member.repository';
import { HouseholdRepository } from '../repository/household.repository';
import { HouseholdsService } from './households.service';

function makeUser (id: number, language: Language = Language.FR): User {
  const user = new User();
  user.id = id;
  user.preferredLanguage = language;

  return user;
}

function makeMember (household: Household, userId: number, role: HouseholdRole): HouseholdMember {
  const member = new HouseholdMember();
  member.household = household;
  member.user = makeUser(userId);
  member.role = role;

  return member;
}

describe('HouseholdsService', () => {
  const em = {
    persist: jest.fn(),
    flush: jest.fn(),
    removeAndFlush: jest.fn(),
  };
  const households = {
    create: jest.fn((data: Partial<Household>) => Object.assign(new Household(), data)),
    getEntityManager: () => em,
  };
  const members = {
    create: jest.fn((data: Partial<HouseholdMember>) => Object.assign(new HouseholdMember(), data)),
    findMembership: jest.fn(),
    countOwners: jest.fn(),
    getEntityManager: () => em,
  };
  const household = Object.assign(new Household(), { id: 10 });
  let service: HouseholdsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new HouseholdsService(
      households as unknown as HouseholdRepository,
      members as unknown as HouseholdMemberRepository,
    );
  });

  it('creates a household with its creator as owner, persisted but not flushed', () => {
    const owner = makeUser(1);

    const membership = service.create(owner, {
      name: 'Home',
      timezone: 'Europe/Paris',
    });

    expect(membership.role).toBe(HouseholdRole.OWNER);
    expect(membership.household.createdBy).toBe(owner);
    expect(em.persist).toHaveBeenCalledWith([membership.household, membership]);
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('names the default household after the user language and defaults the time zone', () => {
    expect(service.createDefaultFor(makeUser(1, Language.FR)).household.name).toBe('Mon foyer');
    const english = service.createDefaultFor(makeUser(2, Language.EN), 'America/Montreal').household;
    expect(english.name).toBe('My household');
    expect(english.timezone).toBe('America/Montreal');
    expect(service.createDefaultFor(makeUser(3)).household.timezone).toBe('Europe/Paris');
  });

  describe('changeRole', () => {
    it('refuses to demote the last owner', async () => {
      members.findMembership.mockResolvedValue(makeMember(household, 1, HouseholdRole.OWNER));
      members.countOwners.mockResolvedValue(1);

      await expect(service.changeRole(household, 1, HouseholdRole.MEMBER)).rejects.toBeInstanceOf(ConflictException);
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('demotes an owner when another one remains', async () => {
      const member = makeMember(household, 1, HouseholdRole.OWNER);
      members.findMembership.mockResolvedValue(member);
      members.countOwners.mockResolvedValue(2);

      await service.changeRole(household, 1, HouseholdRole.MEMBER);

      expect(member.role).toBe(HouseholdRole.MEMBER);
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('promotes a member without counting owners', async () => {
      const member = makeMember(household, 2, HouseholdRole.MEMBER);
      members.findMembership.mockResolvedValue(member);

      await service.changeRole(household, 2, HouseholdRole.OWNER);

      expect(member.role).toBe(HouseholdRole.OWNER);
      expect(members.countOwners).not.toHaveBeenCalled();
    });

    it('answers 404 for someone who is not a member', async () => {
      members.findMembership.mockResolvedValue(null);

      await expect(service.changeRole(household, 99, HouseholdRole.OWNER)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('removeMember', () => {
    it('refuses to let the last owner go', async () => {
      members.findMembership.mockResolvedValue(makeMember(household, 1, HouseholdRole.OWNER));
      members.countOwners.mockResolvedValue(1);

      await expect(service.removeMember(household, 1)).rejects.toBeInstanceOf(ConflictException);
      expect(em.removeAndFlush).not.toHaveBeenCalled();
    });

    it('removes a plain member', async () => {
      const member = makeMember(household, 2, HouseholdRole.MEMBER);
      members.findMembership.mockResolvedValue(member);

      await service.removeMember(household, 2);

      expect(em.removeAndFlush).toHaveBeenCalledWith(member);
    });
  });
});
