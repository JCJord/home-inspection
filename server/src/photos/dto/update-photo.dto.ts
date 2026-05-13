import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdatePhotoDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  caption?: string;
}
