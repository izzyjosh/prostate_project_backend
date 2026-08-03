import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserResponse } from './dto/user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: { clinicianProfile: true },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      relations: {
        profile: true,
        clinicianProfile: true,
        medicalBackground: true, // optional
      },
    });
  }

  async createUser(email: string, passwordHash: string): Promise<UserResponse> {
    const user = this.userRepository.create({
      email,
      passwordHash,
    });

    const savedUser = await this.userRepository.save(user);
    return this.toUserResponse(savedUser);
  }

  async updateUser(id: string, user: Partial<User>): Promise<UserResponse> {
    await this.userRepository.update(id, user);
    const updatedUser = await this.userRepository.findOne({ where: { id } });
    return this.toUserResponse(updatedUser);
  }

  private toUserResponse(user: User | null): UserResponse {
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  }
}
