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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiTooManyRequestsResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({
    short: { limit: 2, ttl: seconds(60), blockDuration: minutes(30) },
    medium: { limit: 3, ttl: hours(1), blockDuration: hours(2) },
    long: { limit: 5, ttl: hours(24), blockDuration: hours(48) },
  })
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description:
      'User successfully created. Access and refresh cookies issued.',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or malformed request payload.',
  })
  @ApiConflictResponse({ description: 'Email address is already registered.' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Registration attempt blocked.',
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
    short: { limit: 3, ttl: seconds(60), blockDuration: minutes(15) },
    medium: { limit: 10, ttl: minutes(15), blockDuration: hours(1) },
    long: { limit: 20, ttl: hours(24), blockDuration: hours(24) },
  })
  @ApiOperation({ summary: 'Authenticate user and issue tokens' })
  @ApiResponse({
    status: 200,
    description:
      'Authentication successful. Access and refresh cookies issued.',
  })
  @ApiBadRequestResponse({
    description:
      'Validation failed due to missing or invalid credentials format.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Login functionality temporarily locked.',
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
  @ApiCookieAuth('refreshToken') // Documents that this specific cookie is expected
  @ApiOperation({
    summary:
      'Rotate access and refresh tokens using existing refresh token cookie',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens rotated successfully. Refreshed cookies issued.',
  })
  @ApiUnauthorizedResponse({
    description:
      'Missing, expired, or invalid refresh token verification status.',
  })
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
  @ApiCookieAuth('accessToken') // Documents that the session access cookie is consumed
  @ApiOperation({ summary: 'Log out current session and invalidate cookies' })
  @ApiResponse({
    status: 200,
    description:
      'Session successfully revoked. Authentication cookies wiped clean.',
  })
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
      // sameSite: 'strict' as const,
      sameSite: 'none' as const,
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
