import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyAppSetup } from './common/app-setup';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  applyAppSetup(app, configService);

  const port = configService.get<number>('PORT');
  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  if (!isProduction) {
    const config = new DocumentBuilder()
      .setTitle('URL Shortener API')
      .setDescription('Production-grade URL Shortener REST API')
      .setVersion('1.0')
      .addCookieAuth('accessToken', {
        type: 'apiKey',
        in: 'cookie',
        name: 'accessToken',
      })
      .addCookieAuth('refreshToken', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refreshToken',
      })
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port!);
}

bootstrap();
