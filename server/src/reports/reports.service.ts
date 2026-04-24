import { Injectable, Logger } from '@nestjs/common';
import { PdfService } from './pdf.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly pdfService: PdfService) {}

  async generatePdf(html: string): Promise<Buffer> {
    this.logger.log('Generating report PDF...');
    return this.pdfService.generateFromHtml(html);
  }
}
