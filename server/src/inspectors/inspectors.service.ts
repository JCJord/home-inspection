import { Injectable, NotFoundException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import * as path from 'path';
import { CreateInspectorDto } from './dto/create-inspector.dto';
import { UpdateInspectorDto } from './dto/update-inspector.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Inspector } from './inspector.entity';
import { InspectorsRepository } from './inspectors.repository';

@Injectable()
export class InspectorsService {
  constructor(
    private readonly inspectorsRepository: InspectorsRepository,
    private readonly storageService: StorageService,
  ) { }

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

  async getProfile(id: string) {
    const inspector = await this.findOne(id);
    const { password_hash, ...result } = inspector;
    
    let logo_url: string | null = null;
    if (result.logo_key) {
      logo_url = await this.storageService.getPresignedUrl(result.logo_key);
    }
    
    return { ...result, logo_url };
  }

  async updateProfile(
    id: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Inspector> {
    const inspector = await this.update(id, updateProfileDto as UpdateInspectorDto);
    const { password_hash, ...result } = inspector;
    return result as Inspector;
  }

  async uploadLogo(id: string, file: Express.Multer.File) {
    const ext = path.extname(file.originalname);
    const key = `users/${id}/profile/logo${ext}`;
    const logo_key = await this.storageService.uploadFile(file.buffer, key, file.mimetype);
    
    const inspector = await this.update(id, { logo_key } as any);
    const { password_hash, ...result } = inspector;
    
    const logo_url = await this.storageService.getPresignedUrl(logo_key || '');
    return { ...result, logo_url };
  }

  async remove(id: string): Promise<void> {
    const inspector = await this.findOne(id);
    await this.inspectorsRepository.delete(inspector.id);
  }
}


