import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { In, DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';
import { ClinicianStatus } from '../users/entities/clinician-profile.entity';
import {
  PatientAssessment,
  AssessmentStatus,
} from '../patients/entities/patient-assessment.entity';
import { ReviewAssessmentDto } from './dto/review-assessment.dto';

const TIER_ORDER = { urgent: 0, high: 1, moderate: 2, low: 3 } as const;

type ClinicianSessionUser = {
  id: string;
  email: string;
  role: UserRole.CLINICIAN;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  firstName: string;
  lastName: string;
  licenseNumber: string;
};

type ClinicianAssessmentView = ReturnType<typeof formatAssessment>;

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
    breakdown: assessment.breakdown ?? {},
    selectedIds: assessment.selectedIds ?? [],
    timestamp: assessment.createdAt.toISOString(),
    status: assessment.status,
    doctorNotes: assessment.doctorNotes,
    prescription: assessment.prescription,
    reviewedAt: assessment.reviewedAt
      ? assessment.reviewedAt.toISOString()
      : null,
    confirmedDiagnosis: assessment.confirmedDiagnosis,
    followupDate: assessment.followupDate,
    urgency: assessment.urgency,
  };
}

@Injectable()
export class CliniciansService {
  constructor(
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  private async getApprovedClinician(
    userId: string,
  ): Promise<ClinicianSessionUser> {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.CLINICIAN) {
      throw new BadRequestException('User is not a clinician');
    }

    if (!user.clinicianProfile) {
      throw new NotFoundException('Clinician profile not found');
    }

    if (user.clinicianProfile.status !== ClinicianStatus.APPROVED) {
      throw new BadRequestException('Your account is pending admin approval');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      firstName: user.clinicianProfile.firstName,
      lastName: user.clinicianProfile.lastName,
      licenseNumber: user.clinicianProfile.licenseNumber,
    };
  }

