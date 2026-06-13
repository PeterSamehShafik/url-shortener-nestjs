import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyAppSetup } from './common/app-setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  applyAppSetup(app);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
