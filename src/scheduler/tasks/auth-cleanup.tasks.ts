import { AuthService } from '@/auth/auth.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthCleanupTasks {
  private readonly logger = new Logger(AuthCleanupTasks.name);

  constructor(private readonly authService: AuthService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDatabaseCleanup() {
    this.logger.log('Running expired refresh token cleanup...');

    try {
      const total = await this.authService.purgeExpiredTokens();
      this.logger.log(`Cleanup complete. Removed ${total} expired tokens.`);
    } catch (error) {
      this.logger.error(
        'Critical error occurred while purging expired tokens:',
        error,
      );
    }
  }
}
