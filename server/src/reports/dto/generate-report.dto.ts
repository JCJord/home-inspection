import { IsString, IsNotEmpty, IsUUID, IsOptional } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  @IsNotEmpty()
  html: string;

  @IsUUID()
  @IsOptional()
  inspectionId?: string;
}

