import { Controller, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { GenerateCommentRequestDto } from './dto/generate-comment.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { InspectorsService } from '../inspectors/inspectors.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly inspectorsService: InspectorsService,
  ) {}

  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('generate-comment')
  async generateComment(
    @Request() req: any,
    @Body() generateCommentDto: GenerateCommentRequestDto
  ) {
    const inspectorId = req.user.sub;
    const inspector = await this.inspectorsService.findOne(inspectorId);



    const result = await this.aiService.generateComment(
      generateCommentDto.section,
      generateCommentDto.severity,
      generateCommentDto.location || '',
      generateCommentDto.description,
      generateCommentDto.year_built
    );

    return result;
  }
}
