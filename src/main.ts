import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { join } from 'path';
import { AppModule } from './app.module';
import { EventsService } from './events/events.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.use(cookieParser());
  app.use((req: any, res: any, next: any) => {
    if (req.path === '/stripe/webhook') {
      require('express').raw({ type: 'application/json' })(req, res, next);
    } else {
      require('express').json({ limit: '20mb' })(req, res, next);
    }
  });
  app.use(require('express').urlencoded({ limit: '20mb', extended: true }));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.get(EventsService).backfillSlugs();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
