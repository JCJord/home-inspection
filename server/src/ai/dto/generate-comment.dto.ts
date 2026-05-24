import { IsString, IsNumber, IsOptional } from 'class-validator';

export class GenerateCommentRequestDto {
  @IsString()
  section!: string;

  @IsString()
  severity!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsString()
  description!: string;

  @IsNumber()
  year_built!: number;
}
