import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { join } from 'path';
import { AppModule } from './app.module';
import { EventsService } from './events/events.service';

function validateEnv() {
  const required = ['ENCRYPTION_KEY', 'COGNITO_USER_POOL_ID', 'COGNITO_CLIENT_ID', 'COGNITO_REGION'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    bodyParser: true,
  });
  app.useBodyParser('json', { limit: '5mb' });
  app.useBodyParser('urlencoded', { limit: '5mb', extended: true });

  app.use(cookieParser());
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });

  const IS_PROD = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:4200')
    .split(',')
    .map(o => o.trim());

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some(o => origin === o)) {
        cb(null, true);
      } else if (
        !IS_PROD &&
        (origin.startsWith('http://192.168.') ||
          origin.startsWith('http://10.') ||
          origin.startsWith('http://172.') ||
          origin.endsWith('.ngrok-free.dev') ||
          origin.endsWith('.ngrok-free.app') ||
          origin.endsWith('.ngrok.io'))
      ) {
        cb(null, true);
      } else {
        cb(new Error(`Origin ${origin} not allowed`));
      }
    },
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
