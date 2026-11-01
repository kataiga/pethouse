import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TankAccessGuard } from '@core/tanks/tank-access.guard';
import { AnimalSpeciesModule } from '@modules/animal-species/animal-species.module';
import { HouseholdsModule } from '@modules/households/households.module';
import { PlantSpeciesModule } from '@modules/plant-species/plant-species.module';
import { HouseholdTanksController } from './controller/household-tanks.controller';
import { TankAnimalsController } from './controller/tank-animals.controller';
import { TankPhotosController } from './controller/tank-photos.controller';
import { TankPlantsController } from './controller/tank-plants.controller';
import { TankSubtypesController } from './controller/tank-subtypes.controller';
import { TanksController } from './controller/tanks.controller';
import { TankAnimal } from './entity/tank-animal.entity';
import { TankPhoto } from './entity/tank-photo.entity';
import { TankPlant } from './entity/tank-plant.entity';
import { TankSubtype } from './entity/tank-subtype.entity';
import { Tank } from './entity/tank.entity';
import { TankAnimalsService } from './service/tank-animals.service';
import { TankPhotosService } from './service/tank-photos.service';
import { TankPlantsService } from './service/tank-plants.service';
import { TankSubtypesService } from './service/tank-subtypes.service';
import { TanksService } from './service/tanks.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([Tank, TankSubtype, TankAnimal, TankPlant, TankPhoto]),
    HouseholdsModule,
    AnimalSpeciesModule,
    PlantSpeciesModule,
  ],
  controllers: [
    TankSubtypesController,
    HouseholdTanksController,
    TanksController,
    TankAnimalsController,
    TankPlantsController,
    TankPhotosController,
  ],
  providers: [
    TanksService,
    TankSubtypesService,
    TankAnimalsService,
    TankPlantsService,
    TankPhotosService,
    TankAccessGuard,
  ],
  exports: [TanksService, TankAccessGuard],
})
export class TanksModule {}
