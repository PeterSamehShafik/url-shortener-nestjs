import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Url } from './entities/url.entity';
import { IsNull, LessThan, QueryFailedError, Repository } from 'typeorm';
import { SlugCollisionError } from './errors/slug-collision.error';

export interface CreateUrlData {
  originalUrl: string;
  slug: string;
  userId: string | null;
  expiresAt: Date | null;
}

export interface UpdateUrlData {
  isActive?: boolean;
  expiresAt?: Date | null;
}

@Injectable()
export class UrlsRepository {
  constructor(@InjectRepository(Url) private readonly repo: Repository<Url>) {}

  async create(data: CreateUrlData): Promise<Url> {
    try {
      const url = this.repo.create(data);
      return await this.repo.save(url);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { code?: string }).code === '23505'
      ) {
        throw new SlugCollisionError(data.slug);
      }
      throw error;
    }
  }

  findBySlug(slug: string): Promise<Url | null> {
    return this.repo.findOne({ where: { slug } });
  }

  findById(urlId: string): Promise<Url | null> {
    return this.repo.findOne({ where: { id: urlId } });
  }
  findAllByUserId(userId: string): Promise<Url[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async update(urlId: string, data: UpdateUrlData): Promise<Url | null> {
    await this.repo.update(urlId, data);
    return this.findById(urlId);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  isSlugTaken(slug: string): Promise<boolean> {
    return this.repo.exists({ where: { slug } });
  }

  async deleteExpired(batchSize: number): Promise<number> {
    const expiredRecords = await this.repo.find({
      select: { id: true },
      where: { expiresAt: LessThan(new Date()), userId: IsNull() },
      take: batchSize,
    });
    if (expiredRecords.length === 0) return 0;

    const idsToPurge = expiredRecords.map((url) => url.id);

    const result = await this.repo.delete(idsToPurge);
    return result.affected || 0;
  }
}
