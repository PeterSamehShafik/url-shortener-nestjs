import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';
import { createHash } from 'crypto';
import {
  AnalyticsResponse,
  CreateUrlAnalyticData,
} from './interfaces/analytics.interface';
import { Url } from '@/urls/entities/url.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analyticsRepo: AnalyticsRepository) {}

  logClick(data: CreateUrlAnalyticData): void {
    this.processAndSaveClick(data).catch((err) => {
      this.logger.error('Failed to log analytics:', err);
    });
  }

  private async processAndSaveClick(
    data: CreateUrlAnalyticData,
  ): Promise<void> {
    const hashedIp = data.ipAddress
      ? createHash('sha256').update(data.ipAddress).digest('hex')
      : null;

    const refererDomain = this.extractDomain(data.referer);

    await this.analyticsRepo.create({
      urlId: data.urlId,
      ipAddress: hashedIp,
      userAgent: data.userAgent,
      referer: refererDomain,
    });
  }
  private extractDomain(referer: string | null): string | null {
    if (!referer) return null;
    try {
      const url = new URL(referer);
      return url.hostname.replace('www.', '');
    } catch {
      return null;
    }
  }

  async getUrlAnalytics(urlEntity: Url): Promise<AnalyticsResponse> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [overview, clicksByDayRaw, topReferersRaw, devicesRaw, browsersRaw] =
      await Promise.all([
        this.analyticsRepo.getOverviewStats(
          urlEntity.id,
          sevenDaysAgo,
          thirtyDaysAgo,
        ),
        this.analyticsRepo.getClicksByDay(urlEntity.id),
        this.analyticsRepo.getTopReferers(urlEntity.id),
        this.analyticsRepo.getDeviceStats(urlEntity.id),
        this.analyticsRepo.getBrowserStats(urlEntity.id),
      ]);

    return {
      urlId: urlEntity.id,
      slug: urlEntity.slug,
      totalClicks: Number(overview?.totalClicks || 0),
      uniqueVisitors: Number(overview?.uniqueVisitors || 0),
      clicksLast7Days: Number(overview?.clicksLast7Days || 0),
      clicksLast30Days: Number(overview?.clicksLast30Days || 0),

      clicksByDay: clicksByDayRaw.map((row) => ({
        date: row.date,
        count: Number(row.count),
      })),

      topReferers: topReferersRaw.map((row) => ({
        referer: row.referer,
        count: Number(row.count),
      })),
      devices: devicesRaw.map((row) => ({
        device: row.device,
        count: Number(row.count),
      })),

      browsers: browsersRaw.map((row) => ({
        browser: row.browser,
        count: Number(row.count),
      })),
    };
  }
}
