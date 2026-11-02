import { NotFoundException } from '@nestjs/common';
import { User } from '@modules/users/entity/user.entity';
import { HouseholdInvite } from '../entity/household-invite.entity';
import { HouseholdMember } from '../entity/household-member.entity';
import { HouseholdRole } from '../entity/household-role.enum';
import { Household } from '../entity/household.entity';
import { HouseholdInviteRepository } from '../repository/household-invite.repository';
import { HouseholdMemberRepository } from '../repository/household-member.repository';
import {
  generateInviteCode, InvitesService,
} from './invites.service';

function makeInvite (overrides: Partial<HouseholdInvite> = {}): HouseholdInvite {
  const invite = new HouseholdInvite();
  invite.id = 5;
  invite.household = Object.assign(new Household(), { id: 10 });
  invite.code = 'code';
  invite.expiresAt = new Date(Date.now() + 60_000);
  invite.maxUses = 2;
  invite.useCount = 0;
  Object.assign(invite, overrides);

  return invite;
}

describe('generateInviteCode', () => {
  it('produces 12 URL-safe characters, different every time', () => {
    const codes = new Set(Array.from({ length: 50 }, generateInviteCode));

    expect(codes.size).toBe(50);
    for (const code of codes) {
      expect(code).toMatch(/^[A-Za-z0-9_-]{12}$/);
    }
  });
});

