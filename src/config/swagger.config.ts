import { DocumentBuilder } from '@nestjs/swagger';
import { env } from './env';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Prostate API')
  .setDescription('API documentation for the Prostate application')
  .setVersion('1.0.0')
  .addServer(env.APP_URL)
  .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
  .addCookieAuth()
  .build();
