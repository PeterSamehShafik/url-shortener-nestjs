import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthCleanupTasks } from './tasks/auth-cleanup.tasks';
import { UrlCleanupTasks } from './tasks/url-cleanup.tasks';
import { AuthModule } from '@/auth/auth.module';
import { UrlsModule } from '@/urls/urls.module';

@Module({
  imports: [ScheduleModule.forRoot(), AuthModule, UrlsModule],
  providers: [AuthCleanupTasks, UrlCleanupTasks],
})
export class SchedulerModule {}
