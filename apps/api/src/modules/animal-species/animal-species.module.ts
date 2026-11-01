import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AnimalSpeciesController } from './controller/animal-species.controller';
import { AnimalSpeciesName } from './entity/animal-species-name.entity';
import { AnimalSpecies } from './entity/animal-species.entity';
import { AnimalSpeciesService } from './service/animal-species.service';

@Module({
  imports: [MikroOrmModule.forFeature([AnimalSpecies, AnimalSpeciesName])],
  controllers: [AnimalSpeciesController],
  providers: [AnimalSpeciesService],
  exports: [AnimalSpeciesService],
})
export class AnimalSpeciesModule {}
