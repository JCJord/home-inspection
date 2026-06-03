import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StorageService } from '../common/storage/storage.service';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Photo } from './photo.entity';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { Finding } from '../findings/finding.entity';

@Injectable()
export class PhotosService {
  constructor(
    @InjectRepository(Photo)
    private readonly photoRepository: Repository<Photo>,
    @InjectRepository(Finding)
    private readonly findingRepository: Repository<Finding>,
    private readonly storageService: StorageService,
  ) {}

  private async checkFindingOwnership(
    inspectorId: string,
    inspectionId: string,
    findingId: string,
  ): Promise<Finding> {
    const finding = await this.findingRepository.findOne({
      where: { id: findingId, inspection_id: inspectionId },
      relations: ['inspection'],
    });

    if (!finding || !finding.inspection || finding.inspection.inspector_id !== inspectorId) {
      throw new NotFoundException('Finding not found or you do not have permission');
    }

    return finding;
  }

  async upload(inspectorId: string, inspectionId: string, findingId: string, file: Express.Multer.File, caption?: string): Promise<Photo> {
    if (!file) {
      throw new BadRequestException('Photo file is required');
    }
    if (caption && caption.length > 100) {
      throw new BadRequestException('Caption must not exceed 100 characters');
    }

    const finding = await this.checkFindingOwnership(inspectorId, inspectionId, findingId);

    if (finding.inspection.status === 'published') {
      throw new BadRequestException('Cannot add photos to a published inspection');
    }

    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const key = `users/${inspectorId}/inspections/${inspectionId}/findings/${findingId}/${uniqueSuffix}${ext}`;
    
    const photo_key = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    // Create the photo record
    const photo = this.photoRepository.create({
      finding_id: findingId,
      photo_key: photo_key,
      caption,
    });

    const saved = await this.photoRepository.save(photo);
    const storage_url = await this.storageService.getPresignedUrl(saved.photo_key);
    saved.storage_url = storage_url;
    return saved;
  }

  async findAll(inspectorId: string, inspectionId: string, findingId: string): Promise<Photo[]> {
    await this.checkFindingOwnership(inspectorId, inspectionId, findingId);

    const photos = await this.photoRepository.find({
      where: { finding_id: findingId },
      order: { sort_order: 'ASC' },
    });
    
    return Promise.all(photos.map(async (photo) => {
      const storage_url = await this.storageService.getPresignedUrl(photo.photo_key);
      photo.storage_url = storage_url;
      return photo;
    }));
  }

  async reorder(inspectorId: string, inspectionId: string, findingId: string, reorderDto: ReorderPhotosDto): Promise<void> {
    const finding = await this.checkFindingOwnership(inspectorId, inspectionId, findingId);

    if (finding.inspection.status === 'published') {
      throw new BadRequestException('Cannot edit photos of a published inspection');
    }

    await this.photoRepository.manager.transaction(async (manager) => {
      for (const item of reorderDto.photos) {
        await manager.update(Photo,
          { id: item.id, finding_id: findingId },
          { sort_order: item.sort_order }
        );
      }
    });
  }

  async remove(inspectorId: string, inspectionId: string, findingId: string, photoId: string): Promise<void> {
    const finding = await this.checkFindingOwnership(inspectorId, inspectionId, findingId);

    if (finding.inspection.status === 'published') {
      throw new BadRequestException('Cannot delete photos from a published inspection');
    }

    // Safety check: If ID is not a valid UUID format (e.g. starts with 'temp-'), return 404 early
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(photoId)) {
      throw new NotFoundException('Photo not found (Invalid ID format)');
    }

    const photo = await this.photoRepository.findOne({
      where: { id: photoId, finding_id: findingId },
    });
    
    // IDEMPOTENCY: If the photo is already gone, we treat this as a success.
    // This prevents sync retries from showing as "Failed" in the UI.
    if (!photo) {
      return;
    }

    if (photo.photo_key) {
      await this.storageService.deleteFile(photo.photo_key);
    }

    await this.photoRepository.remove(photo);
  }

  async update(inspectorId: string, inspectionId: string, findingId: string, photoId: string, dto: UpdatePhotoDto): Promise<Photo> {
    const finding = await this.checkFindingOwnership(inspectorId, inspectionId, findingId);

    if (finding.inspection.status === 'published') {
      throw new BadRequestException('Cannot update photos of a published inspection');
    }

    const photo = await this.photoRepository.findOne({
      where: { id: photoId, finding_id: findingId },
    });

    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    if (dto.caption !== undefined) {
      photo.caption = dto.caption;
    }

    return await this.photoRepository.save(photo);
  }
}
