import { Module } from '@nestjs/common';
import { UrlsController } from './urls.controller';
import { UrlsService } from './urls.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from './entities/url.entity';
import { UrlTag } from './entities/url-tag.entity';
import { UrlsRepository } from './urls.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Url, UrlTag])],
  controllers: [UrlsController],
  providers: [UrlsService, UrlsRepository],
})
export class UrlsModule {}
