import {
  describe,
  beforeEach,
  it,
  expect,
  jest,
  afterEach,
} from '@jest/globals';
import { UrlsService } from './urls.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUrlDto } from './dto/create-url.dto';
import { UrlsRepository } from './urls.repository';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Url } from './entities/url.entity';

describe('UrlsService', () => {
  let service: UrlsService;
  let repository: jest.Mocked<UrlsRepository>;

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findBySlug: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      isSlugTaken: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UrlsService,
        { provide: UrlsRepository, useValue: mockRepository },
      ],
    }).compile();
    service = module.get<UrlsService>(UrlsService);
    repository = module.get(UrlsRepository);
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function makeDto(overrides: Partial<CreateUrlDto> = {}): CreateUrlDto {
    const dto = new CreateUrlDto();
    dto.originalUrl = 'https://github.com';
    Object.assign(dto, overrides);
    return dto;
  }
  function makeFakeUrl(overrides: Partial<Url> = {}): Url {
    return {
      id: 'fake-id',
      originalUrl: 'https://github.com',
      slug: 'abc123',
      userId: null,
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      user: null,
      analytics: [],
      tags: [],
      ...overrides,
    };
  }

  // // ─── create() ──────────────────────────────────────────────────────────────
  describe('create()', () => {
    describe('guest user (userId=null)', () => {
      it('should create a URL and auto-generate slug', async () => {
        repository.isSlugTaken.mockResolvedValue(false);
        repository.create.mockResolvedValue(makeFakeUrl());

        const result = await service.create(makeDto(), null);
        expect(result.slug).toBeDefined();
        expect(repository.create.mock.calls.length).toBe(1);
      });

      it('should set expiresAt to 7 days from now for guests', async () => {
        repository.isSlugTaken.mockResolvedValue(false);
        repository.create.mockResolvedValue(makeFakeUrl());

        await service.create(makeDto(), null);

        const callArg = repository.create.mock.calls[0][0];
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        const expectedExpiry = Date.now() + sevenDays;

        expect(callArg.expiresAt).not.toBeNull();
        expect(callArg.expiresAt!.getTime()).toBeCloseTo(expectedExpiry, -3);
      });

      it('should throw ForbiddenException when guest provides customSlug', async () => {
        await expect(async () => {
          await service.create(makeDto({ customSlug: 'my-slug' }), null);
        }).rejects.toThrow(ForbiddenException);
        expect(repository.create.mock.calls.length).toBe(0);
      });
      it('should throw ForbiddenException when guest provides expiresAt', async () => {
        await expect(async () => {
          await service.create(
            makeDto({ expiresAt: new Date('2020-02-01') }),
            null,
          );
        }).rejects.toThrow(ForbiddenException);
        expect(repository.create.mock.calls.length).toBe(0);
      });

      it('should throw UnprocessableEntityException when originalUrl resolves to a private IP range (192.168.x)', async () => {
        await expect(() =>
          service.create(makeDto({ originalUrl: 'http://192.168.1.1' }), null),
        ).rejects.toThrow(UnprocessableEntityException);
      });

      it('should throw UnprocessableEntityException when originalUrl resolves to a private IP range (10.x)', async () => {
        await expect(() =>
          service.create(makeDto({ originalUrl: 'http://10.0.0.1' }), null),
        ).rejects.toThrow(UnprocessableEntityException);
      });
      it('should throw UnprocessableEntityException for localhost via preventSsrf', async () => {
        // In real HTTP flow, DTO catches this first
        // This test confirms the service-layer defense-in-depth works independently
        await expect(() =>
          service.create(
            makeDto({ originalUrl: 'http://localhost:3000' }),
            null,
          ),
        ).rejects.toThrow(UnprocessableEntityException);
      });
    });
  });
  describe('authenticated user (userId Provided)', () => {
    const userId = 'test-id';
    it('should create a URL with no expiry by default', async () => {
      const dto = makeDto();
      const fakeUrl = makeFakeUrl({ userId, expiresAt: null });

      repository.isSlugTaken.mockResolvedValue(false);
      repository.create.mockResolvedValue(fakeUrl);

      await service.create(dto, userId);

      const callArg = repository.create.mock.calls[0][0];
      expect(callArg.expiresAt).toBeNull();
      expect(callArg.userId).toBe(userId);
    });

    it('should use the provided customSlug', async () => {
      const dto = makeDto({ customSlug: 'my-campaign' });
      repository.isSlugTaken.mockResolvedValue(false);
      repository.create.mockResolvedValue(
        makeFakeUrl({ slug: 'my-campaign', userId }),
      );

      await service.create(dto, userId);

      const callArg = repository.create.mock.calls[0][0];
      expect(callArg.slug).toBe('my-campaign');
    });

    it('should throw ConflictException when customSlug is already taken', async () => {
      const dto = makeDto({ customSlug: 'taken-slug' });
      repository.isSlugTaken.mockResolvedValue(true);

      await expect(service.create(dto, userId)).rejects.toThrow(
        ConflictException,
      );

      expect(repository.create.mock.calls.length).toBe(0);
    });

    it('should use provided expiresAt over the default', async () => {
      const futureDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      const dto = makeDto({ expiresAt: futureDate });

      repository.isSlugTaken.mockResolvedValue(false);
      repository.create.mockResolvedValue(
        makeFakeUrl({ expiresAt: futureDate }),
      );

      await service.create(dto, userId);

      const callArg = repository.create.mock.calls[0][0];
      expect(callArg.expiresAt).toEqual(futureDate);
    });

    it('should retry slug generation on collision and succeed within max attempts', async () => {
      const dto = makeDto();

      repository.isSlugTaken
        .mockResolvedValueOnce(true) // 1st attempt: taken
        .mockResolvedValueOnce(false); // 2nd attempt: free

      repository.create.mockResolvedValue(makeFakeUrl({ userId }));

      await service.create(dto, userId);

      expect(repository.isSlugTaken.mock.calls.length).toBe(2);
      expect(repository.create.mock.calls.length).toBe(1);
    });

    it('should throw after exhausting max slug generation attempts', async () => {
      const dto = makeDto();
      repository.isSlugTaken.mockResolvedValue(true); // always taken

      await expect(service.create(dto, userId)).rejects.toThrow(
        'Failed to generate a unique slug. Please try again',
      );

      expect(repository.isSlugTaken.mock.calls.length).toBe(3);
      expect(repository.create.mock.calls.length).toBe(0);
    });
  });

  // // ─── findBySlug() ───────────────────────────────────────────────────────────
  // describe('findBySlug()', () => {
  //   it('should return URL when slug exists and active', () => {
  //     const created = service.create(makeDto(), 'user-123');
  //     const found = service.findBySlug(created.slug);

  //     expect(found.slug).toBe(created.slug);
  //     expect(found.originalUrl).toBe(created.originalUrl);
  //   });
  //   it('should throw NotFoundException when slug does not exist', () => {
  //     expect(() => service.findBySlug('nonexistent')).toThrow(
  //       NotFoundException,
  //     );
  //   });
  //   it('should throw NotFoundException when URL is inactive', () => {
  //     const created = service.create(makeDto(), 'user-123');
  //     created.isActive = false;
  //     expect(() => service.findBySlug(created.slug)).toThrow(NotFoundException);
  //   });
  //   it('should throw GoneException when URL is expired', () => {
  //     const created = service.create(makeDto(), 'user-123');
  //     created.expiresAt = new Date(Date.now() - 1000);
  //     expect(() => service.findBySlug(created.slug)).toThrow(GoneException);
  //   });
  // });

  // // ─── findAllByUser() ────────────────────────────────────────────────────────

  // describe('findAllByUser()', () => {
  //   it('should return only URLs belonging to the given user', () => {
  //     service.create(makeDto(), 'user-abc');
  //     service.create(makeDto(), 'user-abc');
  //     service.create(makeDto(), 'user-xyz');

  //     const results = service.findAllByUser('user-abc');

  //     expect(results).toHaveLength(2);
  //     expect(results.every((u) => u.userId === 'user-abc')).toBe(true);
  //   });

  //   it('should return empty array when user has no URLs', () => {
  //     const results = service.findAllByUser('user-nobody');
  //     expect(results).toEqual([]);
  //   });
  // });
});
