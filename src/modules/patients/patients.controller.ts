import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { PatientsService } from './patients.service';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { CreatePatientAssessmentDto } from './dto/create-patient-assessment.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserData) {
    return this.patientsService.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientsService.updateProfile(user.sub, dto);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() user: CurrentUserData) {
    return this.patientsService.getDashboard(user.sub);
  }

  @Get('assessments')
  getAssessments(@CurrentUser() user: CurrentUserData) {
    return this.patientsService.getAssessments(user.sub);
  }

  @Get('prescriptions')
  getPrescriptions(@CurrentUser() user: CurrentUserData) {
    return this.patientsService.getPrescriptions(user.sub);
  }

  @Post('assessments')
  createAssessment(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreatePatientAssessmentDto,
  ) {
    return this.patientsService.createAssessment(user.sub, dto);
  }
}
