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
} from '@nestjs/common';
import { UrlsService } from '@/urls/urls.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { Response } from 'express';
import { UpdateUrlDto } from './dto/update-url.dto';

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
    return this.urlsService.updateUrl(id, dto, 'user-id', 'user');
  }

  @Delete('urls/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    // userId and role will come from JWT in Phase 3
    return this.urlsService.deleteUrl(id, 'user-id', 'user');
  }

  @Get(':slug')
  async redirect(@Param('slug') slug: string, @Res() res: Response) {
    const url = await this.urlsService.findBySlug(slug);
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, url.originalUrl);
  }
}
