import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './support/create-test-app';

describe('Health and documentation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health reports the database as up', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body).toEqual({
      status: 'ok',
      details: { database: { status: 'up' } },
    });
  });

  it('GET /health is not served outside the prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(404);
  });

  it('GET /docs-json exposes the health endpoint with its typed response', async () => {
    const response = await request(app.getHttpServer()).get('/docs-json').expect(200);

    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.paths['/api/health'].get.responses['200'].content['application/json'].schema)
      .toEqual({ $ref: '#/components/schemas/HealthResponseDto' });
    expect(response.body.components.schemas).toHaveProperty('HealthResponseDto');
    expect(response.body.components.schemas).toHaveProperty('ErrorResponseDto');
  });

  it('GET /docs serves the Swagger UI', async () => {
    const response = await request(app.getHttpServer()).get('/docs').expect(200);

    expect(response.text).toContain('swagger-ui');
  });
});
