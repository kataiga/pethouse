import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TankAccessGuard } from '@core/tanks/tank-access.guard';
import { HouseholdsModule } from '@modules/households/households.module';
import { HouseholdTanksController } from './controller/household-tanks.controller';
import { TankSubtypesController } from './controller/tank-subtypes.controller';
import { TanksController } from './controller/tanks.controller';
import { TankSubtype } from './entity/tank-subtype.entity';
import { Tank } from './entity/tank.entity';
import { TankSubtypesService } from './service/tank-subtypes.service';
import { TanksService } from './service/tanks.service';

@Module({
  imports: [MikroOrmModule.forFeature([Tank, TankSubtype]), HouseholdsModule],
  controllers: [TankSubtypesController, HouseholdTanksController, TanksController],
  providers: [TanksService, TankSubtypesService, TankAccessGuard],
  exports: [TanksService, TankAccessGuard],
})
export class TanksModule {}
