import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Url } from '@/urls/entities/url.entity';

export interface CachedUrl {
  id: string;
  originalUrl: string;
  expiresAt: Date | null;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000;

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async populateUrl(slug: string, url: Url): Promise<void> {
    const payload: CachedUrl = {
      id: url.id,
      originalUrl: url.originalUrl,
      expiresAt: url.expiresAt,
    };
    await this.setUrl(slug, payload);
  }

  private getSlugKey(slug: string): string {
    return `url:slug:${slug}`;
  }
  private getTtl(expiresAt: Date | null): number {
    if (!expiresAt) return this.DEFAULT_TTL;
    const remainingTime = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, remainingTime);
  }

  async getUrl(slug: string): Promise<CachedUrl | null> {
    try {
      const cached = await this.cacheManager.get<CachedUrl>(
        this.getSlugKey(slug),
      );
      if (!cached) return null;

      // Sliding TTL — reset expiry on every hit for non-expiring URLs
      if (cached.expiresAt) {
        cached.expiresAt = new Date(cached.expiresAt);
      }
      if (!cached.expiresAt) {
        await this.setUrl(slug, cached);
      }

      return cached;
    } catch (err) {
      this.logger.error(`Cache get failed for slug ${slug}`, err);
      return null;
    }
  }

  async setUrl(slug: string, url: CachedUrl): Promise<void> {
    try {
      const ttl = this.getTtl(url.expiresAt);
      if (ttl === 0) return;

      const cachePayload: CachedUrl = {
        id: url.id,
        originalUrl: url.originalUrl,
        expiresAt: url.expiresAt,
      };
      await this.cacheManager.set(this.getSlugKey(slug), cachePayload, ttl);
    } catch (err) {
      this.logger.error(`Cache set failed for slug ${slug}`, err);
    }
  }

  async delUrl(slug: string): Promise<void> {
    try {
      await this.cacheManager.del(this.getSlugKey(slug));
    } catch (err) {
      this.logger.error(`Cache del failed for slug ${slug}`, err);
    }
  }
}
