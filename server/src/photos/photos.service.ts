import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    const finding = await this.checkFindingOwnership(inspectorId, inspectionId, findingId);

    if (finding.inspection.status === 'published') {
      throw new BadRequestException('Cannot add photos to a published inspection');
    }

    // Build the URL path that matches the ServeStaticModule serveRoot '/uploads'
    const storageUrl = `/uploads/${file.filename}`;

    // Create the photo record
    const photo = this.photoRepository.create({
      finding_id: findingId,
      storage_url: storageUrl,
      caption,
    });

    return await this.photoRepository.save(photo);
  }

  async findAll(inspectorId: string, inspectionId: string, findingId: string): Promise<Photo[]> {
    await this.checkFindingOwnership(inspectorId, inspectionId, findingId);

    return await this.photoRepository.find({
      where: { finding_id: findingId },
      order: { sort_order: 'ASC' },
    });
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

    const photo = await this.photoRepository.findOne({
      where: { id: photoId, finding_id: findingId },
    });
    if (!photo) {
      throw new NotFoundException('Photo not found');
    }

    // Mock R2 deletion here if storage service was injected

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
