import { Module } from '@nestjs/common';
import { UrlsModule } from '@/urls/urls.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { Url } from './urls/entities/url.entity';
import { UrlAnalytic } from './analytics/entities/url-analytic.entity';
import { UrlTag } from './urls/entities/url-tag.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT) ?? 5432,
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'url_shortener',
      entities: [User, Url, UrlAnalytic, UrlTag, RefreshToken],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,
      migrationsRun: false,
      logging: true,
    }),
    UrlsModule,
  ],
})
export class AppModule {}
