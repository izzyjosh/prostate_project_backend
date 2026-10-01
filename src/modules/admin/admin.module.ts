import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { PatientAssessment } from '../patients/entities/patient-assessment.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, PatientAssessment, SystemSetting])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
