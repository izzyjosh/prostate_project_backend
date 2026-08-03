import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { PatientProfile } from '../users/entities/patient-profile.entity';
import { MedicalBackground } from '../users/entities/medical-background.entity';
import { MedicalCondition } from '../users/entities/medical-condition.entity';
import { PatientAssessment } from '../patients/entities/patient-assessment.entity';
import { CliniciansController } from './clinicians.controller';
import { CliniciansService } from './clinicians.service';

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
  controllers: [CliniciansController],
  providers: [CliniciansService],
})
export class CliniciansModule {}