describe('InvitesService', () => {
  const em = {
    count: jest.fn(),
    nativeDelete: jest.fn(),
    flush: jest.fn(),
    persistAndFlush: jest.fn(),
    transactional: jest.fn(async <T>(work: () => Promise<T>): Promise<T> => work()),
  };
  const invites = {
    create: jest.fn((data: Partial<HouseholdInvite>) => Object.assign(new HouseholdInvite(), data)),
    findOne: jest.fn(),
    findByCode: jest.fn(),
    consumeUse: jest.fn(),
    getEntityManager: () => em,
  };
  const members = {
    create: jest.fn((data: Partial<HouseholdMember>) => Object.assign(new HouseholdMember(), data)),
    findMembership: jest.fn(),
    findAllForUser: jest.fn(),
    count: jest.fn(),
  };
  const user = Object.assign(new User(), { id: 3 });
  let service: InvitesService;

  beforeEach(() => {
    jest.clearAllMocks();
    members.findAllForUser.mockResolvedValue([]);
    service = new InvitesService(
      invites as unknown as HouseholdInviteRepository,
      members as unknown as HouseholdMemberRepository,
    );
  });

  it('creates an invite with the defaults: one week, ten uses', async () => {
    const household = Object.assign(new Household(), { id: 10 });
    const before = Date.now();

    const invite = await service.create(household, user, {});

    expect(invite.maxUses).toBe(10);
    expect(invite.expiresAt.getTime() - before).toBeGreaterThanOrEqual(7 * 24 * 3_600_000 - 1000);
    expect(invite.code).toHaveLength(12);
    expect(em.persistAndFlush).toHaveBeenCalledWith(invite);
  });

  describe('redeem', () => {
    it.each([
      ['unknown', null],
      ['expired', makeInvite({ expiresAt: new Date(Date.now() - 1000) })],
      ['revoked', makeInvite({ revokedAt: new Date() })],
      ['exhausted', makeInvite({ useCount: 2 })],
    ])('answers the same 404 for an %s code', async (_label, invite) => {
      invites.findByCode.mockResolvedValue(invite);
      members.findMembership.mockResolvedValue(null);

      await expect(service.redeem('code', user)).rejects.toMatchObject({
        constructor: NotFoundException,
        message: 'Invite not found or no longer valid',
      });
      expect(invites.consumeUse).not.toHaveBeenCalled();
    });

    it('returns the existing membership without consuming a use, even on a dead invite', async () => {
      const existing = new HouseholdMember();
      invites.findByCode.mockResolvedValue(makeInvite({ useCount: 2 }));
      members.findMembership.mockResolvedValue(existing);

      await expect(service.redeem('code', user)).resolves.toBe(existing);
      expect(invites.consumeUse).not.toHaveBeenCalled();
    });

    it('consumes a use atomically and creates a MEMBER membership', async () => {
      const invite = makeInvite();
      invites.findByCode.mockResolvedValue(invite);
      members.findMembership.mockResolvedValue(null);
      invites.consumeUse.mockResolvedValue(true);

      const membership = await service.redeem('code', user);

      expect(invites.consumeUse).toHaveBeenCalledWith(5, expect.any(Date));
      expect(membership.role).toBe(HouseholdRole.MEMBER);
      expect(membership.household).toBe(invite.household);
      expect(em.persistAndFlush).toHaveBeenCalledWith(membership);
    });

    describe('the redeemer\'s other households', () => {
      function membershipOf (householdId: number): HouseholdMember {
        return Object.assign(new HouseholdMember(), { household: Object.assign(new Household(), { id: householdId }) });
      }

      /** Household id → [member count, tank count]. */
      function arrange (contents: Record<number, [number, number]>): void {
        invites.findByCode.mockResolvedValue(makeInvite());
        members.findMembership.mockResolvedValue(null);
        invites.consumeUse.mockResolvedValue(true);
        members.findAllForUser.mockResolvedValue([10, ...Object.keys(contents).map(Number)].map(membershipOf));
        members.count.mockImplementation(
          ({ household }: { household: number }) => Promise.resolve(contents[household][0]),
        );
        em.count.mockImplementation(
          (_entity: unknown, { household }: { household: number }) => Promise.resolve(contents[household][1]),
        );
      }

      it('drops the ones holding nothing, after the membership is saved', async () => {
        arrange({ 20: [1, 0] });

        const membership = await service.redeem('code', user);

        expect(em.nativeDelete).toHaveBeenCalledWith(Household, { id: { $in: [20] } });
        expect(em.persistAndFlush.mock.invocationCallOrder[0])
          .toBeLessThan(em.nativeDelete.mock.invocationCallOrder[0]);
        expect(membership.household.id).toBe(10);
      });

      it('keeps one with a tank or another member, and never looks at the joined one', async () => {
        arrange({
          20: [1, 2],
          30: [2, 0],
          40: [1, 0],
        });

        await service.redeem('code', user);

        expect(em.nativeDelete).toHaveBeenCalledWith(Household, { id: { $in: [40] } });
        expect(members.count).not.toHaveBeenCalledWith({ household: 10 });
      });

      it('deletes nothing when every other household is in use', async () => {
        arrange({ 20: [3, 0] });

        await service.redeem('code', user);

        expect(em.nativeDelete).not.toHaveBeenCalled();
      });

      it('leaves everything alone on a repeat redeem', async () => {
        invites.findByCode.mockResolvedValue(makeInvite());
        members.findMembership.mockResolvedValue(new HouseholdMember());

        await service.redeem('code', user);

        expect(members.findAllForUser).not.toHaveBeenCalled();
        expect(em.nativeDelete).not.toHaveBeenCalled();
      });
    });

    it('fails when the last use was taken concurrently', async () => {
      invites.findByCode.mockResolvedValue(makeInvite());
      members.findMembership.mockResolvedValue(null);
      invites.consumeUse.mockResolvedValue(false);

      await expect(service.redeem('code', user)).rejects.toBeInstanceOf(NotFoundException);
      expect(members.create).not.toHaveBeenCalled();
    });
  });

  it('revokes once and stays idempotent', async () => {
    const invite = makeInvite();
    invites.findOne.mockResolvedValue(invite);

    await service.revoke(invite.household, 5);
    const revokedAt = invite.revokedAt;
    await service.revoke(invite.household, 5);

    expect(revokedAt).toBeInstanceOf(Date);
    expect(invite.revokedAt).toBe(revokedAt);
    expect(em.flush).toHaveBeenCalledTimes(1);
  });
});
