import { MikroORM } from '@mikro-orm/mysql';
import mikroOrmCliConfig from '../../src/config/mikro-orm.config';

/**
 * Runs once before every e2e worker: empties the database so suites start from a known state
 * without racing each other. `users` is the root of every `ON DELETE CASCADE` chain, so one
 * statement is enough; keep it that way when adding tables.
 */
export default async function globalSetup (): Promise<void> {
  process.env.NODE_ENV ??= 'test';
  const orm = await MikroORM.init({
    ...mikroOrmCliConfig(),
    discovery: { warnWhenNoEntities: false },
    entities: [],
    entitiesTs: [],
  });

  await orm.em.getConnection().execute('DELETE FROM `users`').finally(() => orm.close(true));
}
