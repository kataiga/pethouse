import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './support/create-test-app';

describe('Global validation and error shape (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('transforms a valid body into the DTO', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe')
      .send({
        name: 'Betta',
        quantity: 3,
      })
      .expect(201);

    expect(response.body).toEqual({
      name: 'Betta',
      quantity: 3,
    });
  });

  it('rejects an unknown property with the error shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe')
      .send({
        name: 'Betta',
        quantity: 3,
        colour: 'blue',
      })
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
      details: ['property colour should not exist'],
      path: '/api/probe',
      timestamp: expect.any(String),
    });
  });

  it('lists every violated constraint', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe')
      .send({
        name: 42,
        quantity: -1,
      })
      .expect(400);

    expect(response.body.details).toEqual(expect.arrayContaining([
      'name must be a string',
      'quantity must not be less than 0',
    ]));
  });

  it('formats a thrown HttpException', async () => {
    const response = await request(app.getHttpServer()).get('/api/probe/missing').expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Probe not found',
      path: '/api/probe/missing',
    });
    expect(response.body).not.toHaveProperty('details');
  });

  it('hides unexpected errors behind a 500', async () => {
    const response = await request(app.getHttpServer()).get('/api/probe/crash').expect(500);

    expect(response.body).toMatchObject({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Internal Server Error',
    });
    expect(JSON.stringify(response.body)).not.toContain('secret internal detail');
  });

  it('answers an unknown route with the error shape', async () => {
    const response = await request(app.getHttpServer()).get('/api/nowhere').expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      path: '/api/nowhere',
    });
  });
});
