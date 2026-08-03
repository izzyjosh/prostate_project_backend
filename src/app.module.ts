import {
  Module,
  ValidationPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { databaseConfig } from './config/database.config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { HealthModule } from './modules/health/health.module';
import { LoggerInterceptor } from './common/interceptors/logger.interceptor';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { UsersModule } from './modules/users/users.module';
import { BullModule } from '@nestjs/bullmq';
import { bullConfig } from './config/bull.config';
import { MailModule } from './modules/mail/mail.module';
import { PatientsModule } from './modules/patients/patients.module';
import { CliniciansModule } from './modules/clinicians/clinicians.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    BullModule.forRoot(bullConfig),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => databaseConfig(),
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    MailModule,
    PatientsModule,
    CliniciansModule,
    AdminModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: false },
        exceptionFactory: (errors) => {
          const formatted = errors.map((e) => ({
            field: e.property,
            error: Object.values(e.constraints ?? {}).join(', '),
          }));
          return new UnprocessableEntityException(formatted);
        },
      }),
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
