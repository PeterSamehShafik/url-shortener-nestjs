import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { UrlsService } from '@/urls/urls.service';
import { CreateUrlDto } from './dto/create-url.dto';

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  @Post('urls')
  create(@Body() createUrlDto: CreateUrlDto) {
    return { message: 'create url - not implemented yet', body: createUrlDto };
  }

  @Get(':slug')
  redirect(@Param('slug') slug: string) {
    return this.urlsService.findBySlug(slug);
  }
}
