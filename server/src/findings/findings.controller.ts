import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FindingsService } from './findings.service';
import { CreateFindingDto } from './dto/create-finding.dto';
import { UpdateFindingDto } from './dto/update-finding.dto';
import { ReorderFindingsDto } from './dto/reorder-findings.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@UseGuards(AuthGuard)
@Controller('inspections/:inspectionId/findings')
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Post()
  create(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Body() createFindingDto: CreateFindingDto,
  ) {
    return this.findingsService.create(inspectorId, inspectionId, createFindingDto);
  }

  @Get()
  findAll(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Query('section') section?: string,
  ) {
    return this.findingsService.findAll(inspectorId, inspectionId, section);
  }

  @Patch('reorder')
  reorder(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Body() reorderDto: ReorderFindingsDto,
  ) {
    return this.findingsService.reorder(inspectorId, inspectionId, reorderDto);
  }

  @Patch(':findingId')
  update(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Param('findingId') findingId: string,
    @Body() updateFindingDto: UpdateFindingDto,
  ) {
    return this.findingsService.update(inspectorId, inspectionId, findingId, updateFindingDto);
  }



  @Delete(':findingId')
  remove(
    @GetUser('sub') inspectorId: string,
    @Param('inspectionId') inspectionId: string,
    @Param('findingId') findingId: string,
  ) {
    return this.findingsService.remove(inspectorId, inspectionId, findingId);
  } // Delete finding
}
