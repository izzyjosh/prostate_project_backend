import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { UserRole } from '../users/entities/user.entity';
import { CliniciansService } from './clinicians.service';
import { ReviewAssessmentDto } from './dto/review-assessment.dto';

@Controller('clinician')
@Roles(UserRole.CLINICIAN)
export class CliniciansController {
  constructor(private readonly cliniciansService: CliniciansService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: CurrentUserData) {
    return this.cliniciansService.getDashboard(user.sub);
  }

  @Get('patients')
  getPatients(@CurrentUser() user: CurrentUserData) {
    return this.cliniciansService.getPatients(user.sub);
  }

  @Get('patients/:id')
  getPatientDetail(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
  ) {
    return this.cliniciansService.getPatientDetail(user.sub, id);
  }

  @Get('pending-reviews')
  getPendingReviews(@CurrentUser() user: CurrentUserData) {
    return this.cliniciansService.getPendingReviews(user.sub);
  }

  @Get('reviewed')
  getReviewed(@CurrentUser() user: CurrentUserData) {
    return this.cliniciansService.getReviewed(user.sub);
  }

  @Get('prescriptions')
  getPrescriptions(@CurrentUser() user: CurrentUserData) {
    return this.cliniciansService.getPrescriptions(user.sub);
  }

  @Patch('assessments/:id/review')
  reviewAssessment(
    @CurrentUser() user: CurrentUserData,
    @Param('id') id: string,
    @Body() dto: ReviewAssessmentDto,
  ) {
    return this.cliniciansService.reviewAssessment(user.sub, id, dto);
  }
}
