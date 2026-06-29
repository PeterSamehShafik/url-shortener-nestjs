import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyAppSetup } from './common/app-setup';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  applyAppSetup(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
