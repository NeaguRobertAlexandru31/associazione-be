import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { configure as serverlessExpress } from '@vendia/serverless-express';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { Handler, Context, Callback } from 'aws-lambda';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { EventsService } from './events/events.service';

let cachedHandler: Handler;

async function loadSecretsIntoEnv(): Promise<void> {
  const dbSecretArn = process.env.DB_SECRET_ARN;
  if (!dbSecretArn || process.env.DATABASE_URL) return;

  const client = new SecretsManagerClient({ region: process.env.AWS_REGION_NAME ?? 'eu-central-1' });
  const { SecretString } = await client.send(new GetSecretValueCommand({ SecretId: dbSecretArn }));
  if (!SecretString) return;

  const { username, password, host, port, dbname } = JSON.parse(SecretString);
  const dbHost = process.env.DB_HOST ?? host;
  const dbName = process.env.DB_NAME ?? dbname;
  process.env.DATABASE_URL = `postgresql://${username}:${encodeURIComponent(password)}@${dbHost}:${port ?? 5432}/${dbName}?sslmode=no-verify`;
}

async function bootstrap(): Promise<Handler> {
  await loadSecretsIntoEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn'],
  });

  app.use(cookieParser());
  app.use(require('express').json({ limit: '20mb' }));
  app.use(require('express').urlencoded({ limit: '20mb', extended: true }));

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }),
  );

  await app.get(EventsService).backfillSlugs();
  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
  event: unknown,
  context: Context,
  callback: Callback,
) => {
  // Riusa l'istanza tra invocazioni (warm start)
  cachedHandler ??= await bootstrap();
  return cachedHandler(event, context, callback);
};
