import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { StringValue } from 'ms';
import { env } from '../../../config/env';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AuthUtils {
  constructor(private readonly jwtService: JwtService) {}

  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 10);
  }

  async comparePassword(
    password: string,
    passwordHash: string,
  ): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(password, passwordHash);
  }

  async generateToken(length: number = 32): Promise<string> {
    return randomBytes(length).toString('hex');
  }

  async signToken(user: User): Promise<Record<string, string>> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_EXPIRES as StringValue,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_EXPIRES as StringValue,
    });

    return { accessToken, refreshToken };
  }
}
