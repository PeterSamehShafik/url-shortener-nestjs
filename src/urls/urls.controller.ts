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

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post('urls')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUrlDto: CreateUrlDto) {
    return this.urlsService.create(createUrlDto, null);
  }

  @Get('urls')
  findAll() {
    return this.urlsService.findAllByUser('user-id');
  }

  @Patch('urls/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUrlDto) {
    return this.urlsService.update(id, dto, 'user-id', 'user');
  }

  @Delete('urls/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    // userId and role will come from JWT in Phase 3
    return this.urlsService.delete(id, 'user-id', 'user');
  }

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
