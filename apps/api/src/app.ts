import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { getDatabaseUrl, getFrontendOrigin, getPort, loadEnvironment } from './config/environment';

export async function createApp(): Promise<NestExpressApplication> {
  loadEnvironment();
  getDatabaseUrl();
  getPort();
  const frontendOrigin = getFrontendOrigin();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');
  app.disable('x-powered-by');
  app.enableCors({
    origin: frontendOrigin,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
    }),
  );
  app.enableShutdownHooks();

  return app;
}
