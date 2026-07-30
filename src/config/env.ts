import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';
import * as dotenv from 'dotenv';

dotenv.config();

export const env = createEnv({
  server: {
    PORT: z.string().default('3000'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DATABASE_URL: z.string().url(),
    DATABASE_LOGGING: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .default(false)
      .transform((v) => v === true || v === 'true'),
    DATABASE_SSL: z
      .union([z.boolean(), z.enum(['true', 'false'])])
      .default(false)
      .transform((v) => v === true || v === 'true'),
    CORS_ORIGIN: z.string(),
    SWAGGER_ENABLED: z.string().default('true'),
    APP_URL: z.string().url(),
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
    JWT_ACCESS_EXPIRES: z.string(),
    JWT_REFRESH_EXPIRES: z.string(),
    REDIS_URL: z.string().url(),
    MAIL_HOST: z.string(),
    MAIL_PORT: z.coerce.number(),
    MAIL_USER: z.string(),
    MAIL_PASS: z.string(),
    MAIL_FROM: z.string(),
    FRONTEND_URL: z.string(),
    ADMIN_EMAIL: z.string().email(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});

export type Env = z.infer<typeof env>;
