import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { InspectorsService } from './inspectors.service';
import { CreateInspectorDto } from './dto/create-inspector.dto';
import { UpdateInspectorDto } from './dto/update-inspector.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('inspectors')
export class InspectorsController {
  constructor(private readonly inspectorsService: InspectorsService) {}

  @Post()
  create(@Body() createInspectorDto: CreateInspectorDto) {
    return this.inspectorsService.create(createInspectorDto);
  }

  @Get()
  findAll() {
    return this.inspectorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inspectorsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInspectorDto: UpdateInspectorDto) {
    return this.inspectorsService.update(id, updateInspectorDto);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@GetUser('id') userId: string) {
    return this.inspectorsService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  updateProfile(
    @GetUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.inspectorsService.updateProfile(userId, updateProfileDto);
  }

  @Post('profile/logo')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(
    @GetUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // For now, we store the local path. In production, this would be an R2 URL.
    const logoUrl = `/uploads/${file.filename}`;
    return this.inspectorsService.uploadLogo(userId, logoUrl);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inspectorsService.remove(id);
  }
}
