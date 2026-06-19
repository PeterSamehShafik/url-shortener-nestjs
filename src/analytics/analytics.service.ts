import { Injectable, Logger } from '@nestjs/common';
import {
  AnalyticsRepository,
  CreateUrlAnalyticData,
} from './analytics.repository';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analyticsRepo: AnalyticsRepository) {}

  logClick(data: CreateUrlAnalyticData) {
    this.analyticsRepo.create(data).catch((err) => {
      this.logger.error('Failed to log analytics:', err);
    });
  }
}
