import { Controller, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { GenerateCommentRequestDto } from './dto/generate-comment.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { InspectorsService } from '../inspectors/inspectors.service';
import { SubscriptionStatus } from '../common/enums/subscription-status.enum';

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

    if (inspector.subscription_status !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException(
        'AI Finding generation is only available for users with an Active subscription. Please upgrade your plan.'
      );
    }

    const result = await this.aiService.generateComment(
      generateCommentDto.section,
      generateCommentDto.severity,
      generateCommentDto.location || '',
      generateCommentDto.short_note,
      generateCommentDto.year_built
    );

    return result;
  }
}
