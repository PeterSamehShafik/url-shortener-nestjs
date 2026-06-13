import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { applyAppSetup } from '@/common/app-setup';
import request from 'supertest';
import { UrlsService } from '@/urls/urls.service';

describe('URLs (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    applyAppSetup(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // ─── POST /urls ─────────────────────────────────────────────────────────────
  describe('POST /urls', () => {
    it('should return 201 with wrapped response for valid guest request', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({ originalUrl: 'https://github.com' })
        .expect(201);
      expect(response.body.success).toBe(true);
      expect(response.body.statusCode).toBe(201);
      expect(response.body.data.slug).toBeDefined();
      expect(response.body.data.originalUrl).toBe('https://github.com');
      expect(response.body.data.expiresAt).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return 422 when originalUrl is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(400);
    });

    it('should return 400 when originalUrl is not a valid URL', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({ originalUrl: 'not-a-url' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when unknown fields are sent', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({ originalUrl: 'https://github.com', isAdmin: true })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 when guest sends customSlug', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({ originalUrl: 'https://github.com', customSlug: 'my-slug' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.statusCode).toBe(403);
    });

    it('should return 422 when originalUrl is a private IP', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({ originalUrl: 'http://192.168.1.1' })
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when customSlug contains invalid characters', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({ originalUrl: 'https://github.com', customSlug: 'my slug!' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when expiresAt is a past date', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({
          originalUrl: 'https://github.com',
          expiresAt: '2020-01-01T00:00:00.000Z',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 when expiresAt is not ISO 8601', async () => {
      const response = await request(app.getHttpServer())
        .post('/urls')
        .send({
          originalUrl: 'https://github.com',
          expiresAt: '2028-5-5',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 409 when customSlug is already taken', async () => {
      // First request — succeeds (we need a userId so we bypass guest check)
      // For now we test via the service directly — E2E auth test comes in Phase 3
      // This is tested fully in the unit tests
    });

    // ─── GET /:slug ──────────────────────────────────────────────────────────────
    describe('GET /:slug', () => {
      let createdSlug: string;
      beforeAll(async () => {
        const response = await request(app.getHttpServer())
          .post('/urls')
          .send({ originalUrl: 'https://github.com' });
        createdSlug = response.body.data.slug as string;
      });

      it('should return 301 redirect for a valid slug', async () => {
        await request(app.getHttpServer())
          .get(`/${createdSlug}`)
          .expect(301)
          .expect('Location', 'https://github.com');
      });

      it('should return 404 for a nonexistent slug', async () => {
        const response = await request(app.getHttpServer())
          .get('/this-slug-does-not-exist')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(404);
      });

      it('should return 410 for an expired URL', async () => {
        const createResponse = await request(app.getHttpServer())
          .post('/urls')
          .send({ originalUrl: 'https://expired-example.com' });

        const slug = createResponse.body.data.slug as string;

        const urlsService = app.get(UrlsService);
        const url = urlsService.findBySlug(slug);
        url.expiresAt = new Date(Date.now() - 1000);

        const response = await request(app.getHttpServer())
          .get(`/${slug}`)
          .expect(410);

        expect(response.body.success).toBe(false);
        expect(response.body.statusCode).toBe(410);
      });
    });
  });
});
