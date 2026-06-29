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
import { JwtPayload } from './strategies/jwt.strategy';

const DUMMY_HASH =
  '8d361ac8f882bf84473f25e7f748a552.e2a0ec7d13e4bb0cea026569e3211118be1ead2dc804ce5dc7d523404c7cc273';
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

    const rawRefreshToken = this.generateRefreshToken();

    const refreshToken = await this.authRepo.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
    });
    const accessToken = this.generateAccessToken(
      user.id,
      user.role,
      refreshToken.id,
    );

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

    const rawRefreshToken = this.generateRefreshToken();

    const refreshToken = await this.authRepo.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
    });
    const accessToken = this.generateAccessToken(
      user.id,
      user.role,
      refreshToken.id,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = user;

    return { user: safeUser, accessToken, refreshToken: rawRefreshToken };
  }

  async refresh(rawToken: string): Promise<AuthResult> {
    const tokenHash = this.hashToken(rawToken);
    const existing = await this.authRepo.findByTokenHash(tokenHash);

    if (!existing) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existing.expiresAt < new Date()) {
      await this.authRepo.deleteById(existing.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.authRepo.deleteById(existing.id);

    const user = await this.userService.findById(existing.userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const rawRefreshToken = this.generateRefreshToken();

    const refreshToken = await this.authRepo.create({
      userId: user.id,
      tokenHash: this.hashToken(rawRefreshToken),
      expiresAt: this.getRefreshTokenExpiresAt(),
    });
    const accessToken = this.generateAccessToken(
      user.id,
      user.role,
      refreshToken.id,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, ...safeUser } = user;

    return { user: safeUser, accessToken, refreshToken: rawRefreshToken };
  }

  async logout(rawAccessToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(rawAccessToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      await this.authRepo.deleteById(payload.sid);
    } catch {
      // Token invalid, expired, or already gone — nothing to delete
      // Logout still succeeds — cookies are cleared regardless
    }
  }

  async purgeExpiredTokens(): Promise<number> {
    let totalDeleted = 0;
    let deletedCount = 0;
    const BATCH_SIZE = 1000;
    do {
      deletedCount = await this.authRepo.deleteExpired(BATCH_SIZE);
      totalDeleted += deletedCount;
    } while (deletedCount > 0);
    return totalDeleted;
  }

  private generateAccessToken(
    userId: string,
    role: userRole,
    sid: string,
  ): string {
    return this.jwtService.sign(
      { sub: userId, role, sid },
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
    ) as StringValue;
    return new Date(Date.now() + ms(expiry));
  }
}
