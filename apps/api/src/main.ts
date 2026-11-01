import { Logger as NestLogger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { appConfig } from '@config';
import {
  API_PREFIX, createApp,
} from './bootstrap/create-app';
import { OPENAPI_PATH } from './bootstrap/openapi';

async function bootstrap (): Promise<void> {
  const app = await createApp();
  const { port } = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.enableShutdownHooks();
  await app.listen(port);

  const url = await app.getUrl();
  app.get(Logger).log(`API listening on ${url}/${API_PREFIX}, documentation on ${url}/${OPENAPI_PATH}`);
}

bootstrap().catch((error: unknown) => {
  // The pino logger lives inside the application that failed to start; fall back to Nest's own.
  new NestLogger('Bootstrap').error(error);
  process.exit(1);
});
