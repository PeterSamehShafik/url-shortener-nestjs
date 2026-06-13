import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { CreateUrlDto } from './dto/create-url.dto';

export interface ShortenedUrl {
  id: string;
  originalUrl: string;
  slug: string;
  userId: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date | null;
}

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
  private readonly urls: ShortenedUrl[] = [];

  create(dto: CreateUrlDto, userId: string | null = null) {
    this.preventSsrf(dto.originalUrl);
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

    const slug = dto.customSlug
      ? this.resolveCustomSlug(dto.customSlug)
      : this.generateUniqueSlug();

    const expiresAt = this.resolveExpiry(dto.expiresAt, userId);

    const newUrl: ShortenedUrl = {
      id: crypto.randomUUID(),
      expiresAt,
      slug,
      originalUrl: dto.originalUrl,
      isActive: true,
      createdAt: new Date(),
      userId,
    };

    this.urls.push(newUrl);
    return newUrl;
  }

  findBySlug(slug: string): ShortenedUrl {
    const url = this.urls.find((u) => u.slug === slug);

    if (!url || !url.isActive) {
      throw new NotFoundException(`No URL found for slug: ${slug}`);
    }

    if (url.expiresAt && url.expiresAt < new Date()) {
      throw new GoneException(`URL with slug ${slug} has expired`);
    }

    return url;
  }

  findAllByUser(userId: string): ShortenedUrl[] {
    return this.urls.filter((url) => url.userId === userId);
  }

  // Helpers
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

  resolveCustomSlug(customSlug: string): string {
    const exists = this.urls.some((url) => url.slug === customSlug);

    if (exists) {
      throw new ConflictException(`The slug "${customSlug}" is already taken`);
    }
    return customSlug;
  }

  generateUniqueSlug() {
    const MAX_ATTEMPTS = 3;
    for (let i = 0; i < MAX_ATTEMPTS; ++i) {
      const newSlug = generateSlug();

      const exists = this.urls.some((url) => url.slug === newSlug);
      if (!exists) {
        return newSlug;
      }
    }

    throw new Error('Failed to generate a unique slug. Please try again');
  }

  resolveExpiry(
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
