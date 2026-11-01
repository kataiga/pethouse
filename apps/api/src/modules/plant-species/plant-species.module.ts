import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PlantSpeciesController } from './controller/plant-species.controller';
import { PlantSpeciesName } from './entity/plant-species-name.entity';
import { PlantSpecies } from './entity/plant-species.entity';
import { PlantSpeciesService } from './service/plant-species.service';

@Module({
  imports: [MikroOrmModule.forFeature([PlantSpecies, PlantSpeciesName])],
  controllers: [PlantSpeciesController],
  providers: [PlantSpeciesService],
  exports: [PlantSpeciesService],
})
export class PlantSpeciesModule {}
