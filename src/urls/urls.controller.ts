import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpStatus,
  HttpCode,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { UrlsService } from '@/urls/urls.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { Response, Request } from 'express';
import { UpdateUrlDto } from './dto/update-url.dto';
import { createHash } from 'crypto';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequestUser } from '@/auth/strategies/jwt.strategy';
import { OptionalAuth } from '@/common/decorators/optional-auth.decorator';
import { AnalyticsService } from '@/analytics/analytics.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiConflictResponse,
  ApiUnprocessableEntityResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiGoneResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('URLs & Analytics')
@Controller()
export class UrlsController {
  constructor(
    private readonly urlsService: UrlsService,
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
  ) {}

  @OptionalAuth()
  @ApiCookieAuth('accessToken')
  @Post('urls')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a shortened URL',
    description:
      'Generates a short slug for a destination URL. Authentication cookie is optional, but required to use advanced features like custom slugs or expiration dates.',
  })
  @ApiResponse({ status: 201, description: 'Short URL created successfully.' })
  @ApiBadRequestResponse({
    description: 'Validation failed on input properties.',
  })
  @ApiForbiddenResponse({
    description:
      'Authentication required to use custom slugs or expiration dates.',
  })
  @ApiConflictResponse({
    description: 'The requested custom slug is already in use.',
  })
  @ApiUnprocessableEntityResponse({
    description:
      'Invalid URL layout or private loopback addresses are disallowed.',
  })
  @ApiInternalServerErrorResponse({
    description:
      'System collision limit reached; failed to generate an isolated unique slug.',
  })
  create(
    @Body() createUrlDto: CreateUrlDto,
    @CurrentUser() user?: RequestUser,
  ) {
    return this.urlsService.create(createUrlDto, user?.userId ?? null);
  }

  @ApiCookieAuth('accessToken')
  @Get('urls')
  @ApiOperation({
    summary: 'Retrieve authenticated user URLs',
    description: 'Fetches all link histories owned by the signed-in identity.',
  })
  @ApiResponse({
    status: 200,
    description: 'User URL collection retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or expired session access token.',
  })
  findAll(@CurrentUser() user: RequestUser) {
    return this.urlsService.findAllByUser(user.userId);
  }

  @ApiCookieAuth('accessToken')
  @Patch('urls/:id')
  @ApiOperation({
    summary: 'Update URL constraints',
    description:
      'Modifies runtime states or shifts link expiration details. Intentionally returns a 404 instead of a 403 on missing permissions to obfuscate resource existence.',
  })
  @ApiResponse({
    status: 200,
    description: 'URL properties updated successfully.',
  })
  @ApiBadRequestResponse({ description: 'Malformed JSON schema data types.' })
  @ApiResponse({
    status: 401,
    description: 'Missing or expired session access token.',
  })
  @ApiNotFoundResponse({
    description:
      'Target URL mapping does not exist, or current actor lacks authorization ownership.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUrlDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.urlsService.update(id, dto, user.userId, user.role);
  }

  @ApiCookieAuth('accessToken')
  @Delete('urls/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete short URL registry',
    description:
      'Permanently removes a redirection mapping. Returns 404 if unauthorized to prevent resource mining exploits.',
  })
  @ApiResponse({
    status: 204,
    description: 'URL entry successfully purged from database storage systems.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or expired session access token.',
  })
  @ApiNotFoundResponse({
    description:
      'Target URL entry does not exist, or current actor lacks ownership authority.',
  })
  delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.urlsService.delete(id, user.userId, user.role);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Execute short link redirection mapping',
    description:
      'Tracks access properties before launching a permanent 301 redirection route headers bundle.',
  })
  @ApiResponse({
    status: 301,
    description:
      'Valid link transaction matched. Issuing destination browser redirect.',
  })
  @ApiNotFoundResponse({
    description:
      'Target shortcut slug matching parameters does not exist, or has been toggled inactive.',
  })
  @ApiGoneResponse({
    description:
      'Target resource lifespan sequence terminated; link has expired.',
  })
  async redirect(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userAgent = req.headers['user-agent'] || null;
      const referer = req.headers['referer'] || null;
      const hashedIp = req.ip
        ? createHash('sha256').update(req.ip).digest('hex')
        : null;

      const originalUrl = await this.urlsService.redirect(
        slug,
        hashedIp,
        userAgent,
        referer,
      );

      return res.redirect(HttpStatus.FOUND, originalUrl);
    } catch (err) {
      console.log(err);
      return res.redirect(
        HttpStatus.FOUND,
        `${this.configService.get('CLIENT_URL')}/404`,
      );
    }
  }

  @ApiCookieAuth('accessToken')
  @Get('urls/:id/analytics')
  @ApiOperation({
    summary: 'Fetch timeline engagement metrics',
    description:
      'Compiles device metrics, browser parameters, and chronological event arrays.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Analytical aggregate payload loaded and structured successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing or expired session access token.',
  })
  @ApiNotFoundResponse({
    description:
      'Parent short URL resource identifier matching configuration parameters could not be found.',
  })
  async getAnalytics(@Param('id') id: string) {
    const url = await this.urlsService.findById(id);
    return await this.analyticsService.getUrlAnalytics(url);
  }
}
