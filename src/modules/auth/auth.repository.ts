import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Token } from './entities/token.entity';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
  ) {}

  async createToken(
    userId: string,
    email: string,
    token: string,
    expiresIn: number = 24 * 60 * 60 * 1000,
  ): Promise<Token> {
    const tokenInstance = this.tokenRepository.create({
      userId,
      email,
      tokenHash: await bcrypt.hash(token, 10),
      expiresAt: new Date(Date.now() + expiresIn),
    });

    return this.tokenRepository.save(tokenInstance);
  }

  async findVerificationToken(token: string): Promise<Token | null> {
    const activeTokens = await this.tokenRepository.find({
      where: { isUsed: false },
      order: { createdAt: 'DESC' },
    });

    for (const tokenRecord of activeTokens) {
      const isMatch = await bcrypt.compare(token, tokenRecord.tokenHash);
      if (isMatch) {
        return tokenRecord;
      }
    }

    return null;
  }

  async markTokenAsUsed(tokenRecord: Token): Promise<Token> {
    tokenRecord.isUsed = true;
    return this.tokenRepository.save(tokenRecord);
  }
}
