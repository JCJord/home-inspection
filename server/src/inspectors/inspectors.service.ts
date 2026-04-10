import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInspectorDto } from './dto/create-inspector.dto';
import { UpdateInspectorDto } from './dto/update-inspector.dto';
import { Inspector } from './inspector.entity';
import { InspectorsRepository } from './inspectors.repository';

@Injectable()
export class InspectorsService {
  constructor(private readonly inspectorsRepository: InspectorsRepository) { }

  async create(createInspectorDto: CreateInspectorDto): Promise<Inspector> {
    return await this.inspectorsRepository.create(createInspectorDto);
  }

  async findAll(): Promise<Inspector[]> {
    return await this.inspectorsRepository.findAll();
  }

  async findOne(id: string): Promise<Inspector> {
    const inspector = await this.inspectorsRepository.findById(id);
    if (!inspector) {
      throw new NotFoundException(`Inspector with ID ${id} not found`);
    }
    return inspector;
  }

  async findByEmail(email: string): Promise<Inspector | null> {
    return await this.inspectorsRepository.findByEmail(email);
  }

  async update(
    id: string,
    updateInspectorDto: UpdateInspectorDto,
  ): Promise<Inspector> {
    const inspector = await this.inspectorsRepository.update(
      id,
      updateInspectorDto,
    );
    if (!inspector) {
      throw new NotFoundException(`Inspector with ID ${id} not found`);
    }
    return inspector;
  }

  async remove(id: string): Promise<void> {
    const inspector = await this.findOne(id);
    await this.inspectorsRepository.delete(inspector.id);
  }
}


