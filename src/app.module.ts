import { Module } from '@nestjs/common';
import { UrlsModule } from '@/urls/urls.module';

@Module({
  imports: [UrlsModule],
})
export class AppModule {}
