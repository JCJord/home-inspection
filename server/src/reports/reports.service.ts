import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PdfService } from './pdf.service';
import { Inspection } from '../inspections/inspection.entity';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly pdfService: PdfService,
    @InjectRepository(Inspection)
    private readonly inspectionRepository: Repository<Inspection>,
  ) {}

  async generatePdf(
    html: string,
    inspectionId?: string,
    inspectorId?: string,
  ): Promise<Buffer> {
    this.logger.log('Generating report PDF...');

    if (inspectionId && inspectorId) {
      const inspection = await this.inspectionRepository.findOne({
        where: { id: inspectionId, inspector_id: inspectorId },
      });

      if (!inspection) {
        throw new NotFoundException('Inspection not found or unauthorized');
      }
    }

    return this.pdfService.generateFromHtml(html);
  }
}

