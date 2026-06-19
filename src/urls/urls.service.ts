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
import { Url } from './entities/url.entity';
import { UrlsRepository } from './urls.repository';
import { UpdateUrlDto } from './dto/update-url.dto';

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
  constructor(private readonly urlsRepo: UrlsRepository) {}

  async create(dto: CreateUrlDto, userId: string | null = null): Promise<Url> {
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
      ? await this.resolveCustomSlug(dto.customSlug)
      : await this.generateUniqueSlug();

    const expiresAt = this.resolveExpiry(dto.expiresAt, userId);

    return this.urlsRepo.create({
      originalUrl: dto.originalUrl,
      slug,
      expiresAt,
      userId,
    });
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

  async updateUrl(
    urlId: string,
    dto: UpdateUrlDto,
    userId: string,
    userRole: string,
  ): Promise<Url> {
    const url = await this.urlsRepo.findByUrlId(urlId);
    if (!url || (url.userId !== userId && userRole !== 'admin')) {
      throw new NotFoundException(`URL with id ${urlId} not found`);
    }
    const updated = await this.urlsRepo.update(urlId, {
      isActive: dto.isActive,
      expiresAt: dto.expiresAt!,
    });
    return updated!;
  }

  async deleteUrl(
    urlId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const url = await this.urlsRepo.findByUrlId(urlId);
    if (!url || (url.userId !== userId && userRole !== 'admin')) {
      throw new NotFoundException(`URL with id ${urlId} not found`);
    }
    await this.urlsRepo.delete(urlId);
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
  private async resolveCustomSlug(customSlug: string): Promise<string> {
    const taken = await this.urlsRepo.isSlugTaken(customSlug);

    if (taken) {
      throw new ConflictException(`The slug "${customSlug}" is already taken`);
    }
    return customSlug;
  }
  private async generateUniqueSlug(): Promise<string> {
    const MAX_ATTEMPTS = 3;
    for (let i = 0; i < MAX_ATTEMPTS; ++i) {
      const newSlug = generateSlug();

      const taken = await this.urlsRepo.isSlugTaken(newSlug);
      if (!taken) {
        return newSlug;
      }
    }

    throw new Error('Failed to generate a unique slug. Please try again');
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
