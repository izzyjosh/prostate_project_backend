import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import {
  ClinicianProfile,
  ClinicianStatus,
} from '../users/entities/clinician-profile.entity';
import {
  PatientAssessment,
  AssessmentStatus,
} from '../patients/entities/patient-assessment.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { UpdateAdminSettingDto } from './dto/admin-action.dto';

function formatAssessment(assessment: PatientAssessment) {
  return {
    id: assessment.id,
    patientId: assessment.user?.id ?? '',
    patientName: assessment.patientName,
    patientEmail: assessment.user?.email ?? '',
    score: assessment.score,
    maxScore: assessment.maxScore,
    percentage: assessment.percentage,
    tier: {
      tier: assessment.tierKey,
      label: assessment.tierLabel,
      icon: assessment.tierIcon,
      summary: assessment.tierSummary,
      recommendation: assessment.tierRecommendation,
      urgency: assessment.tierUrgency,
    },
    status: assessment.status,
    doctorNotes: assessment.doctorNotes,
    prescription: assessment.prescription,
    reviewedAt: assessment.reviewedAt
      ? assessment.reviewedAt.toISOString()
      : null,
    confirmedDiagnosis: assessment.confirmedDiagnosis,
    followupDate: assessment.followupDate,
    urgency: assessment.urgency,
    timestamp: assessment.createdAt.toISOString(),
    selectedIds: assessment.selectedIds ?? [],
    breakdown: assessment.breakdown ?? {},
  };
}

@Injectable()
export class AdminService {
  constructor(private readonly dataSource: DataSource) {}

