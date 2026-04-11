import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhotosService } from './photos.service';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(AuthGuard)
@Controller('inspections/:inspectionId/findings/:findingId/photos')
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post()
  @UseInterceptors(FileInterceptor('photo', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp)$/)) {
        return cb(new BadRequestException('Only JPEG, PNG and WebP images are allowed'), false);
      }
      cb(null, true);
    },
  }))
  upload(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Param('findingId') findingId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.photosService.upload(inspectorId, inspectionId, findingId, file);
  }

  @Get()
  findAll(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Param('findingId') findingId: string,
  ) {
    return this.photosService.findAll(inspectorId, inspectionId, findingId);
  }

  @Patch('reorder')
  reorder(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Param('findingId') findingId: string,
    @Body() reorderDto: ReorderPhotosDto,
  ) {
    return this.photosService.reorder(inspectorId, inspectionId, findingId, reorderDto);
  }

  @Delete(':photoId')
  remove(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Param('findingId') findingId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.photosService.remove(inspectorId, inspectionId, findingId, photoId);
  }
}
