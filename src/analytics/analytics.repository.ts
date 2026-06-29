import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UrlAnalytic } from './entities/url-analytic.entity';
import {
  CreateUrlAnalyticData,
  RawBrowserStats,
  RawClicksByDay,
  RawDeviceStats,
  RawOverviewStats,
  RawTopReferers,
} from './interfaces/analytics.interface';

@Injectable()
export class AnalyticsRepository {
  constructor(
    @InjectRepository(UrlAnalytic)
    private readonly analyticsRepo: Repository<UrlAnalytic>,
  ) {}

  async create(data: CreateUrlAnalyticData): Promise<void> {
    const analytic = this.analyticsRepo.create(data);
    await this.analyticsRepo.save(analytic);
  }

  async getDeviceStats(urlId: string): Promise<RawDeviceStats[]> {
    return await this.analyticsRepo
      .createQueryBuilder('analytics')
      .select(
        `CASE 
        WHEN analytics.userAgent LIKE '%Mobi%' OR analytics.userAgent LIKE '%Android%' OR analytics.userAgent LIKE '%iPhone%' THEN 'mobile'
        ELSE 'desktop'
       END`,
        'device',
      )
      .addSelect('COUNT(*)', 'count')
      .where('analytics.urlId = :urlId', { urlId })
      .groupBy('device')
      .orderBy('count', 'DESC')
      .getRawMany<RawDeviceStats>();
  }
  async getBrowserStats(urlId: string): Promise<RawBrowserStats[]> {
    return await this.analyticsRepo
      .createQueryBuilder('analytics')
      .select(
        `CASE 
    WHEN analytics.userAgent LIKE '%Edg%' THEN 'Edge'
    WHEN analytics.userAgent LIKE '%Chrome%' THEN 'Chrome' 
    WHEN analytics.userAgent LIKE '%Safari%' THEN 'Safari' 
    WHEN analytics.userAgent LIKE '%Firefox%' THEN 'Firefox'
    ELSE 'Other/Bots'
   END`,
        'browser',
      )
      .addSelect('COUNT(*)', 'count')
      .where('analytics.urlId = :urlId', { urlId })
      .groupBy('browser')
      .orderBy('count', 'DESC')
      .getRawMany<RawBrowserStats>();
  }
  async getOverviewStats(
    urlId: string,
    sevenDaysAgo: Date,
    thirtyDaysAgo: Date,
  ): Promise<RawOverviewStats | undefined> {
    return await this.analyticsRepo
      .createQueryBuilder('analytics')
      .select('COUNT(*)', 'totalClicks')
      .addSelect('COUNT(DISTINCT analytics.ipAddress)', 'uniqueVisitors')
      .addSelect(
        'COUNT(CASE WHEN analytics.clickedAt >= :sevenDaysAgo THEN 1 END)',
        'clicksLast7Days',
      )
      .addSelect(
        'COUNT(CASE WHEN analytics.clickedAt >= :thirtyDaysAgo THEN 1 END)',
        'clicksLast30Days',
      )
      .where('analytics.urlId = :urlId', {
        urlId,
        sevenDaysAgo: sevenDaysAgo,
        thirtyDaysAgo,
      })
      .getRawOne<RawOverviewStats>();
  }

  async getClicksByDay(urlId: string): Promise<RawClicksByDay[]> {
    return await this.analyticsRepo
      .createQueryBuilder('analytics')
      .select("TO_CHAR(analytics.clickedAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.urlId = :urlId', { urlId })
      .groupBy("TO_CHAR(analytics.clickedAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany<RawClicksByDay>();
  }

  async getTopReferers(urlId: string): Promise<RawTopReferers[]> {
    return await this.analyticsRepo
      .createQueryBuilder('analytics')
      .select('analytics.referer', 'referer')
      .addSelect('COUNT(*)', 'count')
      .where('analytics.urlId = :urlId', { urlId })
      .groupBy('analytics.referer')
      .orderBy('count', 'DESC')
      .getRawMany<RawTopReferers>();
  }
}
