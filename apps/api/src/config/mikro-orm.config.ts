import { tmpdir } from 'os';
import { join } from 'path';
import {
  defineConfig, MySqlDriver, Options,
} from '@mikro-orm/mysql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import * as dotenv from 'dotenv';
import { readDatabaseConfig } from './database.config';
import { DatabaseConfig } from './types';

export interface MikroOrmOverrides {
  /** Open the connection pool at init. Tooling that only needs metadata sets it to false. */
  connect?: boolean;
  /** Log every query. On in development, off everywhere else. */
  debug?: boolean;
}

/**
 * Single source of the ORM configuration, shared by the Nest module (built after the environment
 * has been validated) and by the MikroORM CLI (default export below).
 */
export function buildMikroOrmConfig (database: DatabaseConfig, overrides: MikroOrmOverrides = {}): Options {
  return defineConfig({
    // Explicit so the Nest module built with `forRootAsync` can resolve driver-specific imports.
    driver: MySqlDriver,
    host: database.host,
    port: database.port,
    user: database.user,
    password: database.password,
    dbName: database.name,
    connect: overrides.connect ?? true,
    debug: overrides.debug ?? false,

    entities: ['dist/modules/**/*.entity.js'],
    entitiesTs: ['src/modules/**/*.entity.ts'],
    metadataProvider: TsMorphMetadataProvider,
    // The reflection provider caches parsed metadata on disk; keep it out of the working directory,
    // which is read-only for the non-root user inside the container.
    metadataCache: { options: { cacheDir: join(tmpdir(), 'pethouse-mikro-orm') } },
    // No entity exists until Phase 1 lands the first one; MikroORM refuses to boot on an empty
    // discovery by default. Remove this override together with the first entity.
    discovery: { warnWhenNoEntities: false },

    migrations: {
      tableName: 'mikro_orm_migrations',
      path: 'dist/migrations',
      pathTs: 'src/migrations',
      glob: '!(*.d).{js,ts}',
    },

    seeder: {
      path: 'dist/seeders',
      pathTs: 'src/seeders',
      defaultSeeder: 'DatabaseSeeder',
    },
  });
}

/**
 * CLI entry point (`mikro-orm migration:*`). The CLI accepts a factory, which keeps the environment
 * read lazy: importing this module from the Nest application must not touch `process.env`, since
 * ConfigModule has not loaded the env files yet at that point. No Nest here, so the files are
 * loaded by hand: real environment variables win, `.env.test` only applies under NODE_ENV=test.
 */
export default function mikroOrmCliConfig (): Options {
  dotenv.config({
    path: process.env.NODE_ENV === 'test' ? ['.env.test', '.env'] : ['.env'],
    quiet: true,
  });

  return buildMikroOrmConfig(readDatabaseConfig());
}
