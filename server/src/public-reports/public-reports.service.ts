import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inspection } from '../inspections/inspection.entity';
import { Inspector } from 'src/inspectors/inspector.entity';
import { StorageService } from 'src/common/storage/storage.service';

@Injectable()
export class PublicReportsService {
  constructor(
    @InjectRepository(Inspection)
    private readonly inspectionRepository: Repository<Inspection>,
    private readonly storageService: StorageService,
  ) { }

  async findPublicReport(id: string): Promise<Inspection> {
    const inspection = await this.inspectionRepository.findOne({
      where: { id },
      relations: ['findings', 'findings.photos', 'inspector', 'report'],
    });

    if (!inspection || inspection.status !== 'published') {
      throw new NotFoundException('Report not found or is not currently published');
    }

    if (inspection.inspector) {
      const safeInspector = inspection.inspector as Omit<Inspector, 'password_hash' | 'reset_password_token' | 'email'> & Partial<Inspector>;
      delete safeInspector.password_hash;
      delete safeInspector.reset_password_token;
      delete safeInspector.email;
      if (safeInspector.logo_key) {
        safeInspector.logo_url = await this.storageService.getPresignedUrl(safeInspector.logo_key);
      }
    }

    if (inspection.cover_photo_key) {
      inspection.cover_photo_url = await this.storageService.getPresignedUrl(inspection.cover_photo_key);
    }
    
    for (const finding of inspection.findings) {
      for (const photo of finding.photos) {
        photo.storage_url = await this.storageService.getPresignedUrl(photo.photo_key);
      }
    }

    if (inspection.report?.pdf_key) {
      inspection.report.pdf_url = await this.storageService.getPresignedUrl(inspection.report.pdf_key);
    }

    return inspection;
  }
}
