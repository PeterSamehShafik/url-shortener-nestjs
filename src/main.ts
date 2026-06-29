import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyAppSetup } from './common/app-setup';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  applyAppSetup(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');

  await app.listen(port!);
}

bootstrap();
