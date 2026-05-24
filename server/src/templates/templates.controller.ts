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
} from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(AuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get('icons')
  getAvailableIcons() {
    return this.templatesService.getAvailableIcons();
  }

  @Post()
  create(
    @GetUser('sub') inspectorId: string,
    @Body() createTemplateDto: CreateTemplateDto,
    @Query('source_template_id') sourceTemplateId?: string,
  ) {
    return this.templatesService.create(inspectorId, createTemplateDto, sourceTemplateId);
  }

  @Get()
  findAll(@GetUser('sub') inspectorId: string) {
    return this.templatesService.findAll(inspectorId);
  }

  @Get(':id')
  findOne(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.templatesService.findOne(id, inspectorId);
  }

  @Patch(':id')
  update(
    @GetUser('sub') inspectorId: string,
    @Param('id') id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(id, inspectorId, updateTemplateDto);
  }

  @Delete(':id')
  remove(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.templatesService.remove(id, inspectorId);
  }
}
