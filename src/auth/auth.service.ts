import { UsersService } from '@/users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthRepository } from './auth.repository';
import { PasswordUtil } from '@/common/utils/password.util';
import { userRole } from '@/users/entities/user.entity';

//jwt
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import ms, { StringValue } from 'ms';

const DUMMY_HASH =
  'abcdef0123456789abcdef0123456789.abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

export interface SafeUser {
  id: string;
  email: string;
  role: userRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly authRepo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(email: string, password: string): Promise<AuthResult> {
    const passwordHash = await PasswordUtil.hash(password);
    const user = await this.userService.create(email, passwordHash);

    const accessToken = this.generateAccessToken(user.id, user.role);
    const rawRefreshToken = this.generateRefreshToken();

    await this.authRepo.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken: rawRefreshToken };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.userService.findByEmail(email);

    // If user is null, swap in the DUMMY_HASH so scrypt runs anyway
    const hashToVerify = user ? user.passwordHash : DUMMY_HASH;
    const isValid = await PasswordUtil.verify(password, hashToVerify);
    if (!user || !isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateAccessToken(user.id, user.role);
    const rawRefreshToken = this.generateRefreshToken();
    await this.authRepo.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = user;

    return { user: safeUser, accessToken, refreshToken: rawRefreshToken };
  }

  private generateAccessToken(userId: string, role: userRole): string {
    return this.jwtService.sign(
      { sub: userId, role },
      { secret: this.configService.get<string>('JWT_SECRET') }, //expires inherit from jwtModule
    );
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private hashToken(raw: string): string {
    // no need for scrypt as its already 64 random bytes they don't need slow hash
    return createHash('sha256').update(raw).digest('hex');
  }

  private getRefreshTokenExpiresAt(): Date {
    const expiry = this.configService.get<string>(
      'JWT_REFRESH_EXPIRY',
      '7d',
    ) as StringValue;
    return new Date(Date.now() + ms(expiry));
  }
}
