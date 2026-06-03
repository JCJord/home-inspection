import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdatePhotoDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  caption?: string;
}
