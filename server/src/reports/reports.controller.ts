import { Controller, Post, Body, Res, UseGuards, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @UseGuards(AuthGuard)
  async generateReport(
    @GetUser('sub') inspectorId: string,
    @Body() dto: GenerateReportDto,
    @Res() res: Response,
  ) {
    try {
      const pdfBuffer = await this.reportsService.generatePdf(
        dto.html,
        dto.inspectionId,
        inspectorId,
      );


      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename=report.pdf',
        'Content-Length': pdfBuffer.length,
      });

      return res.status(HttpStatus.OK).send(pdfBuffer);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to generate PDF report',
        error: error.message,
      });
    }
  }
}
