import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UrlsService } from '@/urls/urls.service';
import { CreateUrlDto } from './dto/create-url.dto';
import { Response } from 'express';

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post('urls')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUrlDto: CreateUrlDto) {
    return this.urlsService.create(createUrlDto, null);
  }

  @Get(':slug')
  redirect(@Param('slug') slug: string, @Res() res: Response) {
    const url = this.urlsService.findBySlug(slug);
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, url.originalUrl);
  }

  @Get('/urls/:id')
  getAll(@Param('userId') userId: string) {
    return this.urlsService.findAllByUser(userId);
  }
}
