import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inspection } from './inspection.entity';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { Inspector } from '../inspectors/inspector.entity';
import { Report } from '../reports/report.entity';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';

@Injectable()
export class InspectionsService {
  constructor(
    @InjectRepository(Inspection)
    private readonly inspectionRepository: Repository<Inspection>,
    @InjectRepository(Inspector)
    private readonly inspectorRepository: Repository<Inspector>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
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

    const inspection = this.inspectionRepository.create({
      ...createInspectionDto,
      inspector_id: inspector.id,
    });

    const savedInspection = await this.inspectionRepository.save(inspection);

    inspector.free_inspections_used += 1;
    await this.inspectorRepository.save(inspector);

    return savedInspection;
  }

  async findAll(inspectorId: string, page: number = 1, limit: number = 10): Promise<{ data: Inspection[], meta: { total: number, page: number, limit: number, totalPages: number } }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.inspectionRepository.findAndCount({
      where: { inspector_id: inspectorId },
      order: { updated_at: 'DESC' },
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
      relations: ['findings', 'findings.photos'],
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
}
