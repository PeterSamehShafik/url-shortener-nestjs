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

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @OptionalAuth()
  @Post('urls')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createUrlDto: CreateUrlDto,
    @CurrentUser() user?: RequestUser,
  ) {
    console.log(user);
    return this.urlsService.create(createUrlDto, user?.userId ?? null);
  }

  @Get('urls')
  findAll(@CurrentUser() user: RequestUser) {
    return this.urlsService.findAllByUser(user.userId);
  }

  @Patch('urls/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUrlDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.urlsService.update(id, dto, user.userId, user.role);
  }

  @Delete('urls/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.urlsService.delete(id, user.userId, user.role);
  }

  @Public()
  @Get(':slug')
  async redirect(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
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
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, originalUrl);
  }
}
