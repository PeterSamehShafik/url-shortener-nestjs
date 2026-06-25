import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { LessThan, Repository } from 'typeorm';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const token = this.repo.create(data);
    return this.repo.save(token);
  }

  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async deleteAllForUser(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  async deleteExpired(): Promise<void> {
    await this.repo.delete({ expiresAt: LessThan(new Date()) });
  }
}
