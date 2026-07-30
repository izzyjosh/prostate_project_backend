import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
    const updatedUser = await this.usersService.updateUser(user.id, user);

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

    // notify admins a new clinician needs review, rather than sending
    // the usual "verify your email" link
    await this.mailService.notifyAdminsOfPendingClinician(user);

    return {
      userId: user.id,
      message:
        'Registration received. Your account will be reviewed before activation.',
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
}
