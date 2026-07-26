import { registerAs } from '@nestjs/config';
import { env } from './env';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    url: env.DATABASE_URL,
    autoLoadEntities: true,
    synchronize: env.NODE_ENV === 'development',
    logging: env.NODE_ENV === 'development' ? ['error'] : ['error'],
  }),
);
