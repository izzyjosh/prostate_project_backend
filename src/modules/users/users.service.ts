import { Injectable } from '@nestjs/common';
import { User } from './entities/user.entity';
import { UserResponse } from './dto/user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findById(id: string) {
    return this.usersRepository.findById(id);
  }

  async createUser(email: string, passwordHash: string): Promise<UserResponse> {
    return this.usersRepository.createUser(email, passwordHash);
  }

  async updateUser(id: string, user: Partial<User>): Promise<UserResponse> {
    return this.usersRepository.updateUser(id, user);
  }
}
