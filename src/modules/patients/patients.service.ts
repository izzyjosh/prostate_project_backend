import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { PatientProfile } from '../users/entities/patient-profile.entity';
import { MedicalBackground } from '../users/entities/medical-background.entity';
import { MedicalCondition } from '../users/entities/medical-condition.entity';
import {
  PatientAssessment,
  AssessmentStatus,
} from './entities/patient-assessment.entity';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { CreatePatientAssessmentDto } from './dto/create-patient-assessment.dto';

const RISK_TIERS = {
  urgent: {
    tier: 'urgent',
    label: 'Urgent',
    icon: '🚨',
    summary:
      'Your responses indicate a pattern of symptoms that requires urgent clinical attention.',
    recommendation:
      'You should seek an immediate appointment at the ABUTH Urology or Oncology department. Do not delay. Bring this assessment report with you. A doctor will conduct a physical examination, request a PSA blood test, and determine if further imaging is needed.',
    urgency: 'SAME DAY OR NEXT AVAILABLE APPOINTMENT',
  },
  high: {
    tier: 'high',
    label: 'High Risk',
    icon: '🔴',
    summary:
      'Your responses suggest a high level of concerning symptoms and risk factors.',
    recommendation:
      'An appointment with a urologist at ABUTH is strongly recommended within the next 1–2 weeks. A PSA test and digital rectal examination (DRE) will be arranged. Please do not self-medicate before your consultation.',
    urgency: 'WITHIN 1–2 WEEKS',
  },
  moderate: {
    tier: 'moderate',
    label: 'Moderate Risk',
    icon: '🟡',
    summary:
      'Your responses suggest moderate symptoms that warrant clinical evaluation.',
    recommendation:
      'Schedule an outpatient consultation at ABUTH within the coming weeks. A doctor will review your responses and advise on appropriate next steps, which may include a PSA screening test.',
    urgency: 'WITHIN 4 WEEKS',
  },
  low: {
    tier: 'low',
    label: 'Low Risk',
    icon: '🟢',
    summary: 'Your current responses suggest a low symptom burden.',
    recommendation:
      'Continue attending regular health check-ups. Men above age 50 (or age 40 with family history) should discuss routine PSA screening with their doctor annually. Report any new or worsening symptoms promptly.',
    urgency: 'ROUTINE ANNUAL REVIEW',
  },
} as const;

type RiskTierKey = keyof typeof RISK_TIERS;

function resolveTier(key: string) {
  return RISK_TIERS[key as RiskTierKey] ?? RISK_TIERS.low;
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  private async getPatient(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.PATIENT) {
      throw new BadRequestException('User is not a patient');
    }

    if (!user.profile || !user.medicalBackground) {
      throw new NotFoundException('Patient profile not found');
    }

    return user;
  }

  async getProfile(userId: string) {
    const user = await this.getPatient(userId);
    const conditions =
      user.medicalBackground.conditions?.map((condition) => condition.name) ??
      [];

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      firstName: user.profile.firstName,
      lastName: user.profile.lastName,
      fullName: `${user.profile.firstName} ${user.profile.lastName}`,
      dateOfBirth: user.profile.dateOfBirth,
      phoneNumber: user.profile.phoneNumber,
      address: user.profile.address,
      occupation: user.medicalBackground.occupation ?? '',
      bloodGroup: user.medicalBackground.bloodGroup ?? '',
      knownConditions: conditions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    const user = await this.getPatient(userId);

    await this.dataSource.transaction(async (manager) => {
      const profileRepo = manager.getRepository(PatientProfile);
      const backgroundRepo = manager.getRepository(MedicalBackground);
      const conditionRepo = manager.getRepository(MedicalCondition);

      if (dto.phoneNumber !== undefined || dto.address !== undefined) {
        await profileRepo.update(
          { id: user.profile.id },
          {
            phoneNumber: dto.phoneNumber ?? user.profile.phoneNumber,
            address: dto.address ?? user.profile.address,
          },
        );
      }

      if (
        dto.occupation !== undefined ||
        dto.bloodGroup !== undefined ||
        dto.knownConditions !== undefined
      ) {
        const conditions = dto.knownConditions
          ? await Promise.all(
              dto.knownConditions.map(async (name) => {
                const normalized = name.trim();
                let condition = await conditionRepo.findOne({
                  where: { name: normalized },
                });
                if (!condition) {
                  condition = conditionRepo.create({ name: normalized });
                  condition = await conditionRepo.save(condition);
                }
                return condition;
              }),
            )
          : user.medicalBackground.conditions;

        const background = backgroundRepo.create({
          ...user.medicalBackground,
          occupation: dto.occupation ?? user.medicalBackground.occupation,
          bloodGroup: dto.bloodGroup ?? user.medicalBackground.bloodGroup,
          conditions,
        });

        await backgroundRepo.save(background);
      }
    });

    return this.getProfile(userId);
  }

  async createAssessment(userId: string, dto: CreatePatientAssessmentDto) {
    const user = await this.getPatient(userId);
    const assessmentRepo = this.dataSource.getRepository(PatientAssessment);
    const tier = resolveTier(dto.tier.tier);

    const assessment = assessmentRepo.create({
      user,
      patientName:
        dto.patientName ?? `${user.profile.firstName} ${user.profile.lastName}`,
      score: dto.score,
      maxScore: dto.maxScore,
      percentage: dto.percentage,
      tierKey: tier.tier,
      tierLabel: tier.label,
      tierIcon: tier.icon,
      tierSummary: tier.summary,
      tierRecommendation: tier.recommendation,
      tierUrgency: tier.urgency,
      selectedIds: dto.selectedIds,
      breakdown: dto.breakdown,
      status: AssessmentStatus.PENDING,
      confirmedDiagnosis: null,
      prescription: null,
      doctorNotes: null,
      followupDate: null,
      urgency: null,
      reviewedAt: null,
    });

    const saved = await assessmentRepo.save(assessment);
    return this.toAssessmentResponse(saved);
  }

  async getAssessments(userId: string) {
    const user = await this.getPatient(userId);
    const assessmentRepo = this.dataSource.getRepository(PatientAssessment);
    const assessments = await assessmentRepo.find({
      where: { user: { id: user.id } },
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });

    return assessments.map((assessment) =>
      this.toAssessmentResponse(assessment),
    );
  }

  async getPrescriptions(userId: string) {
    const assessments = await this.getAssessments(userId);
    return assessments.filter(
      (assessment) =>
        assessment.status === AssessmentStatus.CONFIRMED &&
        assessment.prescription,
    );
  }

  async getDashboard(userId: string) {
    const profile = await this.getProfile(userId);
    const assessments = await this.getAssessments(userId);
    const prescriptions = assessments.filter(
      (assessment) =>
        assessment.status === AssessmentStatus.CONFIRMED &&
        Boolean(assessment.prescription),
    );
    const latest = assessments[0] ?? null;

    return {
      profile,
      stats: {
        assessments: assessments.length,
        prescriptions: prescriptions.length,
        latestRiskLevel: latest?.tier.label ?? '—',
        latestAssessmentDate: latest?.timestamp ?? null,
      },
      latestAssessment: latest,
      assessments,
      prescriptions,
    };
  }

  private toAssessmentResponse(assessment: PatientAssessment) {
    const tier = resolveTier(assessment.tierKey);

    return {
      id: assessment.id,
      patientId: assessment.user?.id ?? '',
      patientName: assessment.patientName,
      score: assessment.score,
      maxScore: assessment.maxScore,
      percentage: assessment.percentage,
      tier,
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
}
