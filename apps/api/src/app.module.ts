import {
  DynamicModule, Module,
} from '@nestjs/common';
import {
  ConfigModule, ConfigType,
} from '@nestjs/config';
import { MySqlDriver } from '@mikro-orm/mysql';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { LoggerModule } from '@core/logger/logger.module';
import { HealthModule } from '@modules/health/health.module';
import { buildMikroOrmConfig } from '@config/mikro-orm.config';
import { validateEnvironment } from '@config/environment';
import configs, {
  appConfig, databaseConfig,
} from '@config';

export interface AppModuleOptions {
  /**
   * Whether MikroORM opens its connection pool at boot. Disabled only by tooling that needs the
   * module graph without a database, such as the OpenAPI dump. Defaults to true.
   */
  connectDatabase?: boolean;
  /**
   * Env files to load, first match wins; real environment variables always take precedence.
   * Defaults to `.env.test` then `.env` under NODE_ENV=test, `.env` alone otherwise.
   */
  envFiles?: string[];
}

function defaultEnvFiles (): string[] {
  return process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : ['.env'];
}

@Module({})
export class AppModule {
  static forRoot (options: AppModuleOptions = {}): DynamicModule {
    const connectDatabase = options.connectDatabase ?? true;

    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          load: configs,
          validate: validateEnvironment,
          isGlobal: true,
          envFilePath: options.envFiles ?? defaultEnvFiles(),
        }),
        MikroOrmModule.forRootAsync({
          // Declared here as well as in the config: the Nest module reads it before the factory runs.
          driver: MySqlDriver,
          inject: [databaseConfig.KEY, appConfig.KEY],
          useFactory: (
            database: ConfigType<typeof databaseConfig>,
            app: ConfigType<typeof appConfig>,
          ) => buildMikroOrmConfig(database, {
            connect: connectDatabase,
            debug: app.env === 'development',
          }),
        }),
        LoggerModule,
        HealthModule,
      ],
    };
  }
}
