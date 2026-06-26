import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { CreateUrlDto } from './dto/create-url.dto';
import { Url } from './entities/url.entity';
import { UrlsRepository } from './urls.repository';
import { UpdateUrlDto } from './dto/update-url.dto';
import { SlugCollisionError } from './errors/slug-collision.error';
import { AnalyticsService } from '@/analytics/analytics.service';
import { CacheService } from '@/cache/cache.service';

// outside not to recreate it on every request or every class instantiation
const PRIVATE_IP_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^::1$/,
];

const generateSlug = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  6,
);

@Injectable()
export class UrlsService {
  constructor(
    private readonly urlsRepo: UrlsRepository,
    private readonly analyticsService: AnalyticsService,
    private readonly cacheService: CacheService,
  ) {}

  async redirect(
    slug: string,
    ip: string | null,
    userAgent: string | null,
    referer: string | null,
  ): Promise<string> {
    let originalUrl: string;
    let urlId: string;

    const cached = await this.cacheService.getUrl(slug);
    if (cached) {
      originalUrl = cached.originalUrl;
      urlId = cached.id;
    } else {
      const url = await this.findBySlug(slug);
      originalUrl = url.originalUrl;
      urlId = url.id;
      await this.cacheService.populateUrl(slug, url);
    }

    this.analyticsService.logClick({
      urlId: urlId,
      ipAddress: ip,
      userAgent,
      referer,
    });

    return originalUrl;
  }

  private async insertWithCustomSlug(
    dto: CreateUrlDto,
    expiresAt: Date | null,
    userId: string | null,
  ): Promise<Url> {
    try {
      return await this.urlsRepo.create({
        originalUrl: dto.originalUrl,
        slug: dto.customSlug!,
        expiresAt,
        userId,
      });
    } catch (error) {
      if (error instanceof SlugCollisionError) {
        throw new ConflictException(
          `The custom slug '${dto.customSlug}' is already taken.`,
        );
      }
      throw error;
    }
  }

  private async insertWithGeneratedSlug(
    dto: CreateUrlDto,
    expiresAt: Date | null,
    userId: string | null,
  ): Promise<Url> {
    const MAX_ATTEMPTS = 3;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const slug = generateSlug(); // Your NanoID function

      try {
        return await this.urlsRepo.create({
          originalUrl: dto.originalUrl,
          slug,
          expiresAt,
          userId,
        });
      } catch (error) {
        if (error instanceof SlugCollisionError) {
          // Collision happened
          continue;
        }
        throw error;
      }
    }

    throw new InternalServerErrorException(
      'Failed to generate a unique slug. Please try again.',
    );
  }
  async create(dto: CreateUrlDto, userId: string | null = null): Promise<Url> {
    if (dto.customSlug && !userId) {
      throw new ForbiddenException(
        'Custom slugs are only available to authenticated users',
      );
    }
    if (dto.expiresAt && !userId) {
      throw new ForbiddenException(
        'ExpiresAt is only available to authenticated users',
      );
    }
    this.preventSsrf(dto.originalUrl);

    const expiresAt = this.resolveExpiry(dto.expiresAt, userId);

    // Route to the correct insertion strategy
    if (dto.customSlug) {
      return this.insertWithCustomSlug(dto, expiresAt, userId);
    }

    return this.insertWithGeneratedSlug(dto, expiresAt, userId);
  }

  async findBySlug(slug: string): Promise<Url> {
    const url = await this.urlsRepo.findBySlug(slug);

    if (!url || !url.isActive) {
      throw new NotFoundException(`No URL found for slug: ${slug}`);
    }

    if (url.expiresAt && url.expiresAt < new Date()) {
      throw new GoneException(`URL with slug ${slug} has expired`);
    }

    return url;
  }

  findAllByUser(userId: string): Promise<Url[]> {
    return this.urlsRepo.findAllByUserId(userId);
  }

  async update(
    urlId: string,
    dto: UpdateUrlDto,
    userId: string,
    userRole: string,
  ): Promise<Url> {
    const url = await this.urlsRepo.findById(urlId);
    if (!url || (url.userId !== userId && userRole !== 'admin')) {
      throw new NotFoundException(`URL with id ${urlId} not found`);
    }
    const updated = await this.urlsRepo.update(urlId, {
      isActive: dto.isActive,
      expiresAt: dto.expiresAt!,
    });

    await this.cacheService.delUrl(url.slug);
    return updated!;
  }

  async delete(urlId: string, userId: string, userRole: string): Promise<void> {
    const url = await this.urlsRepo.findById(urlId);
    if (!url || (url.userId !== userId && userRole !== 'admin')) {
      throw new NotFoundException(`URL with id ${urlId} not found`);
    }
    await this.urlsRepo.delete(urlId);

    await this.cacheService.delUrl(url.slug);
  }

  // ____Helpers_______________________________________
  preventSsrf(url: string) {
    let hostname: string;

    //redundant but doubles check
    try {
      hostname = new URL(url).hostname;
    } catch {
      throw new UnprocessableEntityException('originalUrl is not a valid URL');
    }

    const isPrivate = PRIVATE_IP_PATTERNS.some((pattern) =>
      pattern.test(hostname),
    );

    if (isPrivate) {
      throw new UnprocessableEntityException(
        'originalUrl must not point to a private or local address',
      );
    }
  }

  private resolveExpiry(
    expiresAt: Date | undefined,
    userId: string | null,
  ): Date | null {
    //in case expiresAt for users
    if (expiresAt) {
      return expiresAt;
    }

    //in case guest user
    if (!userId) {
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return new Date(Date.now() + sevenDays);
    }

    // in case permanent url for users
    return null;
  }
}
