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

const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
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
    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes in ms
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });
  }
}
