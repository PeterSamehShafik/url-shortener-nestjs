import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UrlAnalytic } from './entities/url-analytic.entity';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';
import { UrlsModule } from '@/urls/urls.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UrlAnalytic]),
    forwardRef(() => UrlsModule),
  ],
  providers: [AnalyticsRepository, AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
