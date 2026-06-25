import { ConflictException, Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { EmailAlreadyExistsError } from './errors/email-already-exists.error';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  findByEmail(email: string) {
    return this.usersRepo.findByEmail(email);
  }
  findById(id: string) {
    return this.usersRepo.findById(id);
  }
  async create(email: string, passwordHash: string): Promise<User> {
    try {
      return await this.usersRepo.create({ email, passwordHash });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        throw new ConflictException(
          `The email '${email}' is already registered.`,
        );
      }
      throw error;
    }
  }
}
