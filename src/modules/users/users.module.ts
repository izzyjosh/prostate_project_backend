import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersRepository } from './users.repository';
import { PatientProfile } from './entities/patient-profile.entity';
import { MedicalBackground } from './entities/medical-background.entity';
import { ClinicianProfile } from './entities/clinician-profile.entity';
import { MedicalCondition } from './entities/medical-condition.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PatientProfile,
      MedicalBackground,
      ClinicianProfile,
      MedicalCondition,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
