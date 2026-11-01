import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { OccurrenceAccessGuard } from '@core/routines/occurrence-access.guard';
import { HouseholdsModule } from '@modules/households/households.module';
import { TanksModule } from '@modules/tanks/tanks.module';
import { RoutineHistoryController } from './controller/routine-history.controller';
import { RoutineOccurrencesController } from './controller/routine-occurrences.controller';
import { RoutineTemplatesController } from './controller/routine-templates.controller';
import { RoutinesController } from './controller/routines.controller';
import { RoutineOccurrence } from './entity/routine-occurrence.entity';
import { RoutineTemplate } from './entity/routine-template.entity';
import { Routine } from './entity/routine.entity';
import { RoutineOccurrencesService } from './service/routine-occurrences.service';
import { RoutineTemplatesService } from './service/routine-templates.service';
import { RoutinesService } from './service/routines.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([RoutineTemplate, Routine, RoutineOccurrence]),
    HouseholdsModule,
    TanksModule,
  ],
  controllers: [
    RoutineTemplatesController,
    RoutinesController,
    RoutineHistoryController,
    RoutineOccurrencesController,
  ],
  providers: [
    RoutineTemplatesService,
    RoutinesService,
    RoutineOccurrencesService,
    OccurrenceAccessGuard,
  ],
  exports: [RoutineOccurrencesService, MikroOrmModule],
})
export class RoutinesModule {}