  async getDashboard() {
    const userRepo = this.dataSource.getRepository(User);
    const assessmentRepo = this.dataSource.getRepository(PatientAssessment);

    const [patients, clinicians, admins, assessments] = await Promise.all([
      userRepo.count({ where: { role: UserRole.PATIENT } }),
      userRepo.count({ where: { role: UserRole.CLINICIAN } }),
      userRepo.count({ where: { role: UserRole.ADMIN } }),
      assessmentRepo.find({
        relations: { user: true },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const pendingReviews = assessments.filter(
      (assessment) => assessment.status === AssessmentStatus.PENDING,
    );
    const reviewedToday = assessments.filter((assessment) => {
      if (!assessment.reviewedAt) return false;
      return assessment.reviewedAt.toDateString() === new Date().toDateString();
    });
    const prescriptionsIssued = assessments.filter(
      (assessment) =>
        assessment.status === AssessmentStatus.CONFIRMED &&
        Boolean(assessment.prescription),
    );

    const tierCounts = assessments.reduce(
      (accumulator, assessment) => {
        accumulator[assessment.tierKey] =
          (accumulator[assessment.tierKey] ?? 0) + 1;
        return accumulator;
      },
      { urgent: 0, high: 0, moderate: 0, low: 0 } as Record<string, number>,
    );

    const topSymptoms = new Map<string, number>();
    for (const assessment of assessments) {
      for (const symptomId of assessment.selectedIds ?? []) {
        topSymptoms.set(symptomId, (topSymptoms.get(symptomId) ?? 0) + 1);
      }
    }

    return {
      stats: {
        patients,
        clinicians,
        admins,
        assessments: assessments.length,
        pendingReviews: pendingReviews.length,
        prescriptionsIssued: prescriptionsIssued.length,
      },
      riskTierDistribution: [
        { tier: 'urgent', count: tierCounts.urgent ?? 0 },
        { tier: 'high', count: tierCounts.high ?? 0 },
        { tier: 'moderate', count: tierCounts.moderate ?? 0 },
        { tier: 'low', count: tierCounts.low ?? 0 },
      ],
      mostCommonSymptoms: Array.from(topSymptoms.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id, count]) => ({ id, count })),
      recentAssessments: assessments.slice(0, 10).map(formatAssessment),
      reviewedToday: reviewedToday.slice(0, 10).map(formatAssessment),
      pendingReviews: pendingReviews.slice(0, 10).map(formatAssessment),
    };
  }

  async listUsers() {
    const userRepo = this.dataSource.getRepository(User);
    const users = await userRepo.find({
      relations: {
        clinicianProfile: true,
        profile: true,
        medicalBackground: true,
      },
      order: { createdAt: 'DESC' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      firstName:
        user.role === UserRole.CLINICIAN
          ? (user.clinicianProfile?.firstName ?? '')
          : (user.profile?.firstName ?? ''),
      lastName:
        user.role === UserRole.CLINICIAN
          ? (user.clinicianProfile?.lastName ?? '')
          : (user.profile?.lastName ?? ''),
      status:
        user.role === UserRole.CLINICIAN
          ? (user.clinicianProfile?.status ?? null)
          : user.isVerified
            ? 'verified'
            : 'pending',
    }));
  }

  async suspendUser(userId: string) {
    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: userId },
      relations: { clinicianProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = false;
    if (user.role === UserRole.CLINICIAN && user.clinicianProfile) {
      user.clinicianProfile.status = ClinicianStatus.REJECTED;
      await this.dataSource
        .getRepository(ClinicianProfile)
        .save(user.clinicianProfile);
    }

    await userRepo.save(user);
    return {
      message: 'User suspended successfully',
      userId: user.id,
      isActive: user.isActive,
    };
  }

  async activateUser(userId: string) {
    const userRepo = this.dataSource.getRepository(User);
    const user = await userRepo.findOne({
      where: { id: userId },
      relations: { clinicianProfile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = true;
    await userRepo.save(user);
    return {
      message: 'User activated successfully',
      userId: user.id,
      isActive: user.isActive,
    };
  }

  async deleteUser(userId: string) {
    const userRepo = this.dataSource.getRepository(User);
    const result = await userRepo.delete(userId);

    if (!result.affected) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User removed successfully', userId };
  }

  async approveClinician(userId: string, approvedBy: string) {
    const userRepo = this.dataSource.getRepository(User);
    const clinicianRepo = this.dataSource.getRepository(ClinicianProfile);
    const clinician = await userRepo.findOne({
      where: { id: userId },
      relations: { clinicianProfile: true },
    });

    if (
      !clinician ||
      clinician.role !== UserRole.CLINICIAN ||
      !clinician.clinicianProfile
    ) {
      throw new NotFoundException('Clinician not found');
    }

    clinician.isActive = true;
    clinician.isVerified = true;
    clinician.clinicianProfile.status = ClinicianStatus.APPROVED;
    clinician.clinicianProfile.approvedBy = approvedBy;
    clinician.clinicianProfile.approvedAt = new Date();

    await userRepo.save(clinician);
    await clinicianRepo.save(clinician.clinicianProfile);

    return {
      message: 'Clinician approved successfully',
      clinicianId: clinician.id,
      status: clinician.clinicianProfile.status,
    };
  }

  async rejectClinician(userId: string, approvedBy: string) {
    const userRepo = this.dataSource.getRepository(User);
    const clinicianRepo = this.dataSource.getRepository(ClinicianProfile);
    const clinician = await userRepo.findOne({
      where: { id: userId },
      relations: { clinicianProfile: true },
    });

    if (
      !clinician ||
      clinician.role !== UserRole.CLINICIAN ||
      !clinician.clinicianProfile
    ) {
      throw new NotFoundException('Clinician not found');
    }

    clinician.isActive = false;
    clinician.clinicianProfile.status = ClinicianStatus.REJECTED;
    clinician.clinicianProfile.approvedBy = approvedBy;
    clinician.clinicianProfile.approvedAt = new Date();

    await userRepo.save(clinician);
    await clinicianRepo.save(clinician.clinicianProfile);

    return {
      message: 'Clinician rejected successfully',
      clinicianId: clinician.id,
      status: clinician.clinicianProfile.status,
    };
  }

  async listAssessments() {
    const repo = this.dataSource.getRepository(PatientAssessment);
    const assessments = await repo.find({
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return assessments.map(formatAssessment);
  }

  async getSettings() {
    const repo = this.dataSource.getRepository(SystemSetting);
    return repo.find({ order: { key: 'ASC' } });
  }

  async upsertSetting(key: string, dto: UpdateAdminSettingDto) {
    const repo = this.dataSource.getRepository(SystemSetting);
    let setting = await repo.findOne({ where: { key } });

    if (!setting) {
      setting = repo.create({
        key,
        value: dto.value ?? null,
        description: dto.description ?? null,
      });
    } else {
      setting.value = dto.value ?? setting.value;
      setting.description = dto.description ?? setting.description;
    }

    return repo.save(setting);
  }
}
