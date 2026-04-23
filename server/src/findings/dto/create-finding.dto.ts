import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Section, Severity } from '../enums';

export class CreateFindingDto {
  @IsEnum(Section)
  section: Section;

  @IsEnum(Severity)
  severity: Severity;

  @IsString()
  @IsNotEmpty()
  short_note: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  ai_comment?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
