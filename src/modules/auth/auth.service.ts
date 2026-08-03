import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { AuthUtils } from './utils/auth.utils';
import { clearAuthCookies, setAuthCookies } from './utils/cookie.util';
import { Response } from 'express';
import { AuthRepository } from './auth.repository';
import { RegisterDto } from './dto/register.dto';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PatientProfile } from '../users/entities/patient-profile.entity';
import { MedicalCondition } from '../users/entities/medical-condition.entity';
import { MedicalBackground } from '../users/entities/medical-background.entity';
import { Token } from './entities/token.entity';
import { RegisterClinicianDto } from './dto/register-clinician.dto';
import { UserRole } from '../users/entities/user.entity';
import {
  ClinicianProfile,
  ClinicianStatus,
} from '../users/entities/clinician-profile.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly authUtils: AuthUtils,
    private readonly authRepository: AuthRepository,
    private datasource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await this.authUtils.hashPassword(dto.password);

    const user = await this.datasource.transaction(async (manager) => {
      const newUser = await manager.create(User, {
        email: dto.email,
        passwordHash,
      });

      await manager.save(newUser);

      const profile = manager.create(PatientProfile, {
        user: newUser,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth,
        phoneNumber: dto.phoneNumber,
        address: dto.address,
      });
      await manager.save(profile);

      let conditions: MedicalCondition[] = [];
      if (dto.knownConditions?.length) {
        conditions = await Promise.all(
          dto.knownConditions.map(async (name) => {
            let condition = await manager.findOne(MedicalCondition, {
              where: { name },
            });
            if (!condition) {
              condition = manager.create(MedicalCondition, { name });
              await manager.save(condition);
            }
            return condition;
          }),
        );
      }

      const medicalBackground = manager.create(MedicalBackground, {
        user: newUser,
        occupation: dto.occupation,
        bloodGroup: dto.bloodGroup,
        conditions,
      });
      await manager.save(medicalBackground);
      return newUser;
    });

    const token = await this.authUtils.generateToken();
    await this.authRepository.createToken(user.id, dto.email, token);
    await this.mailService.queueVerificationEmail(dto.email, token);
    return { userId: user.id, message: 'Verification email sent' };
  }

  async login(email: string, password: string, res: Response) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isVerified) {
      throw new BadRequestException('Please verify your email first');
    }

    const isPasswordValid = await this.authUtils.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }

    // in login logic, after password check
    if (
      user.role === UserRole.CLINICIAN &&
      user.clinicianProfile.status !== ClinicianStatus.APPROVED
    ) {
      throw new ForbiddenException('Your account is pending admin approval');
    }

    const { accessToken, refreshToken } = await this.authUtils.signToken(user);
    await this.usersService.updateUser(user.id, {
      lastLogin: new Date(),
    });

    setAuthCookies(res, { accessToken, refreshToken });

    return {
      message: 'Login successful',
      tokens: { accessToken, refreshToken },
      role: `${user.role}`,
    };
  }

  async logout(res: Response) {
    clearAuthCookies(res);

    return {
      message: 'Logout successful',
    };
  }

  async verifyEmail(token: string) {
    const tokenRecord = await this.authRepository.findVerificationToken(token);
    if (!tokenRecord) {
      throw new NotFoundException('Invalid or expired verification token');
    }
    if (tokenRecord.isUsed || tokenRecord.expiresAt < new Date()) {
      throw new BadRequestException('Token has already been used or expired');
    }
    await this.authRepository.markTokenAsUsed(tokenRecord);

    const user = await this.usersService.findByEmail(tokenRecord.email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.isVerified = true;
    const updatedUser = await this.usersService.updateUser(user.id, {
      isVerified: true,
    });

    const { accessToken, refreshToken } = await this.authUtils.signToken(user);

    await this.authRepository.createToken(
      user.id,
      user.email,
      refreshToken,
      7 * 24 * 60 * 60 * 1000,
    );

    return {
      message: 'Email verified successfully',
      user: updatedUser,
      tokens: { accessToken, refreshToken },
    };
  }

  async resendVerificationEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isVerified) {
      throw new BadRequestException('User is already verified');
    }
    const token = await this.authUtils.generateToken();
    await this.authRepository.createToken(user.id, email, token);
    await this.mailService.queueVerificationEmail(email, token);
    return {
      message: 'Verification email sent successfully',
    };
  }

  // auth.service.ts
  async registerClinician(dto: RegisterClinicianDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await this.authUtils.hashPassword(dto.password);

    const user = await this.datasource.transaction(async (manager) => {
      const newUser = manager.create(User, {
        email: dto.email,
        passwordHash,
        role: UserRole.CLINICIAN, // hardcoded server-side, never from client
      });
      await manager.save(newUser);

      const clinicianProfile = manager.create(ClinicianProfile, {
        user: newUser,
        firstName: dto.firstName,
        lastName: dto.lastName,
        licenseNumber: dto.licenseNumber,
        specialty: dto.specialty,
        hospitalAffiliation: dto.hospitalAffiliation,
        status: ClinicianStatus.PENDING,
      });
      await manager.save(clinicianProfile);

      return newUser;
    });

    const token = await this.authUtils.generateToken();
    await this.authRepository.createToken(user.id, dto.email, token);
    await this.mailService.queueVerificationEmail(dto.email, token);

    // notify admins a new clinician needs review, rather than sending
    // the usual "verify your email" link
    this.logger.log('Sending admin notification...');
    await this.mailService.notifyAdminsOfPendingClinician(user);
    this.logger.log('Admin notification sent.');

    return {
      userId: user.id,
      message:
        'Registration received. Your account will be reviewed before activation. A verification email has been sent to your email address.',
    };
  }

  async approveClinician(clinicianId: string, approvedById: string) {
    const approvedClinician = await this.datasource.transaction(
      async (manager) => {
        const clinician = await manager.findOne(User, {
          where: { id: clinicianId },
          relations: { clinicianProfile: true },
        });

        if (!clinician) {
          throw new NotFoundException('Clinician does not exist');
        }

        if (!clinician.clinicianProfile) {
          throw new BadRequestException('User is not a clinician');
        }

        clinician.isVerified = true;
        clinician.clinicianProfile.status = ClinicianStatus.APPROVED;
        clinician.clinicianProfile.approvedBy = approvedById;
        clinician.clinicianProfile.approvedAt = new Date();

        await manager.save(clinician);
        await manager.save(clinician.clinicianProfile);

        return clinician;
      },
    );

    return {
      message: 'Clinician approved successfully',
      clinicianId: approvedClinician.id,
      status: approvedClinician.clinicianProfile.status,
    };
  }

  async refreshAccessToken(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    const payload = await this.authUtils.verifyRefreshToken(refreshToken);
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.isVerified) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    if (
      user.role === UserRole.CLINICIAN &&
      user.clinicianProfile?.status !== ClinicianStatus.APPROVED
    ) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    const { accessToken } = await this.authUtils.signToken(user);

    return { accessToken };
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const base = {
      id: user.id,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    if (user.role === UserRole.PATIENT && user.profile) {
      return {
        ...base,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        phoneNumber: user.profile.phoneNumber,
        dateOfBirth: user.profile.dateOfBirth,
        address: user.profile.address,
        occupation: user.medicalBackground?.occupation ?? '',
        bloodGroup: user.medicalBackground?.bloodGroup ?? '',
        knownConditions:
          user.medicalBackground?.conditions?.map(
            (condition) => condition.name,
          ) ?? [],
      };
    }

    if (user.role === UserRole.CLINICIAN && user.clinicianProfile) {
      return {
        ...base,
        firstName: user.clinicianProfile.firstName,
        lastName: user.clinicianProfile.lastName,
        specialty: user.clinicianProfile.specialty,
        hospital: user.clinicianProfile.hospitalAffiliation,
        licenseNumber: user.clinicianProfile.licenseNumber,
      };
    }

    return base;
  }
}
