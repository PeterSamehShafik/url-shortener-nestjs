import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '@/common/decorators/public.decorator';
import { SafeUser } from './auth.service';
import { ConfigService } from '@nestjs/config';
import ms, { StringValue } from 'ms';
import {
  hours,
  minutes,
  seconds,
  SkipThrottle,
  Throttle,
} from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({
    short: {
      limit: 2,
      ttl: seconds(60),
      blockDuration: minutes(30),
    },
    medium: {
      limit: 3,
      ttl: hours(1),
      blockDuration: hours(2),
    },
    long: {
      limit: 5,
      ttl: hours(24),
      blockDuration: hours(48),
    },
  })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser }> {
    const { user, accessToken, refreshToken } = await this.authService.register(
      dto.email,
      dto.password,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @Throttle({
    short: {
      limit: 3,
      ttl: seconds(60),
      blockDuration: minutes(15),
    },
    medium: {
      limit: 10,
      ttl: minutes(15),
      blockDuration: hours(1),
    },
    long: {
      limit: 20,
      ttl: hours(24),
      blockDuration: hours(24),
    },
  })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser }> {
    const { user, accessToken, refreshToken } = await this.authService.login(
      dto.email,
      dto.password,
    );
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @SkipThrottle({ short: true, medium: true })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: SafeUser }> {
    const rawToken = (req as Request & { cookies: Record<string, string> })
      .cookies?.refreshToken;
    if (!rawToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const { user, accessToken, refreshToken } =
      await this.authService.refresh(rawToken);
    this.setAuthCookies(res, accessToken, refreshToken);
    return { user };
  }

  @Public()
  @SkipThrottle({ short: true, medium: true })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request & { cookies: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const rawAccessToken = req.cookies?.accessToken;
    if (rawAccessToken) {
      await this.authService.logout(rawAccessToken);
    }

    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/auth/refresh' });
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    const accessExpiry = ms(
      this.configService.get<string>('JWT_ACCESS_EXPIRY') as StringValue,
    );
    const refreshExpiry = ms(
      this.configService.get<string>('JWT_REFRESH_EXPIRY') as StringValue,
    );
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
    };
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      path: '/',
      maxAge: accessExpiry,
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      path: '/auth/refresh',
      maxAge: refreshExpiry,
    });
  }
}
