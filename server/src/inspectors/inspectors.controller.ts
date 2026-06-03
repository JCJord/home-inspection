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
  UsePipes,
  ValidationPipe,
  BadRequestException,
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

  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@GetUser('sub') userId: string) {
    return this.inspectorsService.getProfile(userId);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  updateProfile(
    @GetUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.inspectorsService.updateProfile(userId, updateProfileDto);
  }

  @Post('profile/logo')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('logo', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/^image\/(jpeg|png|webp|svg\+xml)$/)) {
        return cb(new BadRequestException('Only JPEG, PNG, WebP and SVG images are allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadLogo(
    @GetUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.inspectorsService.uploadLogo(userId, file);
  }

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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inspectorsService.remove(id);
  }
}
