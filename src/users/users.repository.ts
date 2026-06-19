import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { QueryFailedError, Repository } from 'typeorm';
import { EmailAlreadyExistsError } from './errors/email-already-exists.error';

export interface CreateUserData {
  email: string;
  password: string | null;
}

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: CreateUserData): Promise<User> {
    try {
      const user = this.repo.create(data);
      return this.repo.save(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as { code?: string }).code === '23505'
      ) {
        throw new EmailAlreadyExistsError(data.email);
      }
      throw error;
    }
  }
}
