import { MikroORM } from '@mikro-orm/mysql';
import mikroOrmCliConfig from '../../src/config/mikro-orm.config';

/**
 * Runs once before every e2e worker: empties the database so suites start from a known state
 * without racing each other. Households cascade to members and invites, users to refresh tokens;
 * households go first because they reference their creator.
 */
export default async function globalSetup (): Promise<void> {
  process.env.NODE_ENV ??= 'test';
  const orm = await MikroORM.init({
    ...mikroOrmCliConfig(),
    discovery: { warnWhenNoEntities: false },
    entities: [],
    entitiesTs: [],
  });

  const connection = orm.em.getConnection();
  await connection.execute('DELETE FROM `households`')
    .then(() => connection.execute('DELETE FROM `users`'))
    .finally(() => orm.close(true));
}
