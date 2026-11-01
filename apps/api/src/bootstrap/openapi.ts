import { INestApplication } from '@nestjs/common';
import {
  DocumentBuilder, OpenAPIObject, SwaggerModule,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '@common/dto/error-response.dto';

/** Served outside the global prefix: `/docs` for the UI, `/docs-json` for the raw spec. */
export const OPENAPI_PATH = 'docs';

export const API_VERSION = '0.0.1';

export function buildOpenApiDocument (app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Pethouse API')
    .setDescription('Aquarium, terrarium and paludarium tracker with collaborative maintenance routines.')
    .setVersion(API_VERSION)
    .build();

  // The error shape is produced by the global filter for every route, so it is always part of
  // the contract even when no endpoint declares it explicitly.
  return SwaggerModule.createDocument(app, config, { extraModels: [ErrorResponseDto] });
}

export function setupOpenApi (app: INestApplication): void {
  SwaggerModule.setup(OPENAPI_PATH, app, () => buildOpenApiDocument(app));
}
