import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsRepository } from './analytics.repository';
import { createHash } from 'crypto';
import {
  AnalyticsResponse,
  CreateUrlAnalyticData,
} from './interfaces/analytics.interface';
import { UrlsService } from '@/urls/urls.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly analyticsRepo: AnalyticsRepository,
    @Inject(forwardRef(() => UrlsService))
    private readonly urlsService: UrlsService,
  ) {}

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

  async getUrlAnalytics(urlId: string): Promise<AnalyticsResponse> {
    const urlEntity = await this.urlsService.findById(urlId);
    if (!urlEntity) {
      throw new NotFoundException(`URL with ID ${urlId} not found`);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [overview, clicksByDayRaw, topReferersRaw, devicesRaw, browsersRaw] =
      await Promise.all([
        this.analyticsRepo.getOverviewStats(urlId, sevenDaysAgo, thirtyDaysAgo),
        this.analyticsRepo.getClicksByDay(urlId),
        this.analyticsRepo.getTopReferers(urlId),
        this.analyticsRepo.getDeviceStats(urlId),
        this.analyticsRepo.getBrowserStats(urlId),
      ]);

    return {
      urlId,
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
