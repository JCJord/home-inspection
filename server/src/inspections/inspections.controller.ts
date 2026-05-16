import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(AuthGuard)
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  create(
    @GetUser('sub') inspectorId: string,
    @Body() createInspectionDto: CreateInspectionDto,
  ) {
    return this.inspectionsService.create(inspectorId, createInspectionDto);
  }

  @Post(':id/cover-photo')
  @UseInterceptors(FileInterceptor('cover_photo'))
  uploadCoverPhoto(
    @GetUser('sub') inspectorId: string,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const coverPhotoUrl = `/uploads/${file.filename}`;
    return this.inspectionsService.uploadCoverPhoto(inspectorId, id, coverPhotoUrl);
  }

  @Get()
  findAll(
    @GetUser('sub') inspectorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const pageNumber = parseInt(page || '1', 10);
    const limitNumber = parseInt(limit || '10', 10);
    return this.inspectionsService.findAll(inspectorId, pageNumber, limitNumber, status, search);
  }

  @Get(':id')
  findOne(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.inspectionsService.findOne(inspectorId, id);
  }

  @Patch(':id')
  update(
    @GetUser('sub') inspectorId: string,
    @Param('id') id: string,
    @Body() updateInspectionDto: UpdateInspectionDto,
  ) {
    return this.inspectionsService.update(inspectorId, id, updateInspectionDto);
  }

  @Post(':id/publish')
  publish(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.inspectionsService.publish(inspectorId, id);
  }

  @Post(':id/unpublish')
  unpublish(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.inspectionsService.unpublish(inspectorId, id);
  }

  @Post(':id/cancel')
  cancel(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.inspectionsService.cancel(inspectorId, id);
  }

  @Patch(':id/start')
  startInspection(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.inspectionsService.startInspection(inspectorId, id);
  }

  @Delete(':id')
  remove(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.inspectionsService.remove(inspectorId, id);
  }
}
