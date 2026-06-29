import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UrlAnalytic } from './entities/url-analytic.entity';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [TypeOrmModule.forFeature([UrlAnalytic])],
  providers: [AnalyticsRepository, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
