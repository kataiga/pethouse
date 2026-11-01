import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HouseholdsModule } from '@modules/households/households.module';
import { TanksModule } from '@modules/tanks/tanks.module';
import { MeasurementsController } from './controller/measurements.controller';
import { ParameterDefinitionsController } from './controller/parameter-definitions.controller';
import { ParameterSettingsController } from './controller/parameter-settings.controller';
import { TankParametersController } from './controller/tank-parameters.controller';
import { Measurement } from './entity/measurement.entity';
import { ParameterDefinition } from './entity/parameter-definition.entity';
import { TankParameterOverride } from './entity/tank-parameter-override.entity';
import { UserParameterSetting } from './entity/user-parameter-setting.entity';
import { MeasurementsService } from './service/measurements.service';
import { ParameterDefinitionsService } from './service/parameter-definitions.service';
import { ParameterSettingsService } from './service/parameter-settings.service';
import { TankParametersService } from './service/tank-parameters.service';

@Module({
  imports: [
    MikroOrmModule.forFeature([ParameterDefinition, UserParameterSetting, TankParameterOverride, Measurement]),
    HouseholdsModule,
    TanksModule,
  ],
  controllers: [
    ParameterDefinitionsController,
    ParameterSettingsController,
    TankParametersController,
    MeasurementsController,
  ],
  providers: [ParameterDefinitionsService, ParameterSettingsService, TankParametersService, MeasurementsService],
  exports: [TankParametersService, ParameterDefinitionsService],
})
export class ParametersModule {}
