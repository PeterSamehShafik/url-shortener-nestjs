import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Url } from './entities/url.entity';
import { Repository } from 'typeorm';

export interface CreateUrlData {
  originalUrl: string;
  slug: string;
  userId: string | null;
  expiresAt: Date | null;
}

export interface UpdateUrlData {
  isActive?: boolean;
  expiresAt: Date;
}

@Injectable()
export class UrlsRepository {
  constructor(@InjectRepository(Url) private readonly repo: Repository<Url>) {}

  create(data: CreateUrlData): Promise<Url> {
    const url = this.repo.create(data);
    return this.repo.save(url);
  }

  findBySlug(slug: string): Promise<Url | null> {
    return this.repo.findOne({ where: { slug } });
  }

  findByUrlId(urlId: string): Promise<Url | null> {
    return this.repo.findOne({ where: { id: urlId } });
  }
  findAllByUserId(userId: string): Promise<Url[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async update(urlId: string, data: UpdateUrlData): Promise<Url | null> {
    await this.repo.update(urlId, data);
    return this.findByUrlId(urlId);
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  isSlugTaken(slug: string): Promise<boolean> {
    return this.repo.exists({ where: { slug } });
  }
}
