import {
  DynamicModule, Module,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { LoggerModule } from '@core/logger/logger.module';
import { HealthModule } from '@modules/health/health.module';
import mikroOrmConfig from '@config/mikro-orm.config';
import configs from '@config';

export interface AppModuleOptions {
  /**
   * Whether MikroORM opens its connection pool at boot. Disabled only by tooling that needs the
   * module graph without a database, such as the OpenAPI dump. Defaults to true.
   */
  connectDatabase?: boolean;
}

/** Placeholder satisfying MikroORM's option validation when no database is ever contacted. */
const DISCONNECTED_DB_NAME = 'disconnected';

@Module({})
export class AppModule {
  static forRoot (options: AppModuleOptions = {}): DynamicModule {
    const connectDatabase = options.connectDatabase ?? true;

    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          load: configs,
          isGlobal: true,
          envFilePath: '.env',
        }),
        MikroOrmModule.forRoot(connectDatabase
          ? mikroOrmConfig
          : {
            ...mikroOrmConfig,
            connect: false,
            dbName: mikroOrmConfig.dbName ?? DISCONNECTED_DB_NAME,
          }),
        LoggerModule,
        HealthModule,
      ],
    };
  }
}
