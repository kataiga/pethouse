// Jest's moduleNameMapper does not apply to globalSetup; the seeders use the path aliases.
import 'tsconfig-paths/register';
import { MikroORM } from '@mikro-orm/mysql';
import mikroOrmCliConfig from '../../src/config/mikro-orm.config';
import { DatabaseSeeder } from '../../src/seeders/DatabaseSeeder';

/**
 * Runs once before every e2e worker: empties the user data so suites start from a known state
 * without racing each other, then seeds the system lists the suites rely on. Households cascade
 * to members, invites and tanks, users to refresh tokens; households go first because they
 * reference their creator. System subtypes have no household and survive the cleanup.
 */
export default async function globalSetup (): Promise<void> {
  process.env.NODE_ENV ??= 'test';
  const orm = await MikroORM.init(mikroOrmCliConfig());

  const connection = orm.em.getConnection();
  await connection.execute('DELETE FROM `households`')
    .then(() => connection.execute('DELETE FROM `users`'))
    .then(() => orm.getSeeder().seed(DatabaseSeeder))
    .finally(() => orm.close(true));
}
