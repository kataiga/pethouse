import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HouseholdMemberGuard } from '@core/households/household-member.guard';
import { HouseholdsController } from './controller/households.controller';
import { InvitesController } from './controller/invites.controller';
import { HouseholdInvite } from './entity/household-invite.entity';
import { HouseholdMember } from './entity/household-member.entity';
import { Household } from './entity/household.entity';
import { HouseholdsService } from './service/households.service';
import { InvitesService } from './service/invites.service';

@Module({
  imports: [MikroOrmModule.forFeature([Household, HouseholdMember, HouseholdInvite])],
  controllers: [HouseholdsController, InvitesController],
  providers: [HouseholdsService, InvitesService, HouseholdMemberGuard],
  exports: [HouseholdsService],
})
export class HouseholdsModule {}
