import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Feature Modules
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { UrlsModule } from '@/urls/urls.module';
import { AnalyticsModule } from '@/analytics/analytics.module';

// Entities
import { User } from '@/users/entities/user.entity';
import { Url } from '@/urls/entities/url.entity';
import { UrlAnalytic } from '@/analytics/entities/url-analytic.entity';
import { UrlTag } from '@/urls/entities/url-tag.entity';
import { RefreshToken } from '@/auth/entities/refresh-token.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        return {
          stores: [new KeyvRedis(`redis://${host}:${port}`)],
          ttl: 24 * 60 * 60 * 1000,
        };
      },
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'url_shortener',
      entities: [User, Url, UrlAnalytic, UrlTag, RefreshToken],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      synchronize: false,
      migrationsRun: false,
      logging: true,
    }),
    AnalyticsModule,
    UsersModule,
    AuthModule,
    UrlsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
