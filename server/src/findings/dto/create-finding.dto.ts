import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, MaxLength } from 'class-validator';
import { Section, Severity } from '../enums';

export class CreateFindingDto {
  @IsEnum(Section)
  section: Section;

  @IsEnum(Severity)
  severity: Severity;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2200)
  description: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(800)
  recommendation?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
