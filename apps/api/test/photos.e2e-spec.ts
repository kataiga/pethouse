import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import {
  bearer, registerAccount, TestSession,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

/** A valid 1x1 PNG, enough for MinIO to store and serve. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Tank photos (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTank (session: TestSession): Promise<number> {
    const households = await request(app.getHttpServer())
      .get('/api/households')
      .set(bearer(session.accessToken))
      .expect(200);
    const tank = await request(app.getHttpServer())
      .post(`/api/households/${households.body[0].id}/tanks`)
      .set(bearer(session.accessToken))
      .send({
        name: 'Photographed',
        tankType: 'AQUARIUM',
      })
      .expect(201);

    return tank.body.id;
  }

  async function upload (session: TestSession, tankId: number): Promise<string> {
    const prepared = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/photos/upload-url`)
      .set(bearer(session.accessToken))
      .send({
        contentType: 'image/png',
        sizeBytes: PNG.length,
      })
      .expect(201);
    expect(prepared.body).toMatchObject({
      method: 'PUT',
      expiresAt: expect.any(String),
    });
    expect(prepared.body.storageKey.startsWith(`tanks/${tankId}/`)).toBe(true);
    expect(prepared.body.storageKey.endsWith('.png')).toBe(true);

    // The client talks to the bucket directly, exactly as the app will.
    const put = await fetch(prepared.body.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(PNG.length),
      },
      body: PNG,
    });
    expect(put.status).toBe(200);

    return prepared.body.storageKey;
  }

  it('uploads through a pre-signed URL, registers the key, and serves the photo publicly', async () => {
    const session = await registerAccount(app, { displayName: 'Photographer' });
    const tankId = await createTank(session);
    const storageKey = await upload(session, tankId);

    const registered = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/photos`)
      .set(bearer(session.accessToken))
      .send({
        storageKey,
        caption: 'Day one',
        takenAt: '2026-01-01T09:00:00.000Z',
      })
      .expect(201);
    expect(registered.body).toMatchObject({
      id: expect.any(Number),
      url: expect.stringContaining(storageKey),
      contentType: 'image/png',
      sizeBytes: PNG.length,
      caption: 'Day one',
      takenAt: '2026-01-01T09:00:00.000Z',
      uploadedBy: {
        id: session.userId,
        displayName: 'Photographer',
      },
    });

    // Anonymous read, straight from the bucket.
    const served = await fetch(registered.body.url);
    expect(served.status).toBe(200);
    expect(Buffer.from(await served.arrayBuffer()).equals(PNG)).toBe(true);

    const listed = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/photos`)
      .set(bearer(session.accessToken))
      .expect(200);
    expect(listed.body).toHaveLength(1);

    await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/photos`)
      .set(bearer(session.accessToken))
      .send({ storageKey })
      .expect(409);
  });

  it('refuses a key with nothing behind it, a key of another tank, and a bad content type', async () => {
    const session = await registerAccount(app);
    const tankId = await createTank(session);
    const otherTankId = await createTank(session);
    const storageKey = await upload(session, tankId);

    await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/photos`)
      .set(bearer(session.accessToken))
      .send({ storageKey: `tanks/${tankId}/0f8fad5b-d9cb-469f-a165-70867728950e.png` })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/tanks/${otherTankId}/photos`)
      .set(bearer(session.accessToken))
      .send({ storageKey })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/photos/upload-url`)
      .set(bearer(session.accessToken))
      .send({
        contentType: 'application/pdf',
        sizeBytes: 10,
      })
      .expect(400);
  });

  it('sets a cover photo on the tank, edits the caption, and deletes the photo with its object', async () => {
    const session = await registerAccount(app);
    const stranger = await registerAccount(app);
    const tankId = await createTank(session);
    const storageKey = await upload(session, tankId);
    const photo = await request(app.getHttpServer())
      .post(`/api/tanks/${tankId}/photos`)
      .set(bearer(session.accessToken))
      .send({ storageKey })
      .expect(201);

    const covered = await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}`)
      .set(bearer(session.accessToken))
      .send({ coverPhotoId: photo.body.id })
      .expect(200);
    expect(covered.body.coverPhoto).toEqual({
      id: photo.body.id,
      url: photo.body.url,
    });

    const otherTankId = await createTank(session);
    await request(app.getHttpServer())
      .patch(`/api/tanks/${otherTankId}`)
      .set(bearer(session.accessToken))
      .send({ coverPhotoId: photo.body.id })
      .expect(404);

    const captioned = await request(app.getHttpServer())
      .patch(`/api/tanks/${tankId}/photos/${photo.body.id}`)
      .set(bearer(session.accessToken))
      .send({
        caption: 'Cover',
        takenAt: null,
      })
      .expect(200);
    expect(captioned.body).toMatchObject({
      caption: 'Cover',
      takenAt: null,
    });

    await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}/photos`)
      .set(bearer(stranger.accessToken))
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/tanks/${tankId}/photos/${photo.body.id}`)
      .set(bearer(session.accessToken))
      .expect(204);
    const gone = await fetch(photo.body.url);
    expect(gone.status).toBe(404);
    const afterDelete = await request(app.getHttpServer())
      .get(`/api/tanks/${tankId}`)
      .set(bearer(session.accessToken))
      .expect(200);
    expect(afterDelete.body.coverPhoto).toBeNull();
  });
});
