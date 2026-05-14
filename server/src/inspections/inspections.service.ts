import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Inspection } from './inspection.entity';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { Inspector } from '../inspectors/inspector.entity';
import { Report } from '../reports/report.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';
import { Template } from '../templates/template.entity';

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
  ) { }

  async create(inspectorId: string, createInspectionDto: CreateInspectionDto): Promise<Inspection> {
    const inspector = await this.inspectorRepository.findOne({ where: { id: inspectorId } });
    if (!inspector) {
      throw new NotFoundException('Inspector not found');
    }

    if (
      inspector.subscription_status !== SubscriptionStatus.ACTIVE &&
      inspector.free_inspections_used >= 3
    ) {
      throw new ForbiddenException('Free inspection limit reached. Please upgrade.');
    }

    // Load template
    let template: Template | null = null;
    if (createInspectionDto.template_id) {
      template = await this.templateRepository.findOne({ where: { id: createInspectionDto.template_id } });
    }
    if (!template) {
      template = await this.templateRepository.findOne({ where: { name: 'System Default' } });
    }

    const inspection = this.inspectionRepository.create({
      ...createInspectionDto,
      inspector_id: inspector.id,
      template_id: template?.id || undefined,
      template_snapshot: template?.structure || undefined,
      metadata_values: {}
    });

    const savedInspection = await this.inspectionRepository.save(inspection);

    inspector.free_inspections_used += 1;
    await this.inspectorRepository.save(inspector);

    return savedInspection;
  }

  async findAll(inspectorId: string, page: number = 1, limit: number = 10, status?: string): Promise<{ data: Inspection[], meta: { total: number, page: number, limit: number, totalPages: number } }> {
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Inspection> = { inspector_id: inspectorId };
    if (status) {
      where.status = status;
    }

    const [data, total] = await this.inspectionRepository.findAndCount({
      where,
      order: { updated_at: 'DESC' },
      relations: ['findings'],
      skip,
      take: limit,
    });

    return {
      data,
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
      relations: ['findings', 'findings.photos', 'inspector', 'template'],
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

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

    if (updateInspectionDto.template_id && inspection.status !== 'scheduled') {
      throw new BadRequestException('Cannot change template once inspection has started');
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

  async publish(inspectorId: string, id: string): Promise<Inspection> {
    const inspection = await this.findOne(inspectorId, id);

    if (inspection.status === 'published') {
      throw new ConflictException('Inspection is already published');
    }

    if (!inspection.findings || inspection.findings.length === 0) {
      throw new BadRequestException('Cannot publish an inspection with no findings');
    }

    await this.inspectionRepository.manager.transaction(async (manager) => {
      inspection.status = 'published';
      await manager.save(inspection);

      const report = manager.create(Report, {
        inspection_id: inspection.id,
        pdf_url: 'mock_pdf_url.pdf', // Mock URL
        status: 'done',
        published_at: new Date(),
      });
      await manager.save(report);
    });

    return inspection;
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

    return inspection;
  }

  async remove(inspectorId: string, id: string): Promise<void> {
    const inspection = await this.findOne(inspectorId, id);
    await this.inspectionRepository.remove(inspection);
  }

  async uploadCoverPhoto(inspectorId: string, id: string, coverPhotoUrl: string): Promise<Inspection> {
    const inspection = await this.findOne(inspectorId, id);
    inspection.cover_photo_url = coverPhotoUrl;
    return await this.inspectionRepository.save(inspection);
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
}
