import { DataSource, Repository } from 'typeorm';
import * as dotenv from 'dotenv';
import { Url } from '@/urls/entities/url.entity';
import { UrlTag } from '@/urls/entities/url-tag.entity';
import { User } from '@/users/entities/user.entity';
import { UrlsRepository } from './urls.repository';

import {
  describe,
  it,
  expect,
  afterEach,
  beforeAll,
  afterAll,
} from '@jest/globals';
import { UrlAnalytic } from '../analytics/entities/url-analytic.entity';
dotenv.config({ path: '.env.test' });

describe('UrlsRepository', () => {
  let dataSource: DataSource;
  let typeOrmRepo: Repository<Url>;
  let repository: UrlsRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User, Url, UrlAnalytic, UrlTag],
    });

    await dataSource.initialize();
    typeOrmRepo = dataSource.getRepository(Url);
    repository = new UrlsRepository(typeOrmRepo);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  afterEach(async () => {
    await dataSource.query('TRUNCATE TABLE "urls" CASCADE');
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  function makeCreateData(
    overrides: Partial<{
      originalUrl: string;
      slug: string;
      userId: string | null;
      expiresAt: Date | null;
    }> = {},
  ) {
    return {
      originalUrl: 'https://github.com',
      slug: 'abc123',
      userId: null,
      expiresAt: null,
      ...overrides,
    };
  }

  // ─── create() ────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('should persist a URL and return it with generated fields', async () => {
      const result = await repository.create(makeCreateData());

      expect(result.id).toBeDefined();
      expect(result.slug).toBe('abc123');
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should enforce unique constraint on slug at the database level', async () => {
      await repository.create(makeCreateData({ slug: 'duplicate' }));

      await expect(
        repository.create(makeCreateData({ slug: 'duplicate' })),
      ).rejects.toThrow();
    });
  });

  // ─── findBySlug() ────────────────────────────────────────────────────────

  describe('findBySlug()', () => {
    it('should return the URL when it exists', async () => {
      await repository.create(makeCreateData({ slug: 'findme' }));

      const result = await repository.findBySlug('findme');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('findme');
    });

    it('should return null when slug does not exist', async () => {
      const result = await repository.findBySlug('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── findById() ──────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('should return the URL when it exists', async () => {
      const created = await repository.create(makeCreateData());

      const result = await repository.findById(created.id);

      expect(result!.id).toBe(created.id);
    });

    it('should return null when id does not exist', async () => {
      const result = await repository.findById(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  // ─── findAllByUserId() ───────────────────────────────────────────────────

  describe('findAllByUserId()', () => {
    it('should return only URLs belonging to the given user', async () => {
      const userId = '11111111-1111-1111-1111-111111111111';
      const otherUserId = '22222222-2222-2222-2222-222222222222';

      await repository.create(makeCreateData({ slug: 'u1-a', userId }));
      await repository.create(makeCreateData({ slug: 'u1-b', userId }));
      await repository.create(
        makeCreateData({ slug: 'u2-a', userId: otherUserId }),
      );

      const results = await repository.findAllByUserId(userId);

      expect(results).toHaveLength(2);
      expect(results.every((u) => u.userId === userId)).toBe(true);
    });

    it('should return results ordered by createdAt descending', async () => {
      const userId = 'e2d8e7e5-dd8e-4f30-82db-5f1d1cf2179f';

      const first = await repository.create(
        makeCreateData({ slug: 'first', userId }),
      );
      const second = await repository.create(
        makeCreateData({ slug: 'second', userId }),
      );

      const results = await repository.findAllByUserId(userId);

      expect(results[0].id).toBe(second.id);
      expect(results[1].id).toBe(first.id);
    });
  });

  // ─── update() ────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('should update fields and return the updated entity', async () => {
      const created = await repository.create(makeCreateData());

      const result = await repository.update(created.id, {
        isActive: false,
      });

      expect(result!.isActive).toBe(false);
    });

    it('should set expiresAt to null when explicitly passed null', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const created = await repository.create(
        makeCreateData({ expiresAt: futureDate }),
      );

      const result = await repository.update(created.id, {
        expiresAt: null,
      });

      expect(result!.expiresAt).toBeNull();
    });

    it('should return null when updating a nonexistent id', async () => {
      const result = await repository.update(
        '00000000-0000-0000-0000-000000000000',
        { isActive: false },
      );
      expect(result).toBeNull();
    });
  });

  // ─── delete() ────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('should remove the URL from the database', async () => {
      const created = await repository.create(makeCreateData());

      await repository.delete(created.id);

      const result = await repository.findById(created.id);
      expect(result).toBeNull();
    });
  });

  // ─── isSlugTaken() ───────────────────────────────────────────────────────

  describe('isSlugTaken()', () => {
    it('should return true when slug exists', async () => {
      await repository.create(makeCreateData({ slug: 'taken' }));

      const result = await repository.isSlugTaken('taken');

      expect(result).toBe(true);
    });

    it('should return false when slug does not exist', async () => {
      const result = await repository.isSlugTaken('free');
      expect(result).toBe(false);
    });
  });
});
