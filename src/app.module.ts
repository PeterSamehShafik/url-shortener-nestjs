import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Feature Modules
import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { UrlsModule } from '@/urls/urls.module';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { SchedulerModule } from './scheduler/scheduler.module';

// Entities
import { User } from '@/users/entities/user.entity';
import { Url } from '@/urls/entities/url.entity';
import { UrlAnalytic } from '@/analytics/entities/url-analytic.entity';
import { UrlTag } from '@/urls/entities/url-tag.entity';
import { RefreshToken } from '@/auth/entities/refresh-token.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { APP_GUARD } from '@nestjs/core';

// Guards
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CustomThrottlerGuard } from './auth/guards/throttler.guard';

// Cache
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { hours, minutes, seconds, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

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
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: [User, Url, UrlAnalytic, UrlTag, RefreshToken],
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        synchronize: false,
        migrationsRun: false,
        logging: true,
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: configService.get<string>('REDIS_HOST'),
            port: configService.get<number>('REDIS_PORT'),
          }),
        ),
        throttlers: [
          {
            name: 'short',
            ttl: seconds(60),
            limit: 10,
            blockDuration: minutes(2),
          },
          {
            name: 'medium',
            ttl: minutes(60),
            limit: 100,
            blockDuration: minutes(30),
          },
          {
            name: 'long',
            ttl: hours(24),
            limit: 1000,
            blockDuration: hours(6),
          },
        ],
        errorMessage: 'Too many requests, please try again later',
        setHeaders: false,
      }),
    }),
    AnalyticsModule,
    UsersModule,
    AuthModule,
    UrlsModule,
    SchedulerModule,
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
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
