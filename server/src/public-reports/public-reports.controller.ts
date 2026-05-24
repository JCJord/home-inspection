import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicReportsService } from './public-reports.service';

@Controller('public-reports')
export class PublicReportsController {
  constructor(private readonly publicReportsService: PublicReportsService) {}

  @Get(':id')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute per IP for this endpoint
  async findOne(@Param('id') id: string) {
    return this.publicReportsService.findPublicReport(id);
  }
}
