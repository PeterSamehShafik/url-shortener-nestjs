import { UrlsService } from '@/urls/urls.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UrlCleanupTasks {
  private readonly logger = new Logger(UrlCleanupTasks.name);

  constructor(private readonly urlService: UrlsService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleUrlCleanup(): Promise<void> {
    this.logger.log('Running expired URL cleanup...');

    try {
      const total = await this.urlService.purgeExpiredUrls();
      this.logger.log(`Cleanup complete. Removed ${total} expired URLs.`);
    } catch (error) {
      this.logger.error(
        'Critical error occurred while purging expired URLs:',
        error,
      );
    }
  }
}
