import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Finding } from './finding.entity';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { ReorderFindingsDto } from './dto/reorder-findings.dto';
import { Inspection } from '../inspections/inspection.entity';

@Injectable()
export class FindingsService {
  constructor(
    @InjectRepository(Finding)
    private readonly findingRepository: Repository<Finding>,
    @InjectRepository(Inspection)
    private readonly inspectionRepository: Repository<Inspection>,
  ) {}

  private async checkInspectionOwnership(inspectorId: string, inspectionId: string): Promise<Inspection> {
    const inspection = await this.inspectionRepository.findOne({
      where: { id: inspectionId, inspector_id: inspectorId },
    });
    if (!inspection) {
      throw new NotFoundException('Inspection not found or you do not have permission');
    }
    return inspection;
  }

  async create(inspectorId: string, inspectionId: string, createFindingDto: CreateFindingDto): Promise<Finding> {
    const inspection = await this.checkInspectionOwnership(inspectorId, inspectionId);

    if (inspection.status !== 'in_progress') {
      throw new ConflictException('Can only add findings to an in_progress inspection');
    }

    const finding = this.findingRepository.create({
      ...createFindingDto,
      inspection_id: inspectionId,
    });

    return await this.findingRepository.save(finding);
  }

  async findAll(inspectorId: string, inspectionId: string, section?: string): Promise<Finding[]> {
    await this.checkInspectionOwnership(inspectorId, inspectionId);

    const match: any = { inspection_id: inspectionId };
    if (section) {
      match.section = section;
    }

    return await this.findingRepository.find({
      where: match,
      relations: ['photos'],
      order: { sort_order: 'ASC' },
    });
  }

  async update(
    inspectorId: string,
    inspectionId: string,
    findingId: string,
    updateFindingDto: UpdateFindingDto,
  ): Promise<Finding> {
    const inspection = await this.checkInspectionOwnership(inspectorId, inspectionId);

    if (inspection.status === 'published') {
      throw new BadRequestException('Cannot edit findings of a published inspection');
    }

    const finding = await this.findingRepository.findOne({
      where: { id: findingId, inspection_id: inspectionId },
    });
    if (!finding) {
      throw new NotFoundException('Finding not found');
    }

    Object.assign(finding, updateFindingDto);
    return await this.findingRepository.save(finding);
  }

  async reorder(inspectorId: string, inspectionId: string, reorderDto: ReorderFindingsDto): Promise<void> {
    const inspection = await this.checkInspectionOwnership(inspectorId, inspectionId);

    if (inspection.status === 'published') {
      throw new BadRequestException('Cannot edit findings of a published inspection');
    }

    await this.findingRepository.manager.transaction(async (manager) => {
      for (const item of reorderDto.findings) {
        await manager.update(Finding, 
          { id: item.id, inspection_id: inspectionId },
          { sort_order: item.sort_order }
        );
      }
    });
  }



  async remove(inspectorId: string, inspectionId: string, findingId: string): Promise<void> {
    const inspection = await this.checkInspectionOwnership(inspectorId, inspectionId);

    if (inspection.status === 'published') {
      throw new BadRequestException('Cannot edit findings of a published inspection');
    }

    const finding = await this.findingRepository.findOne({
      where: { id: findingId, inspection_id: inspectionId },
    });
    if (!finding) {
      throw new NotFoundException('Finding not found');
    }

    await this.findingRepository.remove(finding);
  }
}
