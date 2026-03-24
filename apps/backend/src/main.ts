import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.use(cookieParser());
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.setGlobalPrefix('api', {
    exclude: [{ path: '.well-known/client', method: RequestMethod.GET }],
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
