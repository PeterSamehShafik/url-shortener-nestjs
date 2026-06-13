import { describe, beforeEach, it, expect } from '@jest/globals';
import { UrlsService } from './urls.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUrlDto } from './dto/create-url.dto';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('UrlsService', () => {
  let service: UrlsService;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UrlsService],
    }).compile();
    service = module.get<UrlsService>(UrlsService);
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function makeDto(overrides: Partial<CreateUrlDto> = {}): CreateUrlDto {
    const dto = new CreateUrlDto();
    dto.originalUrl = 'https://github.com';
    Object.assign(dto, overrides);
    return dto;
  }
  function futureDateString(daysFromNow = 30): Date {
    return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  }

  // ─── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    describe('guest user (userId=null)', () => {
      it('should create a URL and auto-generate slug', () => {
        const result = service.create(makeDto(), null);
        expect(result.slug).toBeDefined();
        expect(result.slug).toHaveLength(6);
        expect(result.userId).toBeNull();
        expect(result.isActive).toBe(true);
      });

      it('should throw ForbiddenException when guest provides expiresAt', () => {
        expect(() => {
          service.create(makeDto({ expiresAt: new Date('2020-02-01') }), null);
        }).toThrow(ForbiddenException);
      });

      it('should throw ForbiddenException when guest provides customSlug', () => {
        expect(() => {
          service.create(makeDto({ customSlug: 'my-slug' }), null);
        }).toThrow(ForbiddenException);
      });

      it('should set expiresAt to 7 days from now for guest', () => {
        const before = Date.now();
        const result = service.create(makeDto(), null);
        const after = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        expect(result.expiresAt).not.toBeNull();
        expect(result.expiresAt?.getTime()).toBeGreaterThanOrEqual(
          before + sevenDays,
        );
        expect(result.expiresAt?.getTime()).toBeLessThanOrEqual(
          after + sevenDays,
        );
      });

      it('should throw UnprocessableEntityException when originalUrl resolves to a private IP range (192.168.x)', () => {
        expect(() =>
          service.create(makeDto({ originalUrl: 'http://192.168.1.1' }), null),
        ).toThrow(UnprocessableEntityException);
      });

      it('should throw UnprocessableEntityException when originalUrl resolves to a private IP range (10.x)', () => {
        expect(() =>
          service.create(makeDto({ originalUrl: 'http://10.0.0.1' }), null),
        ).toThrow(UnprocessableEntityException);
      });
      it('should throw UnprocessableEntityException for localhost via preventSsrf', () => {
        // In real HTTP flow, DTO catches this first
        // This test confirms the service-layer defense-in-depth works independently
        expect(() =>
          service.create(
            makeDto({ originalUrl: 'http://localhost:3000' }),
            null,
          ),
        ).toThrow(UnprocessableEntityException);
      });
    });
  });
  describe('authenticated user (userId Provided)', () => {
    const userId = 'test-id';
    it('should create URL with no expiry for auth user', () => {
      const result = service.create(makeDto(), userId);
      expect(result.userId).toBe(userId);
      expect(result.expiresAt).toBeNull();
    });

    it('should use provided customSlug', () => {
      const result = service.create(
        makeDto({ customSlug: 'custom-slug' }),
        userId,
      );
      expect(result.slug).toBe('custom-slug');
    });

    it('should throw ConflictException when slug already taken', () => {
      const customSlug = 'custom-slu';
      service.create(makeDto({ customSlug }), userId);
      expect(() => {
        service.create(makeDto({ customSlug }), userId);
      }).toThrow(ConflictException);
    });

    it('should use provided expiresAt', () => {
      const expiresAt = futureDateString(10);
      const result = service.create(makeDto({ expiresAt }), userId);
      expect(result.expiresAt).toEqual(expiresAt);
    });

    it('should store originalUrl exactly as provided', () => {
      const originalUrl = 'https://github.com/some/deep/path?query=1';
      const result = service.create(makeDto({ originalUrl }), userId);

      expect(result.originalUrl).toBe(originalUrl);
    });
  });

  // ─── findBySlug() ───────────────────────────────────────────────────────────
  describe('findBySlug()', () => {
    it('should return URL when slug exists and active', () => {
      const created = service.create(makeDto(), 'user-123');
      const found = service.findBySlug(created.slug);

      expect(found.slug).toBe(created.slug);
      expect(found.originalUrl).toBe(created.originalUrl);
    });
    it('should throw NotFoundException when slug does not exist', () => {
      expect(() => service.findBySlug('nonexistent')).toThrow(
        NotFoundException,
      );
    });
    it('should throw NotFoundException when URL is inactive', () => {
      const created = service.create(makeDto(), 'user-123');
      created.isActive = false;
      expect(() => service.findBySlug(created.slug)).toThrow(NotFoundException);
    });
    it('should throw GoneException when URL is expired', () => {
      const created = service.create(makeDto(), 'user-123');
      created.expiresAt = new Date(Date.now() - 1000);
      expect(() => service.findBySlug(created.slug)).toThrow(GoneException);
    });
  });

  // ─── findAllByUser() ────────────────────────────────────────────────────────

  describe('findAllByUser()', () => {
    it('should return only URLs belonging to the given user', () => {
      service.create(makeDto(), 'user-abc');
      service.create(makeDto(), 'user-abc');
      service.create(makeDto(), 'user-xyz');

      const results = service.findAllByUser('user-abc');

      expect(results).toHaveLength(2);
      expect(results.every((u) => u.userId === 'user-abc')).toBe(true);
    });

    it('should return empty array when user has no URLs', () => {
      const results = service.findAllByUser('user-nobody');
      expect(results).toEqual([]);
    });
  });
});
