// src/analytics/analytics.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UrlAnalytic } from './entities/url-analytic.entity';

export interface CreateUrlAnalyticData {
  urlId: string;
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
}

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectRepository(UrlAnalytic)
    private readonly repo: Repository<UrlAnalytic>,
  ) {}

  async create(data: CreateUrlAnalyticData): Promise<void> {
    const analytic = this.repo.create(data);
    await this.repo.save(analytic);
  }
}
