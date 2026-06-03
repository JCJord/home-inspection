import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Inspection } from './inspection.entity';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { Inspector } from '../inspectors/inspector.entity';
import { Report } from '../reports/report.entity';
import { Template } from '../templates/template.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PdfService } from '../reports/pdf.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class InspectionsService {
  constructor(
    @InjectRepository(Inspection)
    private readonly inspectionRepository: Repository<Inspection>,
    @InjectRepository(Inspector)
    private readonly inspectorRepository: Repository<Inspector>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    private readonly eventEmitter: EventEmitter2,
    private readonly pdfService: PdfService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
  ) { }

  async create(inspectorId: string, createInspectionDto: CreateInspectionDto): Promise<Inspection> {
    const inspector = await this.inspectorRepository.findOne({ where: { id: inspectorId } });
    if (!inspector) {
      throw new NotFoundException('Inspector not found');
    }


    // Load template
    let template: Template | null = null;
    if (createInspectionDto.template_id) {
      template = await this.templateRepository.findOne({ where: { id: createInspectionDto.template_id } });
    }
    if (!template) {
      const defaultTemplate = await this.templateRepository.findOne({ where: { name: 'System Default' } });
      if (defaultTemplate) {
        template = defaultTemplate;
      }
    }
    const status = createInspectionDto.scheduled_date ? 'scheduled' : 'in_progress';

    const inspection = this.inspectionRepository.create({
      ...createInspectionDto,
      inspector_id: inspectorId,
      template_id: template?.id,
      template: template || undefined,
      template_snapshot: template?.structure,
      metadata_values: {},
      status
    });

    const savedInspection = await this.inspectionRepository.save(inspection);



    // Add relation back for event (only for scheduled bookings)
    if (savedInspection.status === 'scheduled') {
      savedInspection.inspector = inspector;
      this.eventEmitter.emit('inspection.scheduled', savedInspection);
    }

    return savedInspection;
  }

  async findAll(
    inspectorId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.inspectionRepository.createQueryBuilder('inspection')
      .where('inspection.inspector_id = :inspectorId', { inspectorId });

    if (startDate) {
      queryBuilder.andWhere('inspection.scheduled_date >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('inspection.scheduled_date <= :endDate', { endDate });
    }

    if (status) {
      queryBuilder.andWhere('inspection.status = :status', { status });
    }

    if (search) {
      const searchPattern = `%${search}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('inspection.client_name ILike :search', { search: searchPattern })
            .orWhere('inspection.address ILike :search', { search: searchPattern });
        }),
      );
    }

    if (status === 'scheduled') {
      queryBuilder.orderBy('inspection.scheduled_date', 'ASC');
    } else {
      queryBuilder.orderBy('inspection.updated_at', 'DESC');
    }

    const [data, total] = await queryBuilder
      .leftJoinAndSelect('inspection.findings', 'findings')
      .leftJoinAndSelect('inspection.report', 'report')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    const mappedData = await Promise.all(data.map(async (inspection) => {
      let cover_photo_url: string | null = null;
      if (inspection.cover_photo_key) {
        cover_photo_url = await this.storageService.getPresignedUrl(inspection.cover_photo_key);
      }

      if (inspection.report && inspection.report.pdf_key) {
        inspection.report.pdf_url = await this.storageService.getPresignedUrl(inspection.report.pdf_key);
      }

      inspection.cover_photo_url = cover_photo_url || undefined;
      return inspection;
    }));

    return {
      data: mappedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(inspectorId: string, id: string): Promise<Inspection> {
    const inspection = await this.inspectionRepository.findOne({
      where: { id, inspector_id: inspectorId },
      relations: ['findings', 'findings.photos', 'inspector', 'template', 'report'],
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    let cover_photo_url: string | null = null;
    if (inspection.cover_photo_key) {
      cover_photo_url = await this.storageService.getPresignedUrl(inspection.cover_photo_key);
    }
    
    if (inspection.report && inspection.report.pdf_key) {
      inspection.report.pdf_url = await this.storageService.getPresignedUrl(inspection.report.pdf_key);
    }

    if (inspection.findings) {
      for (const finding of inspection.findings) {
        if (finding.photos) {
          for (const photo of finding.photos) {
            if (photo.photo_key) {
              photo.storage_url = await this.storageService.getPresignedUrl(photo.photo_key);
            }
          }
        }
      }
    }

    if (inspection.inspector && inspection.inspector.logo_key) {
      inspection.inspector.logo_url = await this.storageService.getPresignedUrl(inspection.inspector.logo_key);
    }

    inspection.cover_photo_url = cover_photo_url || undefined;
    return inspection;
  }

  async update(inspectorId: string, id: string, updateInspectionDto: UpdateInspectionDto): Promise<Inspection> {
    const inspection = await this.findOne(inspectorId, id);

    if (inspection.status === 'published') {
      throw new BadRequestException('Cannot edit a published inspection');
    }

    if (inspection.status === 'cancelled') {
      throw new ForbiddenException('Cannot update a cancelled inspection');
    }

    if (updateInspectionDto.template_id && updateInspectionDto.template_id !== inspection.template_id) {
      if (inspection.status !== 'scheduled') {
        throw new BadRequestException('Cannot change template once inspection has started');
      }
      const newTemplate = await this.templateRepository.findOne({ where: { id: updateInspectionDto.template_id } });
      if (newTemplate) {
        inspection.template_snapshot = newTemplate.structure;
        inspection.template = newTemplate;
        inspection.template_id = newTemplate.id;
      } else {
        throw new BadRequestException('The selected template no longer exists. Please refresh the page.');
      }
      delete updateInspectionDto.template_id;
    }

    // Merge JSON objects to prevent overwriting other fields
    if (updateInspectionDto.metadata_values) {
      inspection.metadata_values = {
        ...(inspection.metadata_values || {}),
        ...updateInspectionDto.metadata_values
      };
      delete updateInspectionDto.metadata_values;
    }

    if (updateInspectionDto.section_statuses) {
      inspection.section_statuses = {
        ...(inspection.section_statuses || {}),
        ...updateInspectionDto.section_statuses
      };
      delete updateInspectionDto.section_statuses;
    }

    Object.assign(inspection, updateInspectionDto);
    return await this.inspectionRepository.save(inspection);
  }

  async publish(inspectorId: string, id: string, html?: string): Promise<Inspection> {
    const inspection = await this.findOne(inspectorId, id);

    if (inspection.status === 'published' && !html) {
      throw new ConflictException('Inspection is already published');
    }

    if (!inspection.findings || inspection.findings.length === 0) {
      throw new BadRequestException('Cannot publish an inspection with no findings');
    }

    let pdfKey: string | null = null;

    if (html) {
      try {
        const pdfBuffer = await this.pdfService.generateFromHtml(html);
        pdfKey = `users/${inspectorId}/inspections/${id}/reports/report.pdf`;
        await this.storageService.uploadFile(pdfBuffer, pdfKey as string, 'application/pdf');
      } catch (error) {
        throw new BadRequestException(`Failed to compile PDF report: ${error.message}`);
      }
    }

    await this.inspectionRepository.manager.transaction(async (manager) => {
      inspection.status = 'published';
      await manager.save(inspection);

      let report = await manager.findOne(Report, { where: { inspection_id: inspection.id } });
      if (report) {
        if (pdfKey) report.pdf_key = pdfKey;
        report.status = 'done';
        report.published_at = new Date();
      } else {
        report = manager.create(Report, {
          inspection_id: inspection.id,
          pdf_key: pdfKey || undefined,
          status: 'done',
          published_at: new Date(),
        });
      }
      await manager.save(report);
    });

    return await this.findOne(inspectorId, id);
  }

  async unpublish(inspectorId: string, id: string): Promise<Inspection> {
    const inspection = await this.findOne(inspectorId, id);

    if (inspection.status !== 'published') {
      throw new BadRequestException('Inspection is not published');
    }

    await this.inspectionRepository.manager.transaction(async (manager) => {
      inspection.status = 'in_progress';
      await manager.save(inspection);

      // Remove associated report record
      await manager.delete(Report, { inspection_id: inspection.id });
    });

    return await this.findOne(inspectorId, id);
  }

  async remove(inspectorId: string, id: string): Promise<void> {
    const inspection = await this.findOne(inspectorId, id);
    const prefix = `users/${inspectorId}/inspections/${id}/`;
    await this.storageService.deleteDirectory(prefix);

    await this.inspectionRepository.remove(inspection);
  }

  async uploadCoverPhoto(inspectorId: string, id: string, file: Express.Multer.File) {
    const ext = path.extname(file.originalname);
    const key = `users/${inspectorId}/inspections/${id}/cover_photo${ext}`;
    const cover_photo_key = await this.storageService.uploadFile(file.buffer, key, file.mimetype);
    
    let inspection = await this.inspectionRepository.findOne({
      where: { id, inspector_id: inspectorId }
    });
    
    if (!inspection) throw new NotFoundException('Inspection not found');

    inspection.cover_photo_key = cover_photo_key;
    const saved = await this.inspectionRepository.save(inspection);
    
    const cover_photo_url = await this.storageService.getPresignedUrl(saved.cover_photo_key || '');
    saved.cover_photo_url = cover_photo_url;
    return saved;
  }

  async startInspection(inspectorId: string, id: string): Promise<Inspection> {
    const inspection = await this.findOne(inspectorId, id);

    if (inspection.status !== 'scheduled') {
      throw new BadRequestException('Only scheduled inspections can be started');
    }

    if (!inspection.template_id) {
      throw new BadRequestException('Cannot start inspection without a template selected');
    }

    const template = await this.templateRepository.findOne({ where: { id: inspection.template_id } });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return await this.inspectionRepository.manager.transaction(async (manager) => {
      inspection.template_snapshot = template.structure;
      inspection.status = 'in_progress';
      return await manager.save(inspection);
    });
  }

  async cancel(inspectorId: string, id: string): Promise<Inspection> {
    const inspection = await this.findOne(inspectorId, id);

    if (inspection.status === 'published') {
      throw new BadRequestException('Cannot cancel a published inspection');
    }

    inspection.status = 'cancelled';
    return await this.inspectionRepository.save(inspection);
  }

  async getInspectionStats(inspectorId: string) {
    const total = await this.inspectionRepository.count({ where: { inspector_id: inspectorId } });
    const scheduled = await this.inspectionRepository.count({ where: { inspector_id: inspectorId, status: 'scheduled' } });
    const inProgress = await this.inspectionRepository.count({ where: { inspector_id: inspectorId, status: 'in_progress' } });
    const published = await this.inspectionRepository.count({ where: { inspector_id: inspectorId, status: 'published' } });

    return {
      total,
      scheduled,
      inProgress,
      published,
    };
  }

  async sendReport(inspectorId: string, id: string, targetEmail: string): Promise<Inspection> {
    const inspection = await this.findOne(inspectorId, id);

    if (inspection.inspector_id !== inspectorId) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    if (inspection.status !== 'published') {
      throw new BadRequestException('Inspection must be published before sending the report');
    }

    if (!inspection.report || !inspection.report.pdf_key) {
      throw new NotFoundException('The report PDF file could not be found on the server. Please republish the report.');
    }

    const pdfUrl = await this.storageService.getPresignedUrl(inspection.report.pdf_key);

    await this.mailService.sendReportEmail(targetEmail, pdfUrl, inspection.address || 'Your Property');

    inspection.report_sent_at = new Date();
    return await this.inspectionRepository.save(inspection);
  }
}
