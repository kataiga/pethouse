import { randomBytes } from 'crypto';
import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Tank } from '@modules/tanks/entity/tank.entity';
import { User } from '@modules/users/entity/user.entity';
import {
  CreateInviteDto, DEFAULT_INVITE_HOURS, DEFAULT_INVITE_USES,
} from '../dto/create-invite.dto';
import { HouseholdInvite } from '../entity/household-invite.entity';
import { HouseholdMember } from '../entity/household-member.entity';
import { HouseholdRole } from '../entity/household-role.enum';
import { Household } from '../entity/household.entity';
import { HouseholdInviteRepository } from '../repository/household-invite.repository';
import { HouseholdMemberRepository } from '../repository/household-member.repository';

const CODE_BYTES = 9;
const HOUR_MS = 3_600_000;

/** Same answer for unknown, expired, revoked and exhausted codes: none of them is worth a hint. */
export const INVITE_NOT_FOUND_MESSAGE = 'Invite not found or no longer valid';

/** 72 random bits as 12 URL-safe characters. */
export function generateInviteCode (): string {
  return randomBytes(CODE_BYTES).toString('base64url');
}

@Injectable()
export class InvitesService {
  constructor (
    @InjectRepository(HouseholdInvite)
    private readonly invites: HouseholdInviteRepository,
    @InjectRepository(HouseholdMember)
    private readonly members: HouseholdMemberRepository,
  ) {}

  async create (household: Household, createdBy: User, dto: CreateInviteDto): Promise<HouseholdInvite> {
    const hours = dto.expiresInHours ?? DEFAULT_INVITE_HOURS;
    const invite = this.invites.create({
      household,
      createdBy,
      code: generateInviteCode(),
      expiresAt: new Date(Date.now() + hours * HOUR_MS),
      maxUses: dto.maxUses ?? DEFAULT_INVITE_USES,
    });
    await this.invites.getEntityManager().persistAndFlush(invite);

    return invite;
  }

  list (household: Household): Promise<HouseholdInvite[]> {
    return this.invites.findAllForHousehold(household.id);
  }

  async revoke (household: Household, inviteId: number): Promise<HouseholdInvite> {
    const invite = await this.invites.findOne({
      id: inviteId,
      household,
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if ((invite.revokedAt ?? null) === null) {
      invite.revokedAt = new Date();
      await this.invites.getEntityManager().flush();
    }

    return invite;
  }

  /**
   * Makes the user a MEMBER of the invite's household. Redeeming while already a member is a
   * no-op that returns the existing membership, whatever the state of the invite: a double tap
   * on the link does no harm and consumes nothing.
   *
   * Joining also drops the user's other households that hold nothing — no tank, no other
   * member. The one created at sign-up is the usual case: the app shows a single household, so
   * an empty leftover would only linger out of sight.
   */
  async redeem (code: string, user: User): Promise<HouseholdMember> {
    const now = new Date();
    const invite = await this.invites.findByCode(code);

    if (!invite) {
      throw new NotFoundException(INVITE_NOT_FOUND_MESSAGE);
    }

    const existing = await this.members.findMembership(invite.household.id, user.id);

    if (existing) {
      return existing;
    }

    if (!invite.isRedeemable(now)) {
      throw new NotFoundException(INVITE_NOT_FOUND_MESSAGE);
    }

    const em = this.invites.getEntityManager();

    return em.transactional(async () => {
      if (!(await this.invites.consumeUse(invite.id, now))) {
        throw new NotFoundException(INVITE_NOT_FOUND_MESSAGE);
      }

      const membership = this.members.create({
        household: invite.household,
        user,
        role: HouseholdRole.MEMBER,
      });
      await em.persistAndFlush(membership);
      await this.dropEmptyHouseholds(user, invite.household);

      return membership;
    });
  }

  private async dropEmptyHouseholds (user: User, joined: Household): Promise<void> {
    const em = this.invites.getEntityManager();
    const others = (await this.members.findAllForUser(user.id))
      .map(({ household }) => household)
      .filter((household) => household.id !== joined.id);
    const verdicts = await Promise.all(others.map(async (household) => {
      const [memberCount, tankCount] = await Promise.all([
        this.members.count({ household: household.id }),
        em.count(Tank, { household: household.id }),
      ]);

      return memberCount === 1 && tankCount === 0 ? household.id : null;
    }));
    const emptyIds = verdicts.filter((id): id is number => id !== null);

    if (emptyIds.length > 0) {
      await em.nativeDelete(Household, { id: { $in: emptyIds } });
    }
  }
}
