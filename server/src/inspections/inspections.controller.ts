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
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

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

  @Get()
  findAll(
    @GetUser('sub') inspectorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNumber = parseInt(page || '1', 10);
    const limitNumber = parseInt(limit || '10', 10);
    return this.inspectionsService.findAll(inspectorId, pageNumber, limitNumber);
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

  @Delete(':id')
  remove(@GetUser('sub') inspectorId: string, @Param('id') id: string) {
    return this.inspectionsService.remove(inspectorId, id);
  }
}
