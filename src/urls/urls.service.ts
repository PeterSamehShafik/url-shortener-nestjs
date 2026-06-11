import { Injectable, NotFoundException } from '@nestjs/common';

export interface ShortenedUrl {
  id: string;
  originalUrl: string;
  slug: string;
  userId: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date | null;
}

@Injectable()
export class UrlsService {
  private readonly urls: ShortenedUrl[] = [];

  findBySlug(slug: string): ShortenedUrl {
    const url = this.urls.find((u) => u.slug === slug);
    if (!url) {
      throw new NotFoundException(`No url found for slug '${slug}'`);
    }
    return url;
  }

  create(data: {
    originalUrl: string;
    slug: string;
    expiresAt: Date | null;
    userId: string | null;
  }): ShortenedUrl {
    const newUrl: ShortenedUrl = {
      id: crypto.randomUUID(),
      originalUrl: data.originalUrl,
      userId: data.userId,
      createdAt: new Date(),
      expiresAt: data.expiresAt,
      isActive: true,
      slug: data.slug,
    };
    this.urls.push(newUrl);
    return newUrl;
  }
}
