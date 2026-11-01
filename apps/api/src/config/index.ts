import appConfig from './app.config';
import databaseConfig from './database.config';
import jwtConfig from './jwt.config';
import loggerConfig from './logger.config';
import pushConfig from './push.config';
import redisConfig from './redis.config';
import s3Config from './s3.config';
import schedulerConfig from './scheduler.config';

export default [
  appConfig,
  loggerConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  s3Config,
  pushConfig,
  schedulerConfig,
];

export {
  appConfig,
  loggerConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  s3Config,
  pushConfig,
  schedulerConfig,
};
