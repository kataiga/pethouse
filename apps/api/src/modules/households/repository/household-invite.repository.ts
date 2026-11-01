import { EntityRepository } from '@mikro-orm/mysql';
import type { HouseholdInvite } from '../entity/household-invite.entity';

export class HouseholdInviteRepository extends EntityRepository<HouseholdInvite> {
  findByCode (code: string): Promise<HouseholdInvite | null> {
    return this.findOne({ code }, { populate: ['household'] });
  }

  findAllForHousehold (householdId: number): Promise<HouseholdInvite[]> {
    return this.find({ household: householdId }, { orderBy: { createdAt: 'desc' } });
  }

  /**
   * Consumes one use, atomically: the row is only touched while it is still redeemable, so two
   * concurrent redemptions of the last use cannot both succeed. Returns whether a use was taken.
   */
  async consumeUse (inviteId: number, at: Date): Promise<boolean> {
    const knex = this.getEntityManager().getKnex();
    const affected = await knex('household_invites')
      .where({ id: inviteId })
      .whereNull('revoked_at')
      .where('expires_at', '>', at)
      .whereRaw('`use_count` < `max_uses`')
      .increment('use_count', 1);

    return affected === 1;
  }
}
