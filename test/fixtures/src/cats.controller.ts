import { Body, Controller, Get, Post } from '@nestjs/common';

import { CatsService } from './cats.service.js';
import { CreateCatDto } from './create-cat.dto.js';

@Controller('cats')
export class CatsController {
  constructor(private readonly catsService: CatsService) {}

  @Get()
  findAll(): string[] {
    return this.catsService.findAll();
  }

  @Post()
  create(@Body() dto: CreateCatDto): string {
    return dto.name;
  }
}
