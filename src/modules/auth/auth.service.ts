import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { AuthUtils } from './utils/auth.utils';
import { clearAuthCookies, setAuthCookies } from './utils/cookie.util';
import { Response } from 'express';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly authUtils: AuthUtils,
    private readonly authRepository: AuthRepository,
  ) {}

  async register(email: string, password: string) {
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }
    const hashedPassword = await this.authUtils.hashPassword(password);
    const token = await this.authUtils.generateToken();

    const newUser = await this.usersService.createUser(email, hashedPassword);
    await this.authRepository.createToken(newUser.id, email, token);

    await this.mailService.queueVerificationEmail(email, token);
    return {
      message:
        'Registration successful, please check your email to verify your account',
    };
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
}
