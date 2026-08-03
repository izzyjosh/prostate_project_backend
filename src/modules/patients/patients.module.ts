import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { PatientProfile } from '../users/entities/patient-profile.entity';
import { MedicalBackground } from '../users/entities/medical-background.entity';
import { MedicalCondition } from '../users/entities/medical-condition.entity';
import { User } from '../users/entities/user.entity';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientAssessment } from './entities/patient-assessment.entity';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([
      User,
      PatientProfile,
      MedicalBackground,
      MedicalCondition,
      PatientAssessment,
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}
