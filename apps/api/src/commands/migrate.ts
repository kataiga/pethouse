/**
 * Brings a database up to date before a release: applies the pending migrations, then refreshes
 * the reference data (tank subtypes, parameter definitions, species, routine templates). Both
 * steps are idempotent, so it runs safely at every deploy, as a Job or an initContainer:
 *
 *   node dist/commands/migrate        (from /app/apps/api, the image's working directory)
 *
 * It reads the same DB_* variables as the API. No Nest and no CLI: the runtime image carries
 * neither ts-node nor @mikro-orm/cli.
 */

import { MikroORM } from '@mikro-orm/mysql';
import { readDatabaseConfig } from '../config/database.config';
import { buildMikroOrmConfig } from '../config/mikro-orm.config';
import { DatabaseSeeder } from '../seeders/DatabaseSeeder';

async function migrateAndSeed (orm: MikroORM): Promise<void> {
  const applied = await orm.getMigrator().up();
  console.log(applied.length === 0
    ? 'Schema already up to date'
    : `Applied ${applied.length} migration(s): ${applied.map((migration) => migration.name).join(', ')}`);

  await orm.getSeeder().seed(DatabaseSeeder);
  console.log('Reference data refreshed');
}

async function main (): Promise<void> {
  const orm = await MikroORM.init(buildMikroOrmConfig(readDatabaseConfig()));

  // The connection closes whatever happened, so a failed run still exits.
  await migrateAndSeed(orm).finally(() => orm.close(true));
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
