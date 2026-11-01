import {
  INestApplication, ValidationPipe,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import {
  AppModule, AppModuleOptions,
} from '../app.module';
import { appConfig } from '@config';
import { HttpExceptionFilter } from '@core/filters/http-exception.filter';
import { setupOpenApi } from './openapi';

export const API_PREFIX = 'api';

/**
 * Applies the HTTP pipeline to an application instance. Shared by `main.ts`, the OpenAPI dump and
 * the e2e suite so that every entry point runs the exact same prefix, validation, error shape,
 * CORS policy and documentation.
 */
export function configureApp (app: INestApplication): INestApplication {
  const { corsOrigins } = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({ origin: corsOrigins });
  setupOpenApi(app);

  return app;
}

/** Creates a fully configured application that has not started listening yet. */
export async function createApp (options: AppModuleOptions = {}): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule.forRoot(options), { bufferLogs: true });
  app.useLogger(app.get(Logger));

  return configureApp(app);
}
