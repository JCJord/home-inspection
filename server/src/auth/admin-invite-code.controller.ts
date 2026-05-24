import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { InviteCodeService } from './invite-code.service';
import { AdminSecretGuard } from './guards/admin-secret.guard';
import { IsOptional, IsNumber, IsString, IsDateString } from 'class-validator';

export class CreateInviteCodeDto {
  @IsOptional()
  @IsNumber()
  max_uses?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expires_at?: Date;
}

@Controller('auth/admin/invite-codes')
@UseGuards(AdminSecretGuard)
export class AdminInviteCodeController {
  constructor(private readonly inviteCodeService: InviteCodeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInviteCode(@Body() body: CreateInviteCodeDto) {
    const inviteCode = await this.inviteCodeService.generateCode({
      maxUses: body.max_uses,
      notes: body.notes,
      expiresAt: body.expires_at ? new Date(body.expires_at) : undefined,
    });

    return inviteCode;
  }
}
