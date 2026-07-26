import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { env } from './config/env';
import { Logger, VersioningType } from '@nestjs/common';
import { swaggerConfig } from './config/swagger.config';
import { SwaggerModule } from '@nestjs/swagger';
import { ClassSerializerInterceptor } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // middlewares
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['health', 'search', 'auth'] });

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.enableShutdownHooks();

  if (env.SWAGGER_ENABLED === 'true') {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(env.PORT);

  const logger = new Logger('Bootstrap');
  logger.log(`Application running on http://localhost:${env.PORT}`);

  if (env.SWAGGER_ENABLED === 'true') {
    logger.log(`Swagger docs at http://localhost:${env.PORT}/docs`);
  }
}
bootstrap();
