import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { Language } from '../src/common/enums/language.enum';
import {
  bearer, registerAccount,
} from './support/auth';
import { createTestApp } from './support/create-test-app';

describe('Catalogue (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('animal species', () => {
    it('is seeded, paginated and sorted by scientific name', async () => {
      const session = await registerAccount(app);

      const first = await request(app.getHttpServer())
        .get('/api/animal-species')
        .query({ limit: 5 })
        .set(bearer(session.accessToken))
        .expect(200);

      expect(first.body).toMatchObject({
        total: 100,
        page: 1,
        limit: 5,
      });
      expect(first.body.data).toHaveLength(5);
      const names = first.body.data.map((row: { scientificName: string }) => row.scientificName);
      expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
      expect(first.body.data[0]).toMatchObject({
        id: expect.any(Number),
        commonName: expect.any(String),
        commonNames: {
          fr: expect.any(String),
          en: expect.any(String),
        },
        isSystem: true,
      });

      const last = await request(app.getHttpServer())
        .get('/api/animal-species')
        .query({
          limit: 30,
          page: 4,
        })
        .set(bearer(session.accessToken))
        .expect(200);
      expect(last.body.data).toHaveLength(10);
    });

    it('searches scientific and common names in either language, with a group filter', async () => {
      const session = await registerAccount(app);

      const byScientific = await request(app.getHttpServer())
        .get('/api/animal-species')
        .query({ search: 'betta spl' })
        .set(bearer(session.accessToken))
        .expect(200);
      const scientificNames = byScientific.body.data.map((row: { scientificName: string }) => row.scientificName);
      expect(scientificNames).toContain('Betta splendens');

      const byFrench = await request(app.getHttpServer())
        .get('/api/animal-species')
        .query({ search: 'combattant' })
        .set(bearer(session.accessToken))
        .expect(200);
      expect(byFrench.body.data[0].scientificName).toBe('Betta splendens');

      const shrimp = await request(app.getHttpServer())
        .get('/api/animal-species')
        .query({ animalGroup: 'INVERTEBRATE' })
        .set(bearer(session.accessToken))
        .expect(200);
      expect(shrimp.body.total).toBeGreaterThan(0);
      expect(shrimp.body.data.every((row: { animalGroup: string }) => row.animalGroup === 'INVERTEBRATE')).toBe(true);

      const wildcard = await request(app.getHttpServer())
        .get('/api/animal-species')
        .query({ search: '%' })
        .set(bearer(session.accessToken))
        .expect(200);
      expect(wildcard.body.total).toBe(0);
    });

    it('resolves the common name in the caller language and falls back to English', async () => {
      const french = await registerAccount(app);
      const english = await registerAccount(app, { preferredLanguage: Language.EN });

      const fr = await request(app.getHttpServer())
        .get('/api/animal-species')
        .query({ search: 'Betta splendens' })
        .set(bearer(french.accessToken))
        .expect(200);
      const en = await request(app.getHttpServer())
        .get(`/api/animal-species/${fr.body.data[0].id}`)
        .set(bearer(english.accessToken))
        .expect(200);

      expect(fr.body.data[0].commonName).toBe(fr.body.data[0].commonNames.fr);
      expect(en.body.commonName).toBe(en.body.commonNames.en);
      await request(app.getHttpServer()).get('/api/animal-species/999999').set(bearer(french.accessToken)).expect(404);
    });

    it('validates the query', async () => {
      const session = await registerAccount(app);

      await request(app.getHttpServer())
        .get('/api/animal-species')
        .query({
          limit: 500,
          animalGroup: 'DRAGON',
        })
        .set(bearer(session.accessToken))
        .expect(400);
    });
  });

  describe('plant species', () => {
    it('is seeded, searchable and filterable by placement', async () => {
      const session = await registerAccount(app);

      const all = await request(app.getHttpServer())
        .get('/api/plant-species')
        .query({ limit: 100 })
        .set(bearer(session.accessToken))
        .expect(200);
      expect(all.body.total).toBe(50);
      expect(all.body.data[0]).toMatchObject({
        lightRequirement: expect.any(String),
        placement: expect.any(String),
        co2Required: expect.any(Boolean),
      });

      const anubias = await request(app.getHttpServer())
        .get('/api/plant-species')
        .query({ search: 'anubias' })
        .set(bearer(session.accessToken))
        .expect(200);
      expect(anubias.body.total).toBeGreaterThanOrEqual(2);

      const floating = await request(app.getHttpServer())
        .get('/api/plant-species')
        .query({ placement: 'FLOATING' })
        .set(bearer(session.accessToken))
        .expect(200);
      expect(floating.body.data.every((row: { placement: string }) => row.placement === 'FLOATING')).toBe(true);

      await request(app.getHttpServer())
        .get(`/api/plant-species/${anubias.body.data[0].id}`)
        .set(bearer(session.accessToken))
        .expect(200);
    });
  });
});