  private async getAssessmentsForClinician() {
    const assessmentRepo = this.dataSource.getRepository(PatientAssessment);
    return assessmentRepo.find({
      relations: {
        user: { profile: true, medicalBackground: { conditions: true } },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getDashboard(userId: string) {
    await this.getApprovedClinician(userId);
    const assessments = await this.getAssessmentsForClinician();
    const pending = assessments.filter(
      (assessment) => assessment.status === AssessmentStatus.PENDING,
    );
    const reviewed = assessments.filter(
      (assessment) => assessment.status === AssessmentStatus.CONFIRMED,
    );
    const urgent = pending.filter(
      (assessment) =>
        assessment.tierKey === 'urgent' || assessment.tierKey === 'high',
    );
    const reviewedToday = reviewed.filter((assessment) => {
      if (!assessment.reviewedAt) return false;
      return assessment.reviewedAt.toDateString() === new Date().toDateString();
    });

    return {
      stats: {
        pendingReviews: pending.length,
        totalAssessments: assessments.length,
        urgentCases: urgent.length,
        reviewedToday: reviewedToday.length,
      },
      pendingReviews: pending.slice(0, 5).map(formatAssessment),
      reviewedAssessments: reviewed.slice(0, 5).map(formatAssessment),
    };
  }

  async getPatients(userId: string) {
    await this.getApprovedClinician(userId);
    const assessments = await this.getAssessmentsForClinician();

    const patientMap = new Map<string, ClinicianAssessmentView[]>();
    for (const assessment of assessments) {
      const patientId = assessment.user?.id;
      if (!patientId) continue;

      const list = patientMap.get(patientId) ?? [];
      list.push(formatAssessment(assessment));
      patientMap.set(patientId, list);
    }

    return Array.from(patientMap.entries()).map(
      ([patientId, patientAssessments]) => {
        const latest = patientAssessments[0] ?? null;
        const first = latest?.patientName?.split(' ') ?? [];
        const [firstName, ...rest] = first;
        const lastName = rest.join(' ');
        const patient = assessments.find(
          (assessment) => assessment.user?.id === patientId,
        )?.user;

        return {
          id: patientId,
          firstName: patient?.profile?.firstName ?? firstName ?? '',
          lastName: patient?.profile?.lastName ?? lastName ?? '',
          fullName:
            `${patient?.profile?.firstName ?? firstName ?? ''} ${patient?.profile?.lastName ?? lastName ?? ''}`.trim(),
          email: patient?.email ?? latest?.patientEmail ?? '',
          phoneNumber: patient?.profile?.phoneNumber ?? '',
          address: patient?.profile?.address ?? '',
          bloodGroup: patient?.medicalBackground?.bloodGroup ?? '',
          occupation: patient?.medicalBackground?.occupation ?? '',
          knownConditions:
            patient?.medicalBackground?.conditions?.map(
              (condition) => condition.name,
            ) ?? [],
          assessmentsCount: patientAssessments.length,
          latestAssessment: latest,
        };
      },
    );
  }

  async getPatientDetail(userId: string, patientId: string) {
    await this.getApprovedClinician(userId);
    const assessments = await this.getAssessmentsForClinician();
    const patientAssessments = assessments
      .filter((assessment) => assessment.user?.id === patientId)
      .map(formatAssessment);

    if (patientAssessments.length === 0) {
      throw new NotFoundException('Patient not found');
    }

    const patient = assessments.find(
      (assessment) => assessment.user?.id === patientId,
    )?.user;

    return {
      id: patientId,
      firstName: patient?.profile?.firstName ?? '',
      lastName: patient?.profile?.lastName ?? '',
      fullName:
        `${patient?.profile?.firstName ?? ''} ${patient?.profile?.lastName ?? ''}`.trim(),
      email: patient?.email ?? '',
      phoneNumber: patient?.profile?.phoneNumber ?? '',
      age: patient?.profile?.dateOfBirth
        ? new Date().getFullYear() -
          new Date(patient.profile.dateOfBirth).getFullYear()
        : null,
      bloodGroup: patient?.medicalBackground?.bloodGroup ?? '',
      address: patient?.profile?.address ?? '',
      knownConditions:
        patient?.medicalBackground?.conditions?.map(
          (condition) => condition.name,
        ) ?? [],
      assessments: patientAssessments,
    };
  }

  async getPendingReviews(userId: string) {
    await this.getApprovedClinician(userId);
    const assessments = await this.getAssessmentsForClinician();
    return assessments
      .filter((assessment) => assessment.status === AssessmentStatus.PENDING)
      .sort(
        (a, b) =>
          (TIER_ORDER[a.tierKey as keyof typeof TIER_ORDER] ?? 3) -
          (TIER_ORDER[b.tierKey as keyof typeof TIER_ORDER] ?? 3),
      )
      .map(formatAssessment);
  }

  async getReviewed(userId: string) {
    await this.getApprovedClinician(userId);
    const assessments = await this.getAssessmentsForClinician();
    return assessments
      .filter((assessment) => assessment.status === AssessmentStatus.CONFIRMED)
      .map(formatAssessment);
  }

  async getPrescriptions(userId: string) {
    const reviewed = await this.getReviewed(userId);
    return reviewed.filter((assessment) => assessment.prescription);
  }

  async reviewAssessment(
    userId: string,
    assessmentId: string,
    dto: ReviewAssessmentDto,
  ) {
    await this.getApprovedClinician(userId);
    const repo = this.dataSource.getRepository(PatientAssessment);
    const assessment = await repo.findOne({
      where: { id: assessmentId },
      relations: {
        user: { profile: true, medicalBackground: { conditions: true } },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    assessment.status = AssessmentStatus.CONFIRMED;
    assessment.confirmedDiagnosis = dto.diagnosis;
    assessment.prescription = dto.prescription ?? null;
    assessment.doctorNotes = dto.notes ?? null;
    assessment.followupDate = dto.followupDate ?? null;
    assessment.urgency = dto.urgency;
    assessment.reviewedAt = new Date();

    const saved = await repo.save(assessment);
    return formatAssessment(saved);
  }
}
